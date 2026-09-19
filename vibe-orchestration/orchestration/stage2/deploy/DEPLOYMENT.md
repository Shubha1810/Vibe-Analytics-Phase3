# Deployment runbook — Vibe Analytics orchestrator

Replaces the old `DOCKER_HANDOFF.md`. **Docker is not used anywhere in this deployment.** The service
runs on Snowflake's own base image with the source mounted from a stage; there is no image to build
and no registry to push to. `Dockerfile` and `build_and_push.sh` have been deleted because they were
vestigial and actively misled a code audit into reporting a Docker-based deployment.

## What runs where

| Layer | Where |
|---|---|
| Control plane (waves, parallelism, gating) | LangGraph in the `DEMANDSENSING_ORCHESTRATOR` SPCS service |
| Container image | `/snowflake/images/snowflake_images/container_runtime/cpu_x86_64:2.7.2` — Snowflake-provided, referenced directly |
| Source | mounted from `@ORCHESTRATION_SRC_STAGE/releases/<TS>/orchestration/stage2` |
| Dependencies | `langgraph` closure vendored at `@ORCHESTRATION_SRC_STAGE/runtime/wheels-py310`, installed offline onto a persistent block volume |
| Data plane | 9 Cortex Agents per network, artifact scratchpad in `DEMANDSENSING_RUNTIME`, validation tiers A–D |

SPCS is the runtime. Docker was only ever the *build* toolchain, and it is no longer needed.

---

## PENDING — this batch is authored but NOT deployed

The session that wrote these changes had a read-only **Restricted Session Scope**:

```
ALTER TABLE DIM_PERSONA          -> no MODIFY
CREATE PROCEDURE / CREATE TABLE  -> no FULL MANAGEMENT on schema
write to ORCHESTRATION_SRC_STAGE -> no WRITE
ALTER SERVICE                    -> no OPERATE
```

Everything below is written and verified locally (all Python byte-compiles, both graph topologies
build and export correctly), but nothing has been applied to Snowflake. Run the sequence below from a
session with `ACCOUNTADMIN` and no restricted scope.

### Step 1 — SQL, in order

```sql
-- persona model, deterministic Tier B artifact audit, and the PUT_SLICE producer overload
-- (adds DISPLAY_TITLE, GET_PERSONAS, RESOLVE_PERSONA_SCOPE, RUN_TIER_B_ARTIFACT_AUDIT,
--  plus a 5-argument PUT_SLICE that takes PRODUCER_AGENT explicitly)
@deploy/06_persona_and_artifact_audit.sql
```

Verify before continuing:

```sql
CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_PERSONAS();
-- expect 3 rows: Demand Planner (3 departments), Director of Demand Planning, Supply Planner

CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RESOLVE_PERSONA_SCOPE('Demand Planner', NULL);
-- expect is_group=true, 3 personas, effective_departments = all three

CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RESOLVE_PERSONA_SCOPE('Supply Chain Director', NULL);
-- expect REJECTED + valid_titles  (old UI string, deliberately no longer accepted)

SHOW PROCEDURES LIKE 'PUT_SLICE' IN SCHEMA DEMANDSENSING_AI.DEMANDSENSING_RUNTIME;
-- expect BOTH signatures: the 4-arg (interactive, unchanged) and the new 5-arg
```

### Step 2 — agent specifications

`deploy/08_agent_specs.sql` is **generated** from the live specs. Regenerate it first so it is built
against whatever is actually deployed, then apply it:

```bash
python3 deploy/gen_08_agent_specs.py     # or --check to confirm the committed file is current
```

```sql
@deploy/08_agent_specs.sql               -- 9 ALTER AGENT statements, must run AFTER 06
```

Verify no agent still hardcodes a planner and every one carries both contracts:

```sql
SHOW AGENTS LIKE '%_AUTO_DEMANDSENSING' IN SCHEMA DEMANDSENSING_AI.DEMANDSENSING_SCHEMA;
SELECT "name",
       POSITION('PERSONA (resolved, authoritative)' IN "agent_spec") > 0 AS HAS_PERSONA_CONTRACT,
       POSITION('CANONICAL FACTS (verified'        IN "agent_spec") > 0 AS HAS_FACTS_CONTRACT,
       POSITION('Sarah Mitchell'                   IN "agent_spec") > 0 AS STILL_HARDCODES_PLANNER
  FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()));
-- expect 9 rows: first two TRUE, the third FALSE
```

### Step 3 — service functions

```sql
@deploy/04_service_functions.sql
```

`SUBMIT_ORCHESTRATION` is now `(QUESTION, MODULE, PERSONA_TITLE, DEPARTMENT, SCOPE)`, matching the
`/sf/submit` row shape `[idx, module, question, persona_title, department, scope]`. This is a
**breaking signature change**: the old third argument was a comma-separated `PERSONAS` list.

### Step 4 — publish the source release

```bash
TS=$(date -u +%Y-%m-%dT%H%MZ)
snow stage copy ./orchestration \
  @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_SRC_STAGE/releases/$TS/orchestration/ \
  --recursive --overwrite
echo "$TS" > LATEST.txt
snow stage copy LATEST.txt @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_SRC_STAGE/ --overwrite
snow sql -q "ALTER STAGE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_SRC_STAGE REFRESH"
```

The `REFRESH` matters: the directory table goes stale after uploads that omit it, which made earlier
`DIRECTORY()` queries return an incomplete file list.

### Step 5 — repoint the service

Take `deploy/03_create_service.sql`, change the `src` volume's release prefix to the new `$TS`, and
apply it as `ALTER SERVICE ... FROM SPECIFICATION $$ ... $$`. Do not drop and recreate — that
destroys the dependency volume and forces a cold reinstall.

Confirm a warm restart:

```sql
SELECT SYSTEM$GET_SERVICE_LOGS(
  'DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_ORCHESTRATOR', 0, 'orchestrator', 15);
```

Expect `[entrypoint] dependency cache hit - skipping install`, then both graphs compiling and
`warehouse resumed`. A cold start instead means the block volume was lost.

### Step 6 — graph service function

```sql
@deploy/07_graph_service.sql   -- needs the service READY first
CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_GRAPH('autonomous');
```

Expect 12 nodes and 16 edges, including `persona_resolve` (wave 0) and `artifact_gate` (wave 1).
The interactive topology returns the same 12/16 shape, differing only in its terminal node
(`narration` rather than `exec_report`).

### Step 7 — acceptance matrix

Zero artifacts is **never** a valid outcome, for any persona. The matrix is a script, not a
checklist: `deploy/09_acceptance.sql` creates `CHECK_RUN_ACCEPTANCE(RUN_ID)`, which returns 17 rows
per run and is acceptable only when none of them says `FAIL`.

```sql
@deploy/09_acceptance.sql
```

```sql
-- one persona TITLE per run; department is optional and narrows a title covering several people
CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', 'Supply Planner');
CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', 'Director of Demand Planning');
CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', 'Demand Planner');
CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', 'Demand Planner', 'Fresh & Grocery');

-- then, per run_id, once it reports COMPLETED
CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.CHECK_RUN_ACCEPTANCE('<run_id>');
```

**Run the matrix within a few hours of the runs.** `PUT_SLICE` registers artifacts with
`TTL_HOURS = 6`, and `PURGE_EXPIRED_ARTIFACTS` then drops both the materialised table and the
registry row. `ARTIFACT_REGISTRY` is a live scratchpad, **not an audit trail** — it is empty for every
historical run, which is why the durable artifact verdict is the `TIER='B'` row in
`VALIDATION_EVENTS` and the registry is used only for live corroboration. A `WARN` on
`ARTIFACTS_NONZERO` or `ARTIFACTS_MATCH_PLAN` means the TTL purged the evidence after Tier B had
already passed; a `FAIL` means the artifacts were genuinely absent.

Sanity check that the matrix is not vacuously green: run it against a pre-fix run such as
`run-45ffd7d3f353` and it correctly reports `FAIL` on `PERSONA_RESOLVED`, `CANONICAL_FACTS_LOADED`,
`TOPOLOGY_NODES_PRESENT`, `TIER_B_AUDIT_CLEARED` and the two artifact checks, while still passing
`WAVE2_FOUR_BRANCHES` and `WAVE2_PARALLEL` (302s of branch work inside a 31s span).

### Not in scope — interactive end-to-end

Interactive end-to-end verification on the stage-mounted deployment is **deliberately deferred** and
is not covered by this runbook. The interactive topology is built and asserted identical in shape
(12 nodes / 16 edges, differing only in the terminal node), and it shares every node builder with
the autonomous path, but **no interactive run has been executed against this deployment**. Do not
read a green autonomous matrix as interactive coverage. This remains owed under the full-parity
commitment.

---

## What changed in this batch

**Persona resolution.** `RESOLVE_PERSONA` and the typed `PersonaScope` slot both already existed;
nothing called them, so raw UI strings reached the agents. `"Director of Demand Planning"` matched no
`MATCH_KEYWORDS` entry and fell through to a silent default, while `"Supply Chain Director"`
accidentally matched `"supply chain"` and resolved to David Park. That accident is the whole reason
one persona produced reports and the other produced nothing.

Now a deterministic `persona_resolve` node runs first in **both** topologies, resolving
`(DISPLAY_TITLE, DEPARTMENT)` against `DIM_PERSONA`. An unresolvable title fails the run loudly
instead of defaulting.

`DISPLAY_TITLE` is deliberately **not unique**: the three category managers all present as
`"Demand Planner"` and are distinguished by department. Selecting that title with no department runs
one sweep over the union of all three departments and produces one report section per person, so each
planner can filter to the scope they own.

**Artifact accountability.** `state["artifacts"]` now comes from `ARTIFACT_REGISTRY` rather than the
agent's self-reported manifest — a run was observed persisting 10 real artifacts while reporting zero,
which starved wave 2 and produced a false "DATA GAP" report. A new `artifact_gate` node calls
`RUN_TIER_B_ARTIFACT_AUDIT` and hard-fails before the wave-2 fan-out if any planned artifact is
missing, so a breach costs one wave instead of five.

The audit rule lives in the validation layer alongside Tiers A/C/D and writes `VALIDATION_EVENTS` like
every other tier. It is deterministic on purpose: artifact completeness is a set comparison, where an
LLM adds latency and non-reproducibility for no gain in accuracy.

**Graph shape.** 12 nodes, 16 edges in both topologies. Parallelism and gating are identical across
personas and modules — persona affects only the *content* of the Master's plan, never the topology.
The retry edge routes back through `artifact_gate`, so a corrective pass is re-audited.

**The agents themselves.** Persona resolution alone would not have fixed the bug. Every autonomous
agent hardcoded all three planners — `MASTER_ORCHESTRATOR_AUTO` in three places, Data Gathering as
"publish artifacts covering ALL 3 planners' portfolios" — so a `Supply Planner` run would still have
swept Sarah, Mark and Emily no matter what the resolver returned. The deterministic resolution had no
consumer on the agent side. `08_agent_specs.sql` makes the injected persona block authoritative in all
nine, and resolves Data Gathering's direct self-contradiction: it was told to publish "the EXACT name
from the plan" *and* handed a fixed list of nine. The plan now wins; the nine are documented as the
minimum the Master should request.

**`PRODUCER_AGENT` was not an agent problem.** `PUT_SLICE` hardcodes
`'DATA_GATHERING_AGENT_DEMANDSENSING'` when it delegates to `PUT_ARTIFACT` and accepts no producer
argument at all, so no prompt could ever have fixed the attribution. `06` adds a 5-argument overload
that takes the producer explicitly and `08` repoints the autonomous agent's tool binding at it, with
`PRODUCER_AGENT` marked required. The 4-argument signature is left untouched because its hardcoded
default is correct for the interactive network.

**Canonical facts are injected, not typed.** Nine agents carried hand-typed constants — MAPE 21.7%,
`FW202623`, "917 rows, $3.67M", "1,565 rows", "13,755". Two were already **stale**:
`CANONICAL_DATA_FACTS` carries `DRIFT_FLAG = TRUE` showing the risk register at 927 current-week rows
and the recovery curve at 13,905. The `canonical_data_facts` skill told agents to call
`RENDER_CANONICAL_FACTS()`, which **does not exist**, and the wave-2 agents have no database access,
so they could never have read the table themselves. The orchestrator now reads the facts once per run
in `persona_resolve` and renders them into every prompt, scoped by the table's own `APPLIES_TO`
column, with any drifted fact passed through and flagged rather than suppressed. The duplicated
constants are deleted from the instructions.

**Wave-2 budgets.** Raised from 60s to 180s. Sixty seconds starved agents doing real multi-artifact
analysis, and a truncated response is indistinguishable downstream from a genuine data gap.

## Breaking changes for the React app

1. `"Supply Chain Director"` is gone. David Park's title is **`Supply Planner`**. Under fail-fast
   validation the old string is rejected.
2. One persona per run, not a list. New optional `department` argument.
3. `SUBMIT_ORCHESTRATION` is now `(QUESTION, MODULE, PERSONA_TITLE, DEPARTMENT, SCOPE)`. The old
   third argument was a comma-separated `PERSONAS` list.
4. Two new nodes in the diagram. Stop hardcoding the node list — call
   `GET_ORCHESTRATION_GRAPH('autonomous')`.
5. Render the picker from `GET_PERSONAS()` so the UI can only submit a title it was given.

## Do not change

- `MIN/MAX_INSTANCES = 1` and `--workers 1` — run state is an in-process `InMemorySaver`.
- `SNOWFLAKE_ROLE: ""` — a service user holds only its owner role and PUBLIC.
- Bind parameters use **`%s`**, not `?`. The connector runs in pyformat mode.
- `DROP SERVICE` needs `FORCE` because the deps volume sets `snapshotOnDelete: false`.
- The 4-argument `PUT_SLICE`. Its hardcoded interactive producer name is correct for that network,
  and the interactive agent's tool binding points at that exact signature.
- `ORDER BY EVENT_AT`, never `SEQ_NO`. `AUTOINCREMENT` allocates in per-writer blocks, so a node's
  `RUNNING` row can carry a higher `SEQ_NO` than its own completion row.
- `STARTSWITH(NODE_NAME, 'task_')`, never `LIKE 'task\_%'`. Snowflake's `LIKE` does not treat a
  backslash as an escape without an explicit `ESCAPE` clause, so the escaped form matches nothing and
  the wave-2 checks silently pass over zero rows.
