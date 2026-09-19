-- Persona resolution model and the deterministic wave-1 artifact audit.
-- Co-authored with CoCo
--
-- Run once, AFTER 05_module_and_events.sql. Every statement is idempotent.
--
-- WHY THIS EXISTS
--
-- Two defects motivated this file, both found by inspecting live runs:
--
--   1. Free-text persona strings reached the agents unresolved. The UI sent
--      "Director of Demand Planning", which matches no MATCH_KEYWORDS entry in DIM_PERSONA, so it
--      silently fell through to the default persona. "Supply Chain Director" happened to contain the
--      keyword "supply chain" and therefore resolved to David Park. That accident is the entire
--      reason one persona produced reports and the other produced nothing: RESOLVE_PERSONA exists and
--      works, but nothing in the orchestrator ever called it, and state["persona"] - a typed
--      PersonaScope slot - was read for the output envelope and written by nothing.
--
--   2. Nothing validated that Data Gathering delivered the artifacts the Master's plan asked for.
--      Tier A is scheduled data integrity, Tier B was pre-execution SQL lint, Tier C is per-branch
--      response quality at wave 2, Tier D is the collective gate at wave 3. A run could publish zero
--      artifacts, sail through wave 2 on an empty manifest, and have the executive report paper over
--      it with a "DATA GAP" headline. Zero artifacts is always a defect, never a valid outcome.
--
-- The audit is deliberately DETERMINISTIC and lives in the validation layer, not in graph node code.
-- Artifact completeness is a set comparison; an LLM would add latency and non-reproducibility for no
-- gain in accuracy. It writes to VALIDATION_EVENTS exactly like every other tier, so the graph only
-- calls it and acts on the verdict - the same contract validation_gate already uses for Tier D.

USE ROLE ACCOUNTADMIN;
USE DATABASE DEMANDSENSING_AI;
USE SCHEMA DEMANDSENSING_SCHEMA;

-- ================================================================ A1. DISPLAY_TITLE

ALTER TABLE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DIM_PERSONA
  ADD COLUMN IF NOT EXISTS DISPLAY_TITLE VARCHAR
  COMMENT 'Title shown in the UI persona picker. DELIBERATELY NOT UNIQUE: the three category managers all present as "Demand Planner" and are told apart by DEPARTMENT_FILTER. The resolution key is (DISPLAY_TITLE, DEPARTMENT).';

UPDATE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DIM_PERSONA
   SET DISPLAY_TITLE = CASE PERSONA_NAME
         WHEN 'Lisa Hayes'     THEN 'Director of Demand Planning'
         WHEN 'David Park'     THEN 'Supply Planner'
         WHEN 'Sarah Mitchell' THEN 'Demand Planner'
         WHEN 'Mark Thompson'  THEN 'Demand Planner'
         WHEN 'Emily Carter'   THEN 'Demand Planner'
         ELSE DISPLAY_TITLE END;

-- Guard: a NULL DISPLAY_TITLE would be unreachable from the UI and unresolvable by title, so a new
-- persona added without one must be caught here rather than at runtime.
SELECT PERSONA_NAME, 'MISSING DISPLAY_TITLE' AS PROBLEM
  FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DIM_PERSONA
 WHERE DISPLAY_TITLE IS NULL;

-- ================================================================ A2. UI pick-list

CREATE OR REPLACE PROCEDURE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_PERSONAS()
  RETURNS TABLE (DISPLAY_TITLE VARCHAR, DEPARTMENTS VARIANT, PERSONA_COUNT NUMBER,
                 IS_DEFAULT BOOLEAN, DEPARTMENT_OPTIONAL BOOLEAN)
  LANGUAGE SQL
  COMMENT 'Persona pick-list for the UI. One row per DISPLAY_TITLE with its selectable departments, so the front end can only ever submit a title it was given. "Demand Planner" returns three departments; department selection is optional for every title.'
  EXECUTE AS CALLER
AS
$$
DECLARE
    res RESULTSET;
BEGIN
    res := (
        SELECT DISPLAY_TITLE,
               ARRAY_AGG(DISTINCT d.value::VARCHAR) WITHIN GROUP (ORDER BY d.value::VARCHAR)
                   AS DEPARTMENTS,
               COUNT(DISTINCT PERSONA_NAME) AS PERSONA_COUNT,
               BOOLOR_AGG(IS_DEFAULT) AS IS_DEFAULT,
               TRUE AS DEPARTMENT_OPTIONAL
          FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DIM_PERSONA,
               LATERAL FLATTEN(input => DEPARTMENT_FILTER) d
         WHERE DISPLAY_TITLE IS NOT NULL
         GROUP BY DISPLAY_TITLE
         ORDER BY DISPLAY_TITLE);
    RETURN TABLE(res);
END;
$$;

-- ================================================================ A3. persona resolution

CREATE OR REPLACE PROCEDURE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RESOLVE_PERSONA_SCOPE(
    DISPLAY_TITLE VARCHAR, DEPARTMENT VARCHAR DEFAULT NULL)
  RETURNS VARIANT
  LANGUAGE PYTHON
  RUNTIME_VERSION = '3.11'
  PACKAGES = ('snowflake-snowpark-python')
  HANDLER = 'main'
  COMMENT 'Deterministic (DISPLAY_TITLE, DEPARTMENT) -> persona scope. Returns 1 persona, or 3 for "Demand Planner" with no department (union scope, one report section each). Unknown title is REJECTED, never silently defaulted - that silent default is what let "Director of Demand Planning" run unresolved.'
  EXECUTE AS OWNER
AS
$$
S = "DEMANDSENSING_AI.DEMANDSENSING_SCHEMA"


def main(session, display_title, department):
    if not display_title or not str(display_title).strip():
        return {"status": "REJECTED", "reason": "display_title is required"}

    title = str(display_title).strip()
    rows = session.sql(
        f"""SELECT PERSONA_NAME, PERSONA_ROLE, DISPLAY_TITLE, DEPARTMENT_FILTER, KPI_FOCUS,
                   GUARDRAIL_FOCUS, DETAIL_LEVEL, COMMUNICATION_STYLE, DECISION_HORIZON, IS_DEFAULT
              FROM {S}.DIM_PERSONA
             WHERE UPPER(TRIM(DISPLAY_TITLE)) = UPPER(?)
             ORDER BY PERSONA_NAME""", params=[title]).collect()

    if not rows:
        valid = [r["DISPLAY_TITLE"] for r in session.sql(
            f"SELECT DISTINCT DISPLAY_TITLE FROM {S}.DIM_PERSONA "
            f"WHERE DISPLAY_TITLE IS NOT NULL ORDER BY 1").collect()]
        return {"status": "REJECTED",
                "reason": f"unknown persona title '{title}'",
                "valid_titles": valid}

    def scope(r):
        return {
            "persona": r["PERSONA_NAME"],
            "persona_role": r["PERSONA_ROLE"],
            "display_title": r["DISPLAY_TITLE"],
            "department_filter": _json(r["DEPARTMENT_FILTER"]),
            "kpi_focus": _json(r["KPI_FOCUS"]),
            "guardrail_focus": _json(r["GUARDRAIL_FOCUS"]),
            "detail_level": r["DETAIL_LEVEL"],
            "communication_style": r["COMMUNICATION_STYLE"],
            "decision_horizon": r["DECISION_HORIZON"],
        }

    resolved = [scope(r) for r in rows]

    # Optional department narrowing, available for every title. "Demand Planner" + a department
    # selects one of the three planners; Lisa or David + a department narrows an otherwise
    # enterprise-wide sweep.
    if department and str(department).strip() and str(department).strip().upper() != "ALL":
        dept = str(department).strip()
        narrowed = [s for s in resolved
                    if any(d.upper() in (dept.upper(), "ALL") for d in s["department_filter"])
                    or dept.upper() in [d.upper() for d in s["department_filter"]]]
        if not narrowed:
            return {"status": "REJECTED",
                    "reason": f"department '{dept}' is not valid for title '{title}'",
                    "valid_departments": sorted({d for s in resolved
                                                 for d in s["department_filter"]})}
        resolved = narrowed
        effective_departments = [dept]
    else:
        # Union across the group. This is the "Demand Planner shown as one persona with three
        # departments" case: one sweep, one artifact set, one report section per planner.
        effective_departments = sorted({d for s in resolved for d in s["department_filter"]})

    lead = next((s for s in resolved if s["persona_role"].upper().startswith("DIRECTOR")), resolved[0])

    return {
        "status": "RESOLVED",
        "display_title": title,
        "is_group": len(resolved) > 1,
        "personas": resolved,
        "lead_persona": lead,
        "effective_departments": effective_departments,
        "kpi_focus": sorted({k for s in resolved for k in s["kpi_focus"]}),
        "guardrail_focus": sorted({g for s in resolved for g in s["guardrail_focus"]}),
        "detail_level": lead["detail_level"],
        "communication_style": lead["communication_style"],
        "decision_horizon": lead["decision_horizon"],
    }


def _json(v):
    """DEPARTMENT_FILTER / KPI_FOCUS are ARRAY columns; Snowpark hands them back as JSON strings."""
    import json
    if v is None:
        return []
    if isinstance(v, (list, tuple)):
        return list(v)
    try:
        parsed = json.loads(v)
        return parsed if isinstance(parsed, list) else [parsed]
    except (ValueError, TypeError):
        return [str(v)]
$$;

-- ================================================================ B1. Tier B post-execution audit

CREATE OR REPLACE PROCEDURE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RUN_TIER_B_ARTIFACT_AUDIT(
    RUN_ID VARCHAR, PLAN VARIANT)
  RETURNS VARIANT
  LANGUAGE PYTHON
  RUNTIME_VERSION = '3.11'
  PACKAGES = ('snowflake-snowpark-python')
  HANDLER = 'main'
  COMMENT 'Tier B post-execution: did Data Gathering deliver every artifact the Master planned? Deterministic set comparison, no LLM. Tier B already owns Data Gathering correctness (VALIDATE_SQL_DRYRUN is its pre-execution half). Writes VALIDATION_EVENTS like every other tier; the graph calls it and acts on the verdict.'
  EXECUTE AS OWNER
AS
$$
import json

RT = "DEMANDSENSING_AI.DEMANDSENSING_RUNTIME"
EV = "DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.VALIDATION_EVENTS"


def main(session, run_id, plan):
    expected = _expected(plan)
    rows = session.sql(
        f"SELECT ARTIFACT_NAME FROM {RT}.ARTIFACT_REGISTRY WHERE RUN_ID = ?",
        params=[run_id]).collect()
    actual = {r["ARTIFACT_NAME"] for r in rows}

    missing = sorted(n for n in expected if n not in actual)
    extra = sorted(n for n in actual if n not in expected)

    # Zero artifacts is always a defect, whatever the plan said - the accountable data plane produced
    # nothing at all, so no downstream branch can do honest work.
    if not actual:
        verdict, severity = "BLOCKED", "CRITICAL"
        reason = "Data Gathering persisted ZERO artifacts. Wave 2 has no evidence base."
    elif missing:
        verdict, severity = "BLOCKED", "CRITICAL"
        reason = f"Data Gathering persisted {len(actual)} artifact(s) but {len(missing)} planned artifact(s) are missing."
    else:
        verdict, severity = "CLEARED", None
        reason = f"All {len(expected)} planned artifact(s) present."

    result = {
        "tier": "B", "check": "artifact_completeness", "run_id": run_id,
        "verdict": verdict, "severity": severity, "reason": reason,
        "expected": sorted(expected), "actual": sorted(actual),
        "missing": missing, "extra": extra,
        "counts": {"expected": len(expected), "actual": len(actual), "missing": len(missing)},
    }

    session.sql(
        f"""INSERT INTO {EV} (RUN_ID, NODE_NAME, TIER, CHECK_ID, STATUS, SEVERITY, DETAIL)
            SELECT ?, 'data_gathering', 'B', 'TIER_B_ARTIFACT_AUDIT', ?, ?, ?""",
        params=[run_id, "PASS" if verdict == "CLEARED" else "FAIL", severity,
                json.dumps(result)[:4000]]).collect()

    return result


def _expected(plan):
    """artifacts_expected is the contract. Tolerates a list of names or of objects, because the
    Master has been observed emitting both shapes for its agents[] field."""
    if not plan:
        return set()
    if isinstance(plan, str):
        try:
            plan = json.loads(plan)
        except (ValueError, TypeError):
            return set()
    raw = (plan or {}).get("artifacts_expected") or []
    out = set()
    for a in raw:
        if isinstance(a, dict):
            name = a.get("artifact_name") or a.get("name")
        else:
            name = str(a)
        if name:
            out.add(str(name).strip())
    return out
$$;

-- ================================================================ PUT_SLICE producer attribution
--
-- PRODUCER_AGENT was being stamped with the INTERACTIVE agent name on autonomous runs. That is not
-- an agent-instruction problem and cannot be fixed by prompting: PUT_SLICE takes no PRODUCER_AGENT
-- argument at all and hardcodes 'DATA_GATHERING_AGENT_DEMANDSENSING' when it delegates to
-- PUT_ARTIFACT. Whichever network calls it, the row is attributed to the interactive agent.
--
-- The existing 4-argument PUT_SLICE is left ALONE and keeps its hardcoded default, because that
-- default is CORRECT for the interactive network and the interactive agent's tool binding points at
-- that exact signature. This adds a 5-argument overload that takes the producer explicitly; the
-- autonomous Data Gathering agent is repointed at it in 08_agent_specs.sql.
--
-- Note the TTL: PUT_SLICE registers artifacts with TTL_HOURS = 6, and PURGE_EXPIRED_ARTIFACTS drops
-- both the materialised table and the registry row once EXPIRES_AT passes. ARTIFACT_REGISTRY is
-- therefore a live scratchpad, NOT an audit trail - it is empty for every historical run. The
-- durable record of artifact completeness is the VALIDATION_EVENTS row that
-- RUN_TIER_B_ARTIFACT_AUDIT writes, which is why acceptance checks read that table for the verdict
-- and the registry only for live detail.

CREATE OR REPLACE PROCEDURE DEMANDSENSING_AI.DEMANDSENSING_RUNTIME.PUT_SLICE(
    RUN_ID VARCHAR, ARTIFACT_NAME VARCHAR, SOURCE_QUERY VARCHAR, GRAIN VARCHAR,
    PRODUCER_AGENT VARCHAR)
  RETURNS VARIANT
  LANGUAGE SQL
  COMMENT = 'Simplified artifact publication with explicit producer attribution. Use this overload from the autonomous network so ARTIFACT_REGISTRY.PRODUCER_AGENT records the _AUTO_ agent rather than the interactive default.'
AS
$$
DECLARE
    out VARIANT;
BEGIN
    CALL DEMANDSENSING_AI.DEMANDSENSING_RUNTIME.PUT_ARTIFACT(
        :RUN_ID,
        :ARTIFACT_NAME,
        :SOURCE_QUERY,
        COALESCE(:PRODUCER_AGENT, 'UNSPECIFIED_PRODUCER'),
        :GRAIN,
        'baseline',
        6.0
    ) INTO out;
    RETURN out;
END;
$$;

-- ================================================================ smoke tests
-- CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_PERSONAS();
-- CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RESOLVE_PERSONA_SCOPE('Supply Planner', NULL);
-- CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RESOLVE_PERSONA_SCOPE('Demand Planner', NULL);
--   -> is_group = true, 3 personas, effective_departments = all three
-- CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RESOLVE_PERSONA_SCOPE('Demand Planner', 'Fresh & Grocery');
--   -> Sarah Mitchell only
-- CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RESOLVE_PERSONA_SCOPE('Supply Chain Director', NULL);
--   -> REJECTED with valid_titles (this is the old UI string, deliberately no longer accepted)
-- CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RUN_TIER_B_ARTIFACT_AUDIT('run-899c53188864',
--        (SELECT PLAN FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_RUNS
--          WHERE RUN_ID = 'run-899c53188864'));
--   -> BLOCKED / CRITICAL, 9 missing (that run persisted nothing)
--
-- Both PUT_SLICE signatures must be present afterwards:
-- SHOW PROCEDURES LIKE 'PUT_SLICE' IN SCHEMA DEMANDSENSING_AI.DEMANDSENSING_RUNTIME;
--   -> PUT_SLICE(VARCHAR, VARCHAR, VARCHAR, VARCHAR) and
--      PUT_SLICE(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR)
