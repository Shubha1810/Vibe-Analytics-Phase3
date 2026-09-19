-- Deploys the orchestrator as an SPCS service - stage-mounted, NO container image build required.
-- Co-authored with CoCo
--
-- This replaces the previous Docker-based deployment. Nothing is built and nothing is pushed to a
-- registry: the image is Snowflake's own base image, and the orchestrator source plus its dependency
-- wheels arrive as mounted stage volumes. Verified working on this account.
--
-- PREREQUISITES
--   1. deploy/01_spcs_infra.sql  - compute pool (the image repository is no longer needed)
--   2. deploy/02_results_table.sql + 05_module_and_events.sql - run + event tables
--   3. Source published to  @ORCHESTRATION_SRC_STAGE/releases/<TS>/orchestration/stage2
--   4. Wheels published to  @ORCHESTRATION_SRC_STAGE/runtime/wheels-py310
--        pip download "langgraph>=1.0,<2.0" --dest . --python-version 3.10 \
--            --only-binary=:all: --platform manylinux2014_x86_64 --platform any
--        snow stage copy './*.whl' @<stage>/runtime/wheels-py310/ --overwrite
--
-- SHIPPING A CODE CHANGE
--   Upload to a new release prefix, then repoint the src volume:
--     ALTER SERVICE ... FROM SPECIFICATION $$ ... releases/<NEW_TS>/... $$;
--   The dependency volume is reused, so the restart is a cache hit and comes up in seconds.
--
-- TRADE-OFF, stated plainly: this pins the runtime to Snowflake's base image and its Python version
-- (3.10). If Snowflake retires the tag below, the service stops starting until the tag is updated.
-- The tag is pinned rather than floating so the runtime cannot change under a running deployment.

USE ROLE ACCOUNTADMIN;
USE DATABASE DEMANDSENSING_AI;
USE SCHEMA DEMANDSENSING_SCHEMA;

CREATE SERVICE IF NOT EXISTS DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_ORCHESTRATOR
  IN COMPUTE POOL DEMANDSENSING_ORCH_POOL
  FROM SPECIFICATION $$
spec:
  containers:
    - name: orchestrator
      # Snowflake-provided base image, referenced directly. Already ships fastapi, uvicorn, httpx,
      # pydantic, snowflake-connector-python, PyJWT, cryptography and typing_extensions - only
      # langgraph has to be added, which is what the vendored wheels are for.
      image: /snowflake/images/snowflake_images/container_runtime/cpu_x86_64:2.7.2
      command:
        - /bin/sh
        - /app/src/entrypoint.sh
      env:
        DEMANDSENSING_DB: DEMANDSENSING_AI
        DEMANDSENSING_SCHEMA: DEMANDSENSING_SCHEMA
        DEMANDSENSING_RUNTIME_SCHEMA: DEMANDSENSING_RUNTIME
        ORCHESTRATION_RESULTS_TABLE: ORCHESTRATION_RUNS
        ORCHESTRATION_EVENTS_TABLE: ORCHESTRATION_RUN_EVENTS
        AUTONOMOUS_ENABLED: "true"
        SNOWFLAKE_WAREHOUSE: COCO_HOL_WH
        SNOWFLAKE_ROLE: ""
        DEPS_VERSION: py310-lg1.2.11
        AGENT_TIMEOUT_S: "600"
        MAX_CONCURRENT_RUNS: "4"
        SERVER_PORT: "8080"
      volumeMounts:
        - name: src
          mountPath: /app/src
        - name: wheels
          mountPath: /app/wheels
        - name: deps
          mountPath: /opt/deps
      readinessProbe:
        port: 8080
        path: /healthz
        # Sized for a COLD start: dependency install (~11s, first boot only) + source copy (~5s) +
        # graph compile + warehouse resume. Warm restarts are a cache hit and come up far sooner.
        periodSeconds: 10
        failureThreshold: 12
      resources:
        requests:
          cpu: "1"
          memory: 2Gi
        limits:
          cpu: "2"
          memory: 4Gi
  endpoints:
    - name: api
      port: 8080
      public: false
  volumes:
    # Immutable release prefix - which is exactly why metadataCache is safe here.
    - name: src
      source: stage
      stageConfig:
        name: "@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_SRC_STAGE/releases/2026-09-11T0713Z/orchestration/stage2"
        metadataCache: 1h
    # Outside the release prefix: wheels change on a different cadence than code.
    - name: wheels
      source: stage
      stageConfig:
        name: "@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_SRC_STAGE/runtime/wheels-py310"
        metadataCache: 1h
    # Persistent site-packages: the cold-start mitigation. Install once, reuse on every restart.
    - name: deps
      source: block
      size: 5Gi
      blockConfig:
        snapshotOnDelete: false
  logExporters:
    eventTableConfig:
      logLevel: INFO
  $$
  MIN_INSTANCES = 1
  MAX_INSTANCES = 1
  QUERY_WAREHOUSE = COCO_HOL_WH
  COMMENT = 'LangGraph multi-agent orchestrator (interactive + autonomous). Stage-mounted: no container image build.';

-- MIN/MAX_INSTANCES are 1 on purpose: LangGraph run state lives in an in-process InMemorySaver, so a
-- second instance could not see runs submitted to the first. Raising this requires replacing the
-- checkpointer with a shared backend first.

-- Poll until READY before creating the service functions in 04_service_functions.sql.
SELECT SYSTEM$GET_SERVICE_STATUS('DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_ORCHESTRATOR');

-- Startup diagnostics - the entrypoint logs each phase, so this shows exactly where a cold start is:
--   SELECT SYSTEM$GET_SERVICE_LOGS(
--     'DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_ORCHESTRATOR', 0, 'orchestrator', 50);
--
-- NOTE: the deps volume sets snapshotOnDelete=false, so DROP SERVICE requires FORCE:
--   DROP SERVICE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_ORCHESTRATOR FORCE;
