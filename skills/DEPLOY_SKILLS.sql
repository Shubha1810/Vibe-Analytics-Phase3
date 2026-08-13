-- ====================================================================
-- DEPLOY_SKILLS.sql — Upload all skill files to Snowflake stage
-- 
-- Run this BEFORE CREATE_INTERACTIVE_AGENT.sql
--
-- Prerequisites:
--   1. Stage @DEMANDSENSING_STAGE must exist (pre-provisioned)
--   2. Local skill files must be at the paths specified below
--   3. User must have USAGE privilege on the stage
--
-- Usage:
--   Option A (Snowsight): Run each PUT command in a SQL worksheet
--   Option B (SnowSQL):   snowsql -f DEPLOY_SKILLS.sql
--   Option C (CLI):       snow sql -f DEPLOY_SKILLS.sql
--
-- NOTE: PUT commands only work in SnowSQL or Snowsight, NOT in
--       programmatic connectors. Adjust file paths to your local system.
-- ====================================================================

USE WAREHOUSE COCO_HOL_WH;
USE DATABASE DEMANDSENSING_AI;
USE SCHEMA DEMANDSENSING_SCHEMA;

-- =====================================================================
-- SKILL 1: persona_context_scope
-- =====================================================================
PUT file://skills/persona_context_scope/SKILL.md
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/persona_context_scope/
    AUTO_COMPRESS = FALSE
    OVERWRITE = TRUE;

-- =====================================================================
-- SKILL 2: data_preparation
-- =====================================================================
PUT file://skills/data_preparation/SKILL.md
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/data_preparation/
    AUTO_COMPRESS = FALSE
    OVERWRITE = TRUE;

PUT file://skills/data_preparation/signal_profiler.py
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/data_preparation/
    AUTO_COMPRESS = FALSE
    OVERWRITE = TRUE;

-- =====================================================================
-- SKILL 3: descriptive_demand_analysis
-- =====================================================================
PUT file://skills/descriptive_demand_analysis/SKILL.md
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/descriptive_demand_analysis/
    AUTO_COMPRESS = FALSE
    OVERWRITE = TRUE;

PUT file://skills/descriptive_demand_analysis/driver_decomposition.py
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/descriptive_demand_analysis/
    AUTO_COMPRESS = FALSE
    OVERWRITE = TRUE;

PUT file://skills/descriptive_demand_analysis/collinearity_check.py
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/descriptive_demand_analysis/
    AUTO_COMPRESS = FALSE
    OVERWRITE = TRUE;

PUT file://skills/descriptive_demand_analysis/seasonality_detector.py
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/descriptive_demand_analysis/
    AUTO_COMPRESS = FALSE
    OVERWRITE = TRUE;

-- =====================================================================
-- SKILL 4: predictive_prescriptive
-- =====================================================================
PUT file://skills/predictive_prescriptive/SKILL.md
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/predictive_prescriptive/
    AUTO_COMPRESS = FALSE
    OVERWRITE = TRUE;

PUT file://skills/predictive_prescriptive/scenario_projector.py
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/predictive_prescriptive/
    AUTO_COMPRESS = FALSE
    OVERWRITE = TRUE;

PUT file://skills/predictive_prescriptive/guardrail_checker.py
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/predictive_prescriptive/
    AUTO_COMPRESS = FALSE
    OVERWRITE = TRUE;

-- =====================================================================
-- SKILL 5: demand_cross_validator (already deployed — verify only)
-- =====================================================================
-- The demand_cross_validator skill was previously deployed.
-- Uncomment below ONLY if you need to re-deploy it:
--
-- PUT file://skills/demand_cross_validator/SKILL.md
--     @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/demand_cross_validator/
--     AUTO_COMPRESS = FALSE
--     OVERWRITE = TRUE;

-- =====================================================================
-- SKILL 6: insight_communication
-- =====================================================================
PUT file://skills/insight_communication/SKILL.md
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/insight_communication/
    AUTO_COMPRESS = FALSE
    OVERWRITE = TRUE;

PUT file://skills/insight_communication/persona_templates.py
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/insight_communication/
    AUTO_COMPRESS = FALSE
    OVERWRITE = TRUE;

-- =====================================================================
-- VERIFICATION — Confirm all skills are on stage
-- =====================================================================
LIST @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/
    PATTERN = '.*SKILL\\.md';

-- Expected output: 6 SKILL.md files
-- 1. skills/persona_context_scope/SKILL.md
-- 2. skills/data_preparation/SKILL.md
-- 3. skills/descriptive_demand_analysis/SKILL.md
-- 4. skills/predictive_prescriptive/SKILL.md
-- 5. skills/demand_cross_validator/SKILL.md
-- 6. skills/insight_communication/SKILL.md

-- =====================================================================
-- NEXT STEP: Run CREATE_INTERACTIVE_AGENT.sql to create the agent
-- =====================================================================
