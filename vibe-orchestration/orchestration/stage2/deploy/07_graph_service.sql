-- Exposes the compiled graph topology to SQL so the UI diagram cannot drift from the code.
-- Co-authored with CoCo
--
-- Run AFTER the service reports READY on a release that contains the /graph endpoint.
--
-- WHY: the live agent-network visualisation needs two independent things - the SHAPE of the network
-- and the per-node STATUS. Status already has a SQL surface (GET_ORCHESTRATION_EVENTS). Shape did
-- not: /graph/{module} exists on the service but the endpoint is `public: false`, so the React app
-- cannot reach it and was given a hardcoded node list instead. Hardcoding drifts the moment a node
-- is added - which persona_resolve and artifact_gate both just did. This derives the diagram from
-- describe_graph() on the compiled StateGraph, so it is correct by construction.

USE ROLE ACCOUNTADMIN;
USE DATABASE DEMANDSENSING_AI;
USE SCHEMA DEMANDSENSING_SCHEMA;

CREATE OR REPLACE FUNCTION DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_GRAPH_SVC(
    MODULE VARCHAR)
  RETURNS VARIANT
  SERVICE  = DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_ORCHESTRATOR
  ENDPOINT = api
  MAX_BATCH_ROWS = 1
  AS '/sf/graph';

CREATE OR REPLACE PROCEDURE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_GRAPH(
    MODULE VARCHAR DEFAULT 'autonomous')
  RETURNS VARIANT
  LANGUAGE SQL
  COMMENT 'Static network topology for a module - nodes with wave numbers and agent names, plus edges. Pair with GET_ORCHESTRATION_EVENTS for live per-node status. Derived from the compiled graph, so it cannot drift from what actually executes.'
  EXECUTE AS CALLER
AS
$$
DECLARE
    payload VARIANT;
BEGIN
    payload := (SELECT DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.ORCHESTRATION_GRAPH_SVC(:MODULE));

    IF (payload IS NULL) THEN
        RETURN OBJECT_CONSTRUCT('error', 'orchestrator returned no response',
                                'module', :MODULE);
    END IF;

    RETURN payload;
END;
$$;

-- ================================================================ smoke tests
-- CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_GRAPH('autonomous');
-- CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_GRAPH('interactive');
--   Both must list persona_resolve (wave 0) and artifact_gate (wave 1), and the autonomous graph
--   must terminate in exec_report while interactive terminates in narration.
