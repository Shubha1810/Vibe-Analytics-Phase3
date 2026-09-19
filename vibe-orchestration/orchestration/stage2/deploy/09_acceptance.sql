-- Acceptance matrix for the autonomous module. Returns FAIL rows, not prose.
-- Co-authored with CoCo
--
-- Run LAST, after 06, 07, 08, 04 and the stage release, with the service READY.
--
-- Scope: AUTONOMOUS only. Interactive end-to-end verification on the stage-mounted deployment is
-- deliberately DEFERRED and is not covered here. It is still owed under the full-parity commitment -
-- the interactive topology is built and asserted identical in shape, but no interactive run has been
-- executed against this deployment. Do not read a green matrix as interactive coverage.
--
-- TIMING MATTERS. PUT_SLICE registers artifacts with TTL_HOURS = 6 and PURGE_EXPIRED_ARTIFACTS drops
-- both the materialised table and the registry row once EXPIRES_AT passes. ARTIFACT_REGISTRY is a
-- LIVE scratchpad, not an audit trail; it is empty for every historical run. Run this matrix within
-- a few hours of the runs it checks. The durable evidence is the VALIDATION_EVENTS row written by
-- RUN_TIER_B_ARTIFACT_AUDIT, which is why the artifact verdict is read from there and the registry
-- is used only for live corroboration.

USE ROLE ACCOUNTADMIN;
USE DATABASE DEMANDSENSING_AI;
USE SCHEMA DEMANDSENSING_SCHEMA;

-- ================================================================ the checker

CREATE OR REPLACE PROCEDURE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.CHECK_RUN_ACCEPTANCE(
    RUN_ID VARCHAR)
  RETURNS TABLE (CHECK_NAME VARCHAR, VERDICT VARCHAR, DETAIL VARCHAR)
  LANGUAGE SQL
  COMMENT = 'Acceptance checks for one orchestration run. VERDICT is PASS | FAIL | WARN | N/A. A run is acceptable only when no row returns FAIL.'
  EXECUTE AS CALLER
AS
$$
BEGIN
    RETURN TABLE(
        WITH r AS (
            SELECT * FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_RUNS
             WHERE RUN_ID = :RUN_ID
        ),
        -- artifacts_expected[] from the plan, one row per name. Handles both the string form and the
        -- object form ({"artifact_name": ...}), because the Master has emitted both.
        expected AS (
            SELECT DISTINCT TRIM(COALESCE(f.value:artifact_name::VARCHAR,
                                          f.value:name::VARCHAR,
                                          f.value::VARCHAR)) AS ARTIFACT_NAME
              FROM r, LATERAL FLATTEN(input => r.PLAN:artifacts_expected, outer => TRUE) f
             WHERE f.value IS NOT NULL
        ),
        registry AS (
            SELECT ARTIFACT_NAME, PRODUCER_AGENT, ROW_COUNT
              FROM DEMANDSENSING_AI.DEMANDSENSING_RUNTIME.ARTIFACT_REGISTRY
             WHERE RUN_ID = :RUN_ID
        ),
        -- Latest event per node, ordered by EVENT_AT. SEQ_NO is NOT usable for ordering: Snowflake
        -- AUTOINCREMENT allocates in per-writer blocks, so a node's RUNNING row can carry a higher
        -- SEQ_NO than its own completion row.
        node_state AS (
            SELECT NODE_NAME, WAVE_NO, STATUS, DURATION_MS, EVENT_AT, DETAIL,
                   ROW_NUMBER() OVER (PARTITION BY NODE_NAME ORDER BY EVENT_AT DESC) AS RN
              FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_RUN_EVENTS
             WHERE RUN_ID = :RUN_ID
        ),
        latest AS (SELECT * FROM node_state WHERE RN = 1),
        -- STARTSWITH, not LIKE 'task\_%'. Snowflake's LIKE does not treat a backslash as an escape
        -- without an explicit ESCAPE clause, so the escaped form matches NOTHING and every wave-2
        -- check would silently pass over zero rows. Verified against a real run.
        wave2 AS (
            SELECT COUNT(*) AS BRANCHES,
                   SUM(DURATION_MS) AS SUM_MS,
                   DATEDIFF('millisecond', MIN(EVENT_AT), MAX(EVENT_AT)) AS SPAN_MS
              FROM latest
             WHERE STARTSWITH(NODE_NAME, 'task_')
        ),
        tier_b AS (
            SELECT STATUS, DETAIL, CREATED_AT
              FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.VALIDATION_EVENTS
             WHERE RUN_ID = :RUN_ID AND TIER = 'B'
             ORDER BY CREATED_AT DESC
             LIMIT 1
        ),
        persona_ev AS (SELECT DETAIL FROM latest WHERE NODE_NAME = 'persona_resolve')

        -- Every check below is a FROM-less SELECT over scalar subqueries, so the matrix always
        -- returns the same fixed set of rows. Selecting FROM a CTE would make a check DISAPPEAR when
        -- the thing it checks is absent - a missing persona_resolve node would remove the
        -- PERSONA_RESOLVED row rather than failing it, which is the worst possible failure mode for
        -- an acceptance test.

        SELECT 'RUN_EXISTS' AS CHECK_NAME,
               IFF((SELECT COUNT(*) FROM r) = 1, 'PASS', 'FAIL') AS VERDICT,
               'rows=' || (SELECT COUNT(*) FROM r) AS DETAIL

        UNION ALL
        SELECT 'RUN_COMPLETED',
               IFF((SELECT STATUS FROM r) = 'COMPLETED', 'PASS', 'FAIL'),
               'status=' || COALESCE((SELECT STATUS FROM r), '<no run>')
                        || COALESCE(' error=' || (SELECT ERROR_MESSAGE FROM r), '')

        UNION ALL
        SELECT 'RUN_IS_AUTONOMOUS',
               IFF((SELECT MODULE FROM r) = 'autonomous', 'PASS', 'WARN'),
               'module=' || COALESCE((SELECT MODULE FROM r), '<no run>')
                        || ' (this matrix covers the autonomous module only)'

        UNION ALL
        SELECT 'PERSONA_RESOLVED',
               IFF((SELECT DETAIL:display_title FROM persona_ev) IS NOT NULL, 'PASS', 'FAIL'),
               'title=' || COALESCE((SELECT DETAIL:display_title::VARCHAR FROM persona_ev), '<none>')
                        || ' departments=' || COALESCE((SELECT ARRAY_TO_STRING(DETAIL:departments, '/') FROM persona_ev), '<none>')
                        || ' is_group=' || COALESCE((SELECT DETAIL:is_group::VARCHAR FROM persona_ev), '?')

        UNION ALL
        SELECT 'CANONICAL_FACTS_LOADED',
               IFF(COALESCE((SELECT DETAIL:facts_loaded::NUMBER FROM persona_ev), 0) > 0, 'PASS', 'FAIL'),
               'facts_loaded=' || COALESCE((SELECT DETAIL:facts_loaded::VARCHAR FROM persona_ev), '0')
                        || ' (0 means every agent ran without verified facts)'

        UNION ALL
        SELECT 'TOPOLOGY_NODES_PRESENT',
               IFF((SELECT COUNT_IF(NODE_NAME = 'persona_resolve') FROM latest) = 1
                   AND (SELECT COUNT_IF(NODE_NAME = 'artifact_gate') FROM latest) = 1
                   AND (SELECT COUNT_IF(NODE_NAME = 'data_gathering') FROM latest) >= 1
                   AND (SELECT COUNT_IF(NODE_NAME = 'validation_gate') FROM latest) >= 1, 'PASS', 'FAIL'),
               'persona_resolve=' || (SELECT COUNT_IF(NODE_NAME = 'persona_resolve') FROM latest)
                        || ' artifact_gate=' || (SELECT COUNT_IF(NODE_NAME = 'artifact_gate') FROM latest)
                        || ' data_gathering=' || (SELECT COUNT_IF(NODE_NAME = 'data_gathering') FROM latest)
                        || ' validation_gate=' || (SELECT COUNT_IF(NODE_NAME = 'validation_gate') FROM latest)

        UNION ALL
        SELECT 'WAVE2_FOUR_BRANCHES',
               IFF((SELECT BRANCHES FROM wave2) = 4, 'PASS', 'FAIL'),
               'branches=' || (SELECT BRANCHES FROM wave2)
                        || ' (expected 4: trend, dimensional, root_cause, predictive)'

        UNION ALL
        SELECT 'WAVE2_PARALLEL',
               CASE WHEN (SELECT BRANCHES FROM wave2) < 2 THEN 'FAIL'
                    WHEN (SELECT SUM_MS FROM wave2) IS NULL
                      OR (SELECT SPAN_MS FROM wave2) IS NULL THEN 'WARN'
                    WHEN (SELECT SPAN_MS FROM wave2) < (SELECT SUM_MS FROM wave2) * 0.75 THEN 'PASS'
                    ELSE 'FAIL' END,
               'sum_of_durations=' || COALESCE((SELECT SUM_MS::VARCHAR FROM wave2), '?') || 'ms'
                        || ' completion_span=' || COALESCE((SELECT SPAN_MS::VARCHAR FROM wave2), '?') || 'ms'
                        || ' (serial execution makes the span approach the sum)'

        UNION ALL
        SELECT 'PLAN_NAMES_ARTIFACTS',
               IFF((SELECT COUNT(*) FROM expected) > 0, 'PASS', 'FAIL'),
               'artifacts_expected=' || (SELECT COUNT(*) FROM expected)
                        || ' (an empty contract is never valid)'

        UNION ALL
        SELECT 'TIER_B_AUDIT_CLEARED',
               CASE WHEN NOT EXISTS (SELECT 1 FROM tier_b) THEN 'FAIL'
                    WHEN (SELECT STATUS FROM tier_b) IN ('PASS', 'CLEARED') THEN 'PASS'
                    ELSE 'FAIL' END,
               COALESCE((SELECT 'status=' || STATUS || ' ' || COALESCE(LEFT(DETAIL, 300), '')
                           FROM tier_b),
                        'no TIER=B row in VALIDATION_EVENTS - the artifact gate did not run')

        UNION ALL
        SELECT 'ARTIFACTS_NONZERO',
               CASE WHEN (SELECT COUNT(*) FROM registry) > 0 THEN 'PASS'
                    WHEN EXISTS (SELECT 1 FROM tier_b WHERE STATUS IN ('PASS', 'CLEARED')) THEN 'WARN'
                    ELSE 'FAIL' END,
               'registry_rows=' || (SELECT COUNT(*) FROM registry)
                        || ' (WARN means Tier B passed but the 6h TTL has since purged the rows;'
                        || ' FAIL means zero artifacts, which is never acceptable for any persona)'

        UNION ALL
        SELECT 'ARTIFACTS_MATCH_PLAN',
               CASE WHEN (SELECT COUNT(*) FROM registry) = 0
                         AND EXISTS (SELECT 1 FROM tier_b WHERE STATUS IN ('PASS', 'CLEARED'))
                        THEN 'WARN'
                    WHEN NOT EXISTS (SELECT 1 FROM expected e
                                      WHERE NOT EXISTS (SELECT 1 FROM registry g
                                                         WHERE g.ARTIFACT_NAME = e.ARTIFACT_NAME))
                        THEN 'PASS'
                    ELSE 'FAIL' END,
               COALESCE('missing=' || (SELECT LISTAGG(e.ARTIFACT_NAME, ', ') WITHIN GROUP (ORDER BY e.ARTIFACT_NAME)
                                         FROM expected e
                                        WHERE NOT EXISTS (SELECT 1 FROM registry g
                                                           WHERE g.ARTIFACT_NAME = e.ARTIFACT_NAME)),
                        'every planned artifact present')

        UNION ALL
        SELECT 'PRODUCER_AGENT_IS_AUTO',
               CASE WHEN (SELECT COUNT(*) FROM registry) = 0 THEN 'WARN'
                    WHEN NOT EXISTS (SELECT 1 FROM registry
                                      WHERE NOT CONTAINS(PRODUCER_AGENT, '_AUTO_')) THEN 'PASS'
                    ELSE 'FAIL' END,
               COALESCE((SELECT 'producers=' || LISTAGG(DISTINCT PRODUCER_AGENT, ' | ') FROM registry),
                        'no registry rows (TTL purged, or nothing was published)')
                        || ' (the interactive name here means PUT_SLICE was called on the 4-arg'
                        || ' signature, which hardcodes it)'

        UNION ALL
        SELECT 'EXEC_REPORT_HAS_SECTIONS',
               IFF((SELECT ARRAY_SIZE(COALESCE(EXEC_REPORT:report:sections,
                                               EXEC_REPORT:sections, ARRAY_CONSTRUCT())) FROM r) > 0,
                   'PASS', 'FAIL'),
               'sections=' || COALESCE((SELECT ARRAY_SIZE(COALESCE(EXEC_REPORT:report:sections,
                                                                  EXEC_REPORT:sections, ARRAY_CONSTRUCT()))::VARCHAR
                                          FROM r), '0')

        UNION ALL
        SELECT 'SECTION_PER_ACCOUNTABLE_PERSON',
               CASE WHEN (SELECT DETAIL:personas FROM persona_ev) IS NULL THEN 'FAIL'
                    WHEN (SELECT ARRAY_SIZE(COALESCE(EXEC_REPORT:report:sections, EXEC_REPORT:sections, ARRAY_CONSTRUCT())) FROM r)
                       = (SELECT ARRAY_SIZE(DETAIL:personas) FROM persona_ev) THEN 'PASS'
                    ELSE 'FAIL' END,
               'sections=' || COALESCE((SELECT ARRAY_SIZE(COALESCE(EXEC_REPORT:report:sections, EXEC_REPORT:sections, ARRAY_CONSTRUCT()))::VARCHAR FROM r), '0')
                        || ' accountable_people=' || COALESCE((SELECT ARRAY_SIZE(DETAIL:personas)::VARCHAR FROM persona_ev), '?')
                        || ' (one section per person, even if that person had no anomalies)'

        UNION ALL
        SELECT 'NO_DATA_GAP_HEADLINE',
               IFF((SELECT UPPER(COALESCE(EXEC_REPORT::VARCHAR, '')) LIKE '%DATA GAP%'
                        OR UPPER(COALESCE(NARRATIVE, '')) LIKE '%DATA GAP%' FROM r), 'FAIL', 'PASS'),
               'a DATA GAP headline on a COMPLETED run means wave 2 was starved of artifacts'

        UNION ALL
        SELECT 'NO_NODE_ERRORS',
               IFF((SELECT COUNT_IF(STATUS NOT IN ('ok', 'RUNNING', 'COMPLETED')) FROM latest) = 0,
                   'PASS', 'FAIL'),
               COALESCE((SELECT LISTAGG(IFF(STATUS NOT IN ('ok', 'RUNNING', 'COMPLETED'),
                                            NODE_NAME || '=' || STATUS, NULL), ', ') FROM latest),
                        'all nodes ok')
    );
END;
$$;

-- ================================================================ how to run the matrix
--
-- 1. Confirm the persona model first. The picker must be driven by this, never hardcoded.
--
--    CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_PERSONAS();
--      -> 3 titles: Demand Planner (3 people), Supply Planner, Director of Demand Planning
--    CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RESOLVE_PERSONA_SCOPE('Supply Chain Director', NULL);
--      -> REJECTED. The retired UI string must not resolve.
--
-- 2. Submit one run per in-scope persona. Keep the run_ids.
--
--    CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', 'Supply Planner');
--    CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', 'Director of Demand Planning');
--    CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', 'Demand Planner');
--    CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', 'Demand Planner', 'Fresh & Grocery');
--
-- 3. Wait for COMPLETED, then check each run. Every row must be PASS; WARN is acceptable only where
--    the TTL has purged the registry AND Tier B recorded a pass.
--
--    CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.CHECK_RUN_ACCEPTANCE('<run_id>');
--
-- 4. Sweep the recent autonomous runs for the single most important property - that none of them
--    produced zero artifacts and none failed the artifact contract:
--
--    SELECT v.RUN_ID, r.PERSONA_HINT, v.STATUS, LEFT(v.DETAIL, 200) AS DETAIL
--      FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.VALIDATION_EVENTS v
--      JOIN DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_RUNS r USING (RUN_ID)
--     WHERE v.TIER = 'B' AND r.MODULE = 'autonomous'
--       AND r.SUBMITTED_AT > DATEADD('day', -1, CURRENT_TIMESTAMP())
--     ORDER BY v.CREATED_AT DESC;
--      -> every row STATUS PASS. Any other value is a persona that produced an artifact gap.
--
-- 5. Confirm no autonomous run is attributed to the interactive agent (run within the 6h TTL):
--
--    SELECT DISTINCT a.PRODUCER_AGENT
--      FROM DEMANDSENSING_AI.DEMANDSENSING_RUNTIME.ARTIFACT_REGISTRY a
--      JOIN DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_RUNS r USING (RUN_ID)
--     WHERE r.MODULE = 'autonomous';
--      -> DATA_GATHERING_AGENT_AUTO_DEMANDSENSING only.
