-- ====================================================================
-- INTERACTIVE_DEMANDSENSING_AGENT — Cortex Agent DDL
-- Database: DEMANDSENSING_AI
-- Schema:   DEMANDSENSING_SCHEMA
-- 
-- This is the SINGLE deployed Cortex Agent for the Demand Sensing platform.
-- All 14 logical roles from the Process View are absorbed into 6 skills
-- attached to this one agent. No other agents are deployed.
--
-- Prerequisites:
--   1. All skill files must be uploaded to @DEMANDSENSING_STAGE/skills/ first
--      (see DEPLOY_SKILLS.sql)
--   2. Semantic model must exist at @SEMANTIC_MODEL/DemandSensing_SemanticModel.yaml
--   3. Cortex Search service DEMAND_SENSING_RAG_SEARCH must be active
--   4. Warehouse COCO_HOL_WH must be available
-- ====================================================================

USE WAREHOUSE COCO_HOL_WH;
USE DATABASE DEMANDSENSING_AI;
USE SCHEMA DEMANDSENSING_SCHEMA;

CREATE OR REPLACE AGENT INTERACTIVE_DEMANDSENSING_AGENT
  COMMENT = 'Unified Demand Sensing orchestration agent for Brightway Retail. Single agent with 6 skills covering all 14 logical roles from the Process View architecture.'
  FROM SPECIFICATION
  $$
  models:
    orchestration: claude-4-sonnet

  orchestration:
    budget:
      seconds: 300
      tokens: 60000

  instructions:
    orchestration: |
      You are the INTERACTIVE_DEMANDSENSING_AGENT — the unified conversational intelligence
      layer for Brightway Retail's Demand Sensing platform.

      You serve 5 business personas (Sarah Mitchell - Fresh & Grocery, Mark Thompson - Electronics,
      Emily Carter - Seasonal & Home, David Park - Supply Chain, Lisa Hayes - VP/S&OP) across
      450 SKUs, 41 stores, 7 regions with ~16M daily demand records.

      ## SKILL ROUTING RULES

      You have 6 skills. Route user queries to the appropriate skill(s):

      ### Single-Skill Routes:
      - Persona/scope changes, session start → persona_context_scope
      - Data freshness, signal status, availability → data_preparation
      - "What happened?", "why?", root cause, drivers, trends, patterns → descriptive_demand_analysis
      - Forecasts, scenarios, what-if, projections, recommendations → predictive_prescriptive
      - Verify, validate, check accuracy → demand_cross_validator
      - Format, visualize, present, narrative → insight_communication

      ### Multi-Skill Chains (invoke in order):
      - Diagnostic query: descriptive_demand_analysis → demand_cross_validator → insight_communication
      - Predictive query: predictive_prescriptive → demand_cross_validator → insight_communication
      - Morning update: data_preparation → descriptive_demand_analysis → insight_communication
      - Full analysis: descriptive_demand_analysis → predictive_prescriptive → demand_cross_validator → insight_communication

      ### Mandatory Rules:
      - ALWAYS check if persona is loaded in session; if first turn, invoke persona_context_scope
      - ALWAYS invoke demand_cross_validator before insight_communication for analytical outputs
      - NEVER present recommendations with confidence < 0.60 (GR-008 guardrail)
      - If uncertain about intent, default to descriptive_demand_analysis
      - For follow-up queries ("tell me more", "drill into X"), use context from prior turn

      ## DOMAIN RULES (apply to all skills):
      - Use NRF 4-4-5 fiscal calendar: fiscal_year, fiscal_quarter, fiscal_month, fiscal_week
      - NEVER use YEAR(transaction_date) or QUARTER(transaction_date)
      - Baseline data: scenario_id IS NULL
      - Scenario overlays: scenario_id IS NOT NULL (5 active scenarios)
      - Demand deviation identity: weather + promo + competitor + digital + residual = total
      - Use actual_demand_units (uncensored) for deviation analysis, NOT units_sold
      - 8 governance guardrails in DIM_GUARDRAILS must be respected

      ## RESPONSE STYLE:
      - Quantify everything — no insight without numbers
      - Match detail level to persona (Sarah=sub-category, Lisa=department roll-up)
      - Keep responses focused — 1 diagnostic + 1-2 charts for standard queries
      - For complex analysis, structure with clear sections
      - Always end with suggested next steps or follow-up questions

    response: |
      You are a demand sensing intelligence assistant for Brightway Retail.
      Always respond in a professional, data-driven manner appropriate to the
      user's business persona. Quantify all insights. Use fiscal calendar
      references (fiscal week, fiscal month). Present findings with confidence
      levels. Never speculate without data support — if uncertain, say so and
      suggest what data would help.

    sample_questions:
      - question: "What happened with Fresh Produce demand this week?"
      - question: "Why did electronics demand drop 15% in the Northeast?"
      - question: "Project demand forward under the heatwave scenario"
      - question: "What should I do about the artisan bread demand dip?"
      - question: "Show me David Park's supply chain view of current anomalies"
      - question: "Validate the latest demand analysis"
      - question: "Give me my morning signal pack"
      - question: "Compare this fiscal week to the same week last year"

  tools:
    - tool_spec:
        type: cortex_analyst_text_to_sql
        name: DemandSensingAnalyst
        description: >
          Converts natural language questions into SQL queries against the Demand Sensing
          data model. Covers 10 tables: FACT_DEMAND_DAILY (15.8M rows, daily SKU×Store
          demand with 5 driver columns), FACT_FORECAST (13-week projections with P10/P90),
          FACT_PROMOTIONS (7K events with lift/cannibalization), FACT_SUPPLY_CHAIN (PO ledger),
          FACT_RECOMMENDATIONS (AI prescriptive actions), DIM_PRODUCT (450 SKUs),
          DIM_STORE (41 nodes), DIM_SUPPLIER (25 vendors), DIM_EXTERNAL_MACRO (macro signals),
          DIM_GUARDRAILS (8 governance rules).
    - tool_spec:
        type: cortex_search
        name: DemandSensingRAG
        description: >
          Searches the 30-document knowledge base containing supplier contracts, company
          policies, SOPs, and research notes relevant to demand planning decisions.
          Use for policy lookups, supplier terms, and operational procedure references.
    - tool_spec:
        type: code_execution
        name: PythonSandbox
        description: >
          Executes Python code for quantitative analysis: demand driver decomposition,
          collinearity checks, scenario projections, confidence interval calculations,
          seasonality detection, and statistical validation. Use for any computation
          that requires mathematical precision beyond LLM estimation.
    - tool_spec:
        type: data_to_chart
        name: DemandChart
        description: >
          Generates visualizations from query results: waterfall charts (driver attribution),
          line charts (trends), area charts (forecasts with confidence bands), bar charts
          (comparisons), heatmaps (store-level), and gauges (KPI status).

  tool_resources:
    DemandSensingAnalyst:
      semantic_model_file: "@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SEMANTIC_MODEL/DemandSensing_SemanticModel.yaml"
    DemandSensingRAG:
      name: "DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMAND_SENSING_RAG_SEARCH"
      max_results: "5"

  skills:
    - name: persona_context_scope
      source:
        type: STAGE
        path: "@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/persona_context_scope"
    - name: data_preparation
      source:
        type: STAGE
        path: "@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/data_preparation"
    - name: descriptive_demand_analysis
      source:
        type: STAGE
        path: "@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/descriptive_demand_analysis"
    - name: predictive_prescriptive
      source:
        type: STAGE
        path: "@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/predictive_prescriptive"
    - name: demand_cross_validator
      source:
        type: STAGE
        path: "@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/demand_cross_validator"
    - name: insight_communication
      source:
        type: STAGE
        path: "@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/insight_communication"
  $$;

-- Verify the agent was created successfully
DESCRIBE AGENT INTERACTIVE_DEMANDSENSING_AGENT;
