-- SQL surface for the orchestrator: service functions plus the procedures callers should use.
-- Co-authored with CoCo
--
-- Run AFTER 03_create_service.sql reports the service READY, and after 05_module_and_events.sql.
--
-- Two layers on purpose:
--   *_SVC service functions are the raw transport to the SPCS endpoint. They take no view on who
--     called them and record no attribution.
--   SUBMIT_ORCHESTRATION / GET_ORCHESTRATION_RESULT / GET_ORCHESTRATION_EVENTS are the supported
--     entry points. They add the caller attribution that the service itself cannot determine (the
--     service authenticates as its own service user, so CURRENT_USER inside the container is not
--     the human who asked).
--
-- Both agent networks are reached through the same functions. MODULE selects which one:
--   'interactive'  requires QUESTION; PERSONA_TITLE is optional (the Master infers scope)
--   'autonomous'   requires PERSONA_TITLE, ignores QUESTION
-- The service validates that pairing and returns a clear error rather than starting a doomed run.
--
-- PERSONA_TITLE is a DISPLAY TITLE from GET_PERSONAS() - 'Demand Planner', 'Supply Planner',
-- 'Director of Demand Planning' - never a person's name. It is resolved deterministically against
-- DIM_PERSONA by RESOLVE_PERSONA_SCOPE before any agent runs, and an unknown title fails the run
-- loudly instead of silently defaulting. DEPARTMENT is optional and narrows a title that covers
-- several people.

USE ROLE ACCOUNTADMIN;
USE DATABASE DEMANDSENSING_AI;
USE SCHEMA DEMANDSENSING_SCHEMA;

-- ---------------------------------------------------------------- raw service functions

-- Argument ORDER here must match the row shape server.py /sf/submit unpacks:
-- [row_index, module, question, persona_title, department, scope].
CREATE OR REPLACE FUNCTION DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION_SVC(
    MODULE VARCHAR, QUESTION VARCHAR, PERSONA_TITLE VARCHAR, DEPARTMENT VARCHAR, SCOPE VARCHAR)
  RETURNS VARIANT
  SERVICE  = DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_ORCHESTRATOR
  ENDPOINT = api
  -- A submit returns as soon as the run is queued, so the default 3600s batch timeout is far more
  -- than needed; the long wait happens in the background, not in this call.
  MAX_BATCH_ROWS = 1
  AS '/sf/submit';

CREATE OR REPLACE FUNCTION DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_STATUS_SVC(
    RUN_ID VARCHAR)
  RETURNS VARIANT
  SERVICE  = DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_ORCHESTRATOR
  ENDPOINT = api
  AS '/sf/status';

CREATE OR REPLACE FUNCTION DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_EVENTS_SVC(
    RUN_ID VARCHAR, AFTER_SEQ NUMBER)
  RETURNS VARIANT
  SERVICE  = DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_ORCHESTRATOR
  ENDPOINT = api
  AS '/sf/events';

-- ---------------------------------------------------------------- supported entry points

CREATE OR REPLACE PROCEDURE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(
    QUESTION VARCHAR DEFAULT NULL,
    MODULE VARCHAR DEFAULT 'interactive',
    PERSONA_TITLE VARCHAR DEFAULT NULL,
    DEPARTMENT VARCHAR DEFAULT NULL,
    SCOPE VARCHAR DEFAULT NULL)
  RETURNS VARCHAR
  LANGUAGE SQL
  COMMENT = 'Queues an orchestration run and returns its RUN_ID. MODULE is interactive (needs QUESTION) or autonomous (needs PERSONA_TITLE). PERSONA_TITLE is a display title from GET_PERSONAS(), never a person name; DEPARTMENT optionally narrows a title covering several people. Poll GET_ORCHESTRATION_RESULT with the RUN_ID.'
  EXECUTE AS CALLER
AS
$$
DECLARE
    response VARIANT;
    new_run_id VARCHAR;
BEGIN
    -- Fail here rather than inside the container: a rejected title should cost nothing. The service
    -- re-validates through RESOLVE_PERSONA_SCOPE regardless, because it is also reachable over REST.
    IF (LOWER(NVL(:MODULE, 'interactive')) = 'autonomous' AND NVL(:PERSONA_TITLE, '') = '') THEN
        RETURN 'ERROR: autonomous runs require PERSONA_TITLE. Call GET_PERSONAS() for valid titles.';
    END IF;

    response := (SELECT DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION_SVC(
                            :MODULE, :QUESTION, :PERSONA_TITLE, :DEPARTMENT, :SCOPE));

    IF (response IS NULL) THEN
        RETURN 'ERROR: orchestrator returned no response';
    END IF;

    IF (response:error IS NOT NULL) THEN
        RETURN 'ERROR: ' || response:error::VARCHAR;
    END IF;

    new_run_id := response:run_id::VARCHAR;

    -- The service cannot attribute the run itself: inside the container CURRENT_USER is the SPCS
    -- service user, not the person who called this procedure. Stamped here instead.
    UPDATE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_RUNS
       SET REQUESTED_BY = CURRENT_USER()
     WHERE RUN_ID = :new_run_id;

    RETURN new_run_id;
END;
$$;

CREATE OR REPLACE PROCEDURE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_RESULT(
    RUN_ID VARCHAR)
  RETURNS VARIANT
  LANGUAGE SQL
  COMMENT = 'Returns the current state of an orchestration run. STATUS is QUEUED | RUNNING | COMPLETED | FAILED; RESULT is populated once COMPLETED.'
  EXECUTE AS CALLER
AS
$$
DECLARE
    payload VARIANT;
BEGIN
    -- Read the table rather than the service: the row is authoritative, survives a service
    -- restart, and is readable even while the service is suspended.
    SELECT OBJECT_CONSTRUCT_KEEP_NULL(
               'run_id',        RUN_ID,
               'module',        MODULE,
               'status',        STATUS,
               'question',      QUESTION,
               'personas',      PERSONAS,
               'requested_by',  REQUESTED_BY,
               'submitted_at',  SUBMITTED_AT,
               'started_at',    STARTED_AT,
               'completed_at',  COMPLETED_AT,
               'duration_ms',   DURATION_MS,
               'result',        RESULT,
               'exec_report',   EXEC_REPORT,
               'error_message', ERROR_MESSAGE)
      INTO payload
      FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_RUNS
     WHERE RUN_ID = :RUN_ID;

    IF (payload IS NULL) THEN
        RETURN OBJECT_CONSTRUCT('status', 'NOT_FOUND', 'run_id', :RUN_ID);
    END IF;

    RETURN payload;
END;
$$;

CREATE OR REPLACE PROCEDURE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_EVENTS(
    RUN_ID VARCHAR)
  RETURNS TABLE (
      NODE_NAME VARCHAR, AGENT_NAME VARCHAR, WAVE_NO NUMBER, ATTEMPT_NO NUMBER,
      STATUS VARCHAR, DURATION_MS NUMBER, ERROR_MSG VARCHAR, DETAIL VARIANT,
      EVENT_AT TIMESTAMP_LTZ)
  LANGUAGE SQL
  COMMENT = 'Current state of every node in a run - the feed behind the live agent-network visualisation. One row per node, latest event wins.'
  EXECUTE AS CALLER
AS
$$
BEGIN
    -- Served from the table, not the service, for the same reasons as GET_ORCHESTRATION_RESULT:
    -- authoritative, restart-proof, and readable while the service is suspended. The
    -- ORCHESTRATION_EVENTS_SVC function exists for callers that want the raw JSON feed instead.
    RETURN TABLE(
        SELECT NODE_NAME, AGENT_NAME, WAVE_NO, ATTEMPT_NO,
               STATUS, DURATION_MS, ERROR_MSG, DETAIL, EVENT_AT
          FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.V_ORCHESTRATION_NODE_STATE
         WHERE RUN_ID = :RUN_ID
         ORDER BY WAVE_NO NULLS LAST, NODE_NAME
    );
END;
$$;

-- ---------------------------------------------------------------- smoke tests
--
-- Interactive:
--   CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(
--     'Why did Fresh & Grocery demand deviate in the Southeast, and what is driving it?');
--
-- Autonomous (one persona TITLE per run; 'Supply Chain Director' is retired and now rejected):
--   CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', 'Supply Planner');
--   CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', 'Demand Planner', 'Fresh & Grocery');
--
-- Valid titles come from the persona model, never from a hardcoded UI list:
--   CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_PERSONAS();
--
-- Then:
--   CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_RESULT('<run_id>');
--   CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_EVENTS('<run_id>');
--   SELECT * FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.V_ORCHESTRATION_RUNS_RECENT LIMIT 10;
--
-- Acceptance (artifact contract, per persona): deploy/09_acceptance.sql
