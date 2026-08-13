# Vibe Analytics — Cortex Agent Skills Gameplan (Demand Sensing Edition)

**Project:** Vibe Analytics — Demand Sensing (Brightway Retail)  
**Objective:** Identify which agents benefit from prebuilt vs custom skill bundles, focusing on capabilities NOT already leveraged in Phase 2 (CPG PriceGap), and provide a detailed custom skill example.  
**Date:** June 24, 2026  
**Database:** DEMANDSENSING_AI  
**Semantic Model:** `@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SEMANTIC_MODEL/DemandSensing_SemanticModel.yaml`

---

## Current State

### Snowflake Environment

| Asset | Status | Location |
|-------|--------|----------|
| Semantic Model YAML | Deployed on stage | `@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SEMANTIC_MODEL` |
| Cortex Agent(s) | Not yet deployed | — |
| Skills (SKILL.md) | Not yet created | — |
| Data tables | Populated | `DEMANDSENSING_AI.DEMANDSENSING_SCHEMA` (8 tables, ~16M+ rows) |
| Demand Scenarios | 5 active | fresh_produce_heatwave, viral_speaker_spike, patio_furniture_drop, artisan_bread_dip, premium_yogurt_lift |

### Tools Used in Phase 2 (CPG PriceGap — Already Proven)

| Tool | Type | Used By |
|------|------|---------|
| Cortex Analyst (Semantic Model) | Prebuilt | CPG PriceGap Agent, Supply Chain Agent |
| Stored Procedures (classify_intent, run_ml_task, Plotlychart) | Custom | Both agents |
| Cortex Search Service (FRAUD_POLICY_SEARCH) | Prebuilt | Interactive Module |

### What Was NOT Used in Phase 2 (Opportunity for Phase 3)

- **Agent Skills** (SKILL.md packages) — not implemented
- **Code Execution** (built-in Python sandbox) — not enabled
- **Data to Chart** (built-in) — explicitly disabled
- **MCP Connectors** — not configured
- **Web Search** — not enabled
- **Multi-Agent Orchestration** — single-agent architecture only

---

## Agent Roster — Demand Sensing Architecture

From the Process View, the Demand Sensing system uses **11 specialized agents** operating in a multi-agent orchestration pattern:

| # | Agent | Category | Primary Responsibility |
|---|-------|----------|----------------------|
| 1 | **Master Agent** | Scoping | Infers analysis scope, defines storyboard/plan, breaks tasks into sub-tasks, orchestrates agent assignments, consolidates insights, primary user interface |
| 2 | **Persona Context Agent** | Scoping | Detects user persona on login, configures scope/context/blueprint of insights most valuable for that persona |
| 3 | **Data Gathering Agent** | Data Related | Understands data requirements, gathers tables/views, creates test and prod datasets for AI/ML models |
| 4 | **Feature Enhancement Agent** | Data Related | Identifies all features/KPIs required, computes and builds additional relevant features |
| 5 | **Business Analyst Agent** | Descriptive | Orchestrates the analytical workflow; routes to Root Cause, Trend Discovery, and Dimension Analysis |
| 6 | **Root Cause Analysis Agent** | Diagnostic | Identifies top contributors to metric performance, attributes to significant drivers with ranked views |
| 7 | **Trend Discovery Agent** | Descriptive | Analyses implicit trend and seasonality patterns, generates time-series views, computes YoY/QoQ/MoM |
| 8 | **Dimension Analysis Agent** | Descriptive | Splits and creates views across multiple dimensions (explanatory variables) in the data |
| 9 | **Insight Narration Agent** | Narration & Validation | Converts findings into business narrative with visuals, persona-relevant storyboard with key takeaways |
| 10 | **Visualization Agent** | Narration & Validation | Generates visuals to support analysis and insights |
| 11 | **Validation Agent** | Narration & Validation | Validates accuracy, completeness, and relevancy of tasks completed by BA/DS branches w.r.t. user query |
| 12 | **Data Scientist Agent** | Predictive & Prescriptive | Understands prediction tasks, identifies suitable models, orchestrates Predictive + Prescriptive sub-agents |
| 13 | **Predictive Agent** | Predictive & Prescriptive | Executes inference jobs on selected models from Model Catalog |
| 14 | **Prescriptive Agent** | Predictive & Prescriptive | Interprets prediction results, recommends impactful actions from the analysis |

---

## Part 1: Agents That Benefit from PREBUILT Skills/Tools (Not Used in Phase 2)

These are Snowflake-native capabilities that were **not leveraged in Phase 2** and represent net-new value for Demand Sensing.

### 1.1 Data Scientist Agent + Predictive Agent — Code Execution (Built-In Python Sandbox)

| Item | Detail |
|------|--------|
| **Agents** | Data Scientist Agent, Predictive Agent |
| **Prebuilt Tool** | Code Execution (Python sandbox) |
| **Phase 2 Status** | Not enabled — relied on `run_ml_task` stored procedure |
| **Demand Sensing Use Case** | Run demand driver decomposition math in-loop: seasonal decomposition, driver attribution (weather_pp + promo_pp + competitor_pp + digital_pp + residual_pp), confidence interval calculations for 13-week forward projections, scenario overlay simulations |
| **Why Now** | The storyboard Step 2 (EXPLAIN) requires real-time quantitative decomposition of the +28% deviation into 5 driver contributions with collinearity checks. Code execution does this natively without a stored procedure round-trip. |

**Demand Sensing-Specific Value:**
- Compute `demand_deviation_pct = driver_weather_pp + driver_promo_pp + driver_competitor_pp + driver_digital_pp + driver_residual_pp` decomposition live
- Run multi-collinearity checks (correlation matrix between driver signals)
- Calculate P10/P90 confidence bounds for forward projections
- Execute scenario overlay simulations (e.g., "what if heatwave extends 5 more days?")

---

### 1.2 Root Cause Analysis Agent — Code Execution (Built-In Python Sandbox)

| Item | Detail |
|------|--------|
| **Agent** | Root Cause Analysis Agent |
| **Prebuilt Tool** | Code Execution (Python sandbox) |
| **Phase 2 Status** | Not enabled — relied purely on LLM narrative reasoning |
| **Demand Sensing Use Case** | Quantitative waterfall decomposition across sub-categories (Salads +35%, Berries +31%, Stone Fruit +24%), store-cluster contribution analysis, counterfactual validation ("remove weather signal — is residual within normal bounds?") |
| **Why Now** | The storyboard shows the agent attributing 45% to weather, 25% to promo, 15% to competitor, 10% to digital with dampening for collinearity. This requires actual math, not LLM estimation. |

---

### 1.3 Visualization Agent — Data to Chart (Built-In)

| Item | Detail |
|------|--------|
| **Agent** | Visualization Agent |
| **Prebuilt Tool** | `data_to_chart` |
| **Phase 2 Status** | Explicitly disabled; used custom `Plotlychart` stored procedure |
| **Demand Sensing Use Case** | Morning Signal Pack visualizations (deviation heatmaps, driver waterfall charts, 13-week forecast fans with P10/P90 bands), promotional lift bar charts, inventory days-of-supply gauges |
| **Why Now** | The autonomous morning scan generates multiple quick visualizations per persona. Built-in chart generation eliminates warehouse cost for standard chart types. Reserve `Plotlychart` for complex geo-spatial or multi-axis custom visuals only. |

---

### 1.4 Master Agent + Insight Narration Agent — Web Search (Built-In)

| Item | Detail |
|------|--------|
| **Agents** | Master Agent, Insight Narration Agent |
| **Prebuilt Tool** | Web Search |
| **Phase 2 Status** | Not enabled — all analysis was internal-only |
| **Demand Sensing Use Case** | External context enrichment for the EXPLAIN and COMMUNICATE steps: weather forecast validation (NWS data), competitor news (retailer stockout reports), social media trend verification (viral product confirmation), commodity price indices |
| **Why Now** | The storyboard explicitly references external signals: "viral social media trend around a specific outdoor product has tripled search volume overnight, and competitor stockouts are starting to surface." Web search validates these claims with live data. |

---

### 1.5 Persona Context Agent — MCP Connector (Salesforce/Jira/Teams)

| Item | Detail |
|------|--------|
| **Agent** | Persona Context Agent |
| **Prebuilt Tool** | MCP Connector |
| **Phase 2 Status** | Not configured — persona detection was login-only |
| **Demand Sensing Use Case** | Pull active planning cycles from Blue Yonder API, Jira tickets for open replenishment actions, Teams/Slack context for David Park's supply escalations — enrich the persona scope beyond "which department do you own" to "what are you actively working on this week" |
| **Why Now** | The storyboard shows 5 personas who need contextually different views of the same data. Sarah sees Fresh & Grocery detail; Lisa sees enterprise roll-up. MCP connectors pull their active workflow context. |

---

### 1.6 Trend Discovery Agent — Code Execution (Built-In Python Sandbox)

| Item | Detail |
|------|--------|
| **Agent** | Trend Discovery Agent |
| **Prebuilt Tool** | Code Execution (Python sandbox) |
| **Phase 2 Status** | Not enabled — LLM "discovered" patterns by reading tabular data |
| **Demand Sensing Use Case** | Time-series decomposition (STL) on NRF 4-4-5 fiscal calendar, changepoint detection for demand regime shifts, moving average calculations for 7-day/28-day baselines, holiday effect quantification, Google Trends score correlation analysis |
| **Why Now** | Demand Sensing operates on daily grain (~15.8M rows) with explicit seasonality patterns (fiscal weeks, NRF calendar). Statistical detection is essential — LLM pattern recognition alone cannot reliably separate signal from noise at this scale. |

---

### Prebuilt Skills Summary — NEW for Phase 3 (Not in Phase 2)

| Agent | Prebuilt Tool | Priority | Effort | Phase 2 Status |
|-------|--------------|----------|--------|----------------|
| Data Scientist + Predictive Agent | Code Execution | **CRITICAL** | Low (enable) | Not used |
| Root Cause Analysis Agent | Code Execution | **CRITICAL** | Low (enable) | Not used |
| Visualization Agent | Data to Chart | **HIGH** | Low (re-enable) | Explicitly disabled |
| Master + Insight Narration Agent | Web Search | **HIGH** | Low (enable + account config) | Not used |
| Persona Context Agent | MCP Connector | **MEDIUM** | Medium (configure MCP server) | Not used |
| Trend Discovery Agent | Code Execution | **HIGH** | Low (enable) | Not used |

**Key Difference from Phase 2:** Phase 2 identified these same tools as opportunities but never implemented any of them. Phase 3 Demand Sensing should enable **all prebuilt tools** from Day 1 because the storyboard workflow (Autonomous Morning Signal Pack → Interactive Diagnosis → Projection → Recommendation) fundamentally requires quantitative computation, external validation, and rapid visualization — all of which these prebuilt tools provide without custom development.

---

## Part 2: Agents That Benefit from CUSTOM Skills (SKILL.md Packages)

Custom skills are domain-specific playbooks that go beyond what Phase 2 defined. While Phase 2 proposed skills for CPG pricing (e.g., `pricing_root_cause`, `kpi_derivation`), Demand Sensing requires fundamentally different workflows aligned to the **DETECT → EXPLAIN → PROJECT → RECOMMEND → COMMUNICATE** storyboard flow.

### 2.1 Master Agent — `morning_signal_pack` Skill

| Item | Detail |
|------|--------|
| **Agent** | Master Agent |
| **Skill Name** | `morning_signal_pack` |
| **Phase 2 Equivalent** | None — Phase 2 had no autonomous analysis |
| **Purpose** | Orchestrate the overnight autonomous scan: portfolio-wide anomaly detection, impact ranking, cross-departmental awareness, and persona-tailored presentation |
| **Contains** | Multi-step workflow for the DETECT phase + `anomaly_ranker.py` script |
| **Trigger** | Automatically on persona login OR when user asks "what changed?" / "morning update" / "portfolio scan" |

**Why This Is NEW (Not in Phase 2):**
Phase 2 was purely reactive (user asks → agent answers). The Demand Sensing storyboard introduces **autonomous proactive analysis** — the agent scans 14,400 SKU-store combinations overnight and surfaces the top 3 anomalies before the user types anything. This requires a structured skill to ensure consistent, repeatable autonomous execution.

---

### 2.2 Root Cause Analysis Agent — `demand_driver_attribution` Skill

| Item | Detail |
|------|--------|
| **Agent** | Root Cause Analysis Agent |
| **Skill Name** | `demand_driver_attribution` |
| **Phase 2 Equivalent** | `pricing_root_cause` (CPG pricing decomposition) |
| **Purpose** | Systematic decomposition of demand deviations into the 5 driver signals (weather, promo, competitor, digital, residual) with collinearity checks and counterfactual validation |
| **Contains** | 5-step workflow + `driver_decomposition.py` + `collinearity_check.py` scripts |
| **Trigger** | User asks "why" demand changed, requests diagnosis, or asks about demand drivers |

**Key Difference from Phase 2's `pricing_root_cause`:**
- Phase 2 decomposed by *dimensions* (retailer → department → category → SKU)
- Phase 3 decomposes by *causal signals* (weather → promo → competitor → digital → residual) with explicit `demand_deviation_pct` identity: `driver_weather_pp + driver_promo_pp + driver_competitor_pp + driver_digital_pp + driver_residual_pp`
- Adds multi-collinearity detection (weather × digital correlation check)
- Adds dampening logic when signals overlap

---

### 2.3 Predictive Agent — `demand_scenario_projector` Skill

| Item | Detail |
|------|--------|
| **Agent** | Predictive Agent |
| **Skill Name** | `demand_scenario_projector` |
| **Phase 2 Equivalent** | None — Phase 2 had no scenario modeling |
| **Purpose** | Project demand forward under multiple scenarios using the 5 pre-defined scenario overlays + custom what-if parameters |
| **Contains** | Scenario selection logic, confidence band calculation (P10/P90), sensitivity analysis framework |
| **Trigger** | User asks "what will happen", "project forward", "what-if", or references a scenario name |

**Why This Is NEW:**
The semantic model contains 5 explicit demand scenarios (`fresh_produce_heatwave`, `viral_speaker_spike`, `patio_furniture_drop`, `artisan_bread_dip`, `premium_yogurt_lift`). This skill knows how to query scenario-overlay rows vs baseline, compute differential impact, and project forward with FACT_FORECAST confidence bounds.

---

### 2.4 Prescriptive Agent — `demand_action_recommender` Skill

| Item | Detail |
|------|--------|
| **Agent** | Prescriptive Agent |
| **Skill Name** | `demand_action_recommender` |
| **Phase 2 Equivalent** | `action_prioritization` (generic P0-P3 tiering) |
| **Purpose** | Generate guardrail-compliant, persona-routed recommendations with projected revenue impact, confidence scores, and approval routing |
| **Contains** | Guardrail compliance checker (DIM_GUARDRAILS), recommendation template aligned to FACT_RECOMMENDATIONS schema, urgency classification, approval routing logic |
| **Trigger** | Post-diagnosis when projected impact exceeds threshold, or when user asks "what should I do?" |

**Key Difference from Phase 2's `action_prioritization`:**
- Phase 2 used generic P0-P3 priority tiers
- Phase 3 uses explicit guardrail rules from DIM_GUARDRAILS (8 active rules: gross_margin_pct >= 18%, promo_discount_pct <= 40%, confidence_score >= 0.6, etc.)
- Routes actions by `persona_owner` (Sarah, Mark, Emily, David, Lisa)
- Checks `requires_approval_flag` for governance compliance
- Outputs match FACT_RECOMMENDATIONS schema exactly (for persistence)

---

### 2.5 Business Analyst Agent — `six_layer_demand_analysis` Skill

| Item | Detail |
|------|--------|
| **Agent** | Business Analyst Agent (BA Orchestrator) |
| **Skill Name** | `six_layer_demand_analysis` |
| **Phase 2 Equivalent** | `six_layer_analysis` (generic framework) |
| **Purpose** | Demand-specific analytical structure: Scope → Describe → Diagnose → Project → Prescribe → Validate, mapped to the storyboard DETECT→EXPLAIN→PROJECT→RECOMMEND→COMMUNICATE flow |
| **Contains** | Framework with demand-specific KPIs at each layer (stockout rate, MAPE, days of supply, lost sales revenue, OTIF rate) |
| **Trigger** | Any comprehensive analytical request spanning multiple dimensions |

---

### 2.6 Feature Enhancement Agent — `demand_kpi_derivation` Skill

| Item | Detail |
|------|--------|
| **Agent** | Feature Enhancement Agent |
| **Skill Name** | `demand_kpi_derivation` |
| **Phase 2 Equivalent** | `kpi_derivation` (RWPG formula, contribution margin) |
| **Purpose** | Consistent rules for deriving demand sensing composite KPIs |
| **Contains** | Formulas for: lost_revenue (lost_units × regular_price), sell_through_rate (units_sold/on_hand), MAPE (avg(abs_pct_error)), forecast_bias, net_promo_lift (lift - cannibalization), effective_coverage (ending_on_hand + on_order + in_transit), demand_deviation decomposition identity |
| **Trigger** | When the agent needs to compute derived metrics from raw data |

---

### 2.7 Trend Discovery Agent — `demand_seasonality_detector` Skill

| Item | Detail |
|------|--------|
| **Agent** | Trend Discovery Agent |
| **Skill Name** | `demand_seasonality_detector` |
| **Phase 2 Equivalent** | `seasonality_detector` (generic time-series) |
| **Purpose** | Detect demand patterns on the NRF 4-4-5 fiscal calendar with holiday effects, weather seasonality, and promotional cadence patterns |
| **Contains** | NRF calendar-aware decomposition, holiday_name effect quantification, weather_condition seasonal correlation, fiscal_week-based YoY comparison rules |
| **Trigger** | Time-series questions, YoY/QoQ comparisons, trend detection, "what's the pattern?" |

**Key Difference from Phase 2:**
- Phase 2 used standard calendar seasonality
- Phase 3 must use NRF 4-4-5 fiscal calendar (fiscal_year, fiscal_quarter, fiscal_month, fiscal_week) — the semantic model explicitly warns "never use YEAR(transaction_date) or QUARTER(transaction_date)"
- Incorporates weather_condition as a seasonal variable (not just time)

---

### 2.8 Validation Agent — `demand_cross_validator` Skill

| Item | Detail |
|------|--------|
| **Agent** | Validation Agent |
| **Skill Name** | `demand_cross_validator` |
| **Phase 2 Equivalent** | `cross_validation_checker` (generic consistency) |
| **Purpose** | Validate analytical outputs against demand sensing domain rules and guardrails |
| **Contains** | Driver attribution identity check (5 drivers must sum to demand_deviation_pct), guardrail threshold validation (8 rules from DIM_GUARDRAILS), scenario_id filtering check (baseline vs overlay), censored vs uncensored demand consistency (units_sold ≤ actual_demand_units when stockout_flag = TRUE) |
| **Trigger** | Always activated as final step before narration |

---

### 2.9 Insight Narration Agent — `persona_storyboard` Skill

| Item | Detail |
|------|--------|
| **Agent** | Insight Narration Agent |
| **Skill Name** | `persona_storyboard` |
| **Phase 2 Equivalent** | None — Phase 2 had no persona-specific narration |
| **Purpose** | Generate persona-tailored narratives: Sarah gets sub-category detail + action windows; David gets supply chain impact + replenishment triggers; Lisa gets enterprise roll-up + S&OP talking points |
| **Contains** | Persona templates (5 personas), communication style guide, urgency language framework, cross-departmental awareness format |
| **Trigger** | Final presentation step; adapts output to detected persona |

---

### 2.10 Data Gathering Agent — `demand_signal_profiler` Skill

| Item | Detail |
|------|--------|
| **Agent** | Data Gathering Agent |
| **Skill Name** | `demand_signal_profiler` |
| **Phase 2 Equivalent** | `schema_profiler` (generic data profiling) |
| **Purpose** | Profile the demand signal repository: check signal freshness (last refresh timestamp), null rates on external signals (weather, competitor, digital), scenario coverage, store-SKU combination completeness |
| **Contains** | Signal freshness checks, completeness scoring per signal type, date range validation against NRF calendar, scenario_id distribution analysis |
| **Trigger** | First step of autonomous overnight scan; validates data before analysis |

---

### Custom Skills Summary — Demand Sensing

| Agent | Custom Skill | Priority | Effort | New vs Phase 2 |
|-------|-------------|----------|--------|----------------|
| Master Agent | `morning_signal_pack` | **CRITICAL** | High | **Entirely new** |
| Root Cause Analysis Agent | `demand_driver_attribution` | **CRITICAL** | Medium | Replaces `pricing_root_cause` |
| Predictive Agent | `demand_scenario_projector` | **HIGH** | Medium | **Entirely new** |
| Prescriptive Agent | `demand_action_recommender` | **HIGH** | Medium | Replaces `action_prioritization` |
| BA Orchestrator | `six_layer_demand_analysis` | **HIGH** | Low | Adapts `six_layer_analysis` |
| Feature Enhancement Agent | `demand_kpi_derivation` | **MEDIUM** | Low | Replaces `kpi_derivation` |
| Trend Discovery Agent | `demand_seasonality_detector` | **MEDIUM** | Medium | Replaces `seasonality_detector` |
| Validation Agent | `demand_cross_validator` | **MEDIUM** | Low | Replaces `cross_validation_checker` |
| Insight Narration Agent | `persona_storyboard` | **MEDIUM** | Medium | **Entirely new** |
| Data Gathering Agent | `demand_signal_profiler` | **LOW** | Medium | Replaces `schema_profiler` |

---

## Part 3: Detailed Example — Custom Skill for Root Cause Analysis Agent

### `demand_driver_attribution` — Complete Implementation

This skill directly implements the storyboard Step 2 (EXPLAIN) flow where Sarah asks: "Diagnose the Fresh Produce anomaly... Decompose the +28% deviation into signal-by-signal attribution."

### Folder Structure on Stage

```
@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/demand_driver_attribution/
├── SKILL.md
├── driver_decomposition.py
└── collinearity_check.py
```

### SKILL.md

```markdown
name: demand_driver_attribution
description: >
  Systematic demand deviation decomposition into causal driver signals.
  Use when analyzing why demand deviated from forecast/baseline, when asked about
  demand drivers, or when diagnosing anomalies detected in the Morning Signal Pack.

instructions: |
  When tasked with explaining a demand deviation, follow this exact workflow:

  ## Step 1: Quantify the Deviation
  - Use Cortex Analyst to query FACT_DEMAND_DAILY for the affected scope
    (department + region + date range), filtering scenario_id IS NULL (baseline only)
  - Calculate: actual_demand_units vs expected_demand_units
  - Report the demand_deviation_pct (already pre-computed in the table)
  - Classify severity:
    - CRITICAL: |deviation| > 25% AND revenue_at_stake > $100K
    - HIGH: |deviation| > 15% OR revenue_at_stake > $50K
    - MEDIUM: |deviation| 10-15%
    - LOW: |deviation| < 10%
  - Determine deviation direction: UPSIDE (positive) or DOWNSIDE (negative)

  ## Step 2: Signal-by-Signal Attribution
  - Query the 5 pre-computed driver columns from FACT_DEMAND_DAILY:
    - driver_weather_pp (weather contribution in percentage points)
    - driver_promo_pp (promotion contribution)
    - driver_competitor_pp (competitor effect contribution)
    - driver_digital_pp (digital/social signal contribution)
    - driver_residual_pp (unexplained residual)
  - Aggregate by the requested dimensions (AVG per driver across scope)
  - IDENTITY CHECK: Sum of 5 drivers MUST equal demand_deviation_pct (within ±0.5pp rounding)
  - If identity fails, flag as data quality issue and halt
  - Run driver_decomposition.py for waterfall visualization data

  ## Step 3: Collinearity Assessment
  - Run collinearity_check.py on the raw signal values:
    - temperature_anomaly_f (weather proxy)
    - promo_flag + promo_discount_pct (promo proxy)
    - competitor_price_index + competitor_availability_pct (competitor proxy)
    - google_trends_score (digital proxy)
  - Flag any pair with |correlation| > 0.5
  - Apply dampening to the smaller-contributing signal:
    - Dampening factor = 1 - (correlation_coefficient × overlap_pct)
    - Report both raw and dampened attribution
  - Common collinearities in this domain:
    - Weather × Digital (r ~0.6): heat drives both produce demand AND recipe searches
    - Promo × Competitor (r ~0.3): usually independent, but check
    - Weather × Promo (r ~0.2): usually independent

  ## Step 4: Dimensional Drill-Down
  - For the top 2 drivers (by absolute pp contribution):
    - Drill into sub-category level (category_l3): which sub-categories are most affected?
    - Drill into store-cluster level (store_cluster_id): is it broad-based or concentrated?
  - Classify concentration:
    - BROAD: >70% of stores in scope contributing
    - CONCENTRATED: <30% of stores driving >60% of deviation
    - MIXED: between broad and concentrated
  - For concentrated patterns, identify the specific clusters and flag for targeted action

  ## Step 5: Counterfactual Validation
  - For the #1 driver: compute demand_deviation_pct EXCLUDING that driver's contribution
  - Ask: "If we remove [top driver], is the residual deviation within normal bounds (±10%)?"
  - If YES: top driver confirmed as primary root cause (HIGH confidence)
  - If NO: multiple independent causes — repeat attribution on residual
  - Use Code Execution to run the counterfactual calculation

  ## Step 6: Output Format
  Structure your response as:

  **Demand Signal Diagnosis**
  - Scope: [department] × [region(s)] × [date range]
  - Total Deviation: [+/-X%] ([absolute units] units vs expected)
  - Severity: [CRITICAL/HIGH/MEDIUM/LOW]
  - Revenue at Stake: $[amount] over [time window]

  **Driver Attribution (sum = total deviation)**

  | Driver | Contribution (pp) | % of Total | Confidence | Key Evidence |
  |--------|-------------------|------------|------------|--------------|
  | Weather | +X.X pp | XX% | HIGH/MED/LOW | [specific metric] |
  | Promotion | +X.X pp | XX% | HIGH/MED/LOW | [specific metric] |
  | Competitor | +X.X pp | XX% | HIGH/MED/LOW | [specific metric] |
  | Digital/Social | +X.X pp | XX% | HIGH/MED/LOW | [specific metric] |
  | Residual | +X.X pp | XX% | — | Unexplained |
  | **TOTAL** | **+XX.X pp** | **100%** | | |

  **Collinearity Notes:** [any dampening applied and why]

  **Concentration Analysis:**
  - Pattern: [BROAD/CONCENTRATED/MIXED]
  - Top sub-categories: [list with individual deviation %]
  - Store coverage: [X of Y stores contributing]

  **Counterfactual Validation:**
  - Without [top driver]: residual = [X%] → [CONFIRMED / MULTIPLE CAUSES]

  **Confidence Assessment:** HIGH / MEDIUM / LOW
  - HIGH: Top 2 drivers explain >80% + identity holds + counterfactual validates
  - MEDIUM: Top 2 drivers explain 60-80% OR partial counterfactual
  - LOW: Top 2 drivers explain <60% OR residual > 5pp

  **Recommended Next Step:** [Bridge to PROJECT or RECOMMEND phase]

  ## Domain Rules (Demand Sensing Specific)
  - ALWAYS use actual_demand_units (uncensored), NOT units_sold, for deviation calculations
  - Filter scenario_id IS NULL for baseline analysis unless user explicitly references a scenario
  - Use fiscal_week/fiscal_month for time grouping — NEVER YEAR() or QUARTER() on transaction_date
  - Weather sensitivity elasticity: +1°F anomaly ≈ +0.8pp Fresh Produce deviation (historical benchmark)
  - Stockout-censored days: exclude from demand signal calculations (demand is latent, not observed)
  - Guardrail check: if |residual_pp| > 5, flag as "unexplained variance requiring investigation"

  ## Script References
  - driver_decomposition.py: Takes FACT_DEMAND_DAILY data, computes waterfall by dimension
  - collinearity_check.py: Takes raw signal columns, returns correlation matrix + dampening recommendations
```

### driver_decomposition.py

```python
"""
Demand driver decomposition for root cause analysis.
Decomposes total demand deviation into per-signal and per-dimension contributions.
Specific to the Demand Sensing 5-driver attribution model.
"""
import json


def driver_waterfall(data: list, scope_dim: str) -> dict:
    """
    Decompose demand deviation by dimension, showing driver contributions per segment.

    Args:
        data: List of dicts from FACT_DEMAND_DAILY with driver columns
        scope_dim: Dimension to decompose by (e.g., 'CATEGORY_L3', 'STORE_CLUSTER_ID')

    Returns:
        Dict with per-segment driver breakdown and totals
    """
    DRIVERS = [
        'DRIVER_WEATHER_PP', 'DRIVER_PROMO_PP',
        'DRIVER_COMPETITOR_PP', 'DRIVER_DIGITAL_PP', 'DRIVER_RESIDUAL_PP'
    ]

    segments = {}
    for row in data:
        dim_val = str(row.get(scope_dim, row.get(scope_dim.lower(), 'Unknown')))
        if dim_val not in segments:
            segments[dim_val] = {d: [] for d in DRIVERS}
            segments[dim_val]['DEMAND_DEVIATION_PCT'] = []
            segments[dim_val]['count'] = 0

        for d in DRIVERS:
            val = float(row.get(d, row.get(d.lower(), 0)) or 0)
            segments[dim_val][d].append(val)

        dev = float(row.get('DEMAND_DEVIATION_PCT',
                            row.get('demand_deviation_pct', 0)) or 0)
        segments[dim_val]['DEMAND_DEVIATION_PCT'].append(dev)
        segments[dim_val]['count'] += 1

    results = []
    for seg, values in segments.items():
        n = values['count']
        if n == 0:
            continue

        seg_result = {
            'segment': seg,
            'observation_count': n,
            'avg_deviation_pct': round(
                sum(values['DEMAND_DEVIATION_PCT']) / n, 2
            ),
            'drivers': {}
        }

        for d in DRIVERS:
            avg_val = sum(values[d]) / n
            seg_result['drivers'][d] = round(avg_val, 2)

        # Identity check: sum of drivers should ≈ total deviation
        driver_sum = sum(seg_result['drivers'].values())
        seg_result['identity_check'] = abs(
            driver_sum - seg_result['avg_deviation_pct']
        ) < 0.5
        seg_result['driver_sum'] = round(driver_sum, 2)

        results.append(seg_result)

    # Sort by absolute deviation (biggest movers first)
    results.sort(key=lambda x: abs(x['avg_deviation_pct']), reverse=True)

    # Compute totals
    all_devs = [r['avg_deviation_pct'] for r in results]
    total_avg_dev = sum(all_devs) / len(all_devs) if all_devs else 0

    # Concentration: do top 3 segments explain >70% of total deviation?
    if results and total_avg_dev != 0:
        top3_contribution = sum(
            abs(r['avg_deviation_pct']) for r in results[:3]
        ) / sum(abs(r['avg_deviation_pct']) for r in results) * 100
    else:
        top3_contribution = 0

    return {
        'dimension': scope_dim,
        'total_segments': len(results),
        'overall_avg_deviation': round(total_avg_dev, 2),
        'top3_concentration_pct': round(top3_contribution, 1),
        'is_broad': top3_contribution < 70,
        'segments': results[:10]  # Top 10 segments
    }


def revenue_at_stake(data: list, days_forward: int = 14) -> dict:
    """
    Estimate revenue at stake from a demand deviation.

    Args:
        data: Recent FACT_DEMAND_DAILY rows for affected scope
        days_forward: Days to project the deviation forward

    Returns:
        Dict with revenue-at-stake estimate
    """
    total_daily_revenue = 0
    total_deviation_pct = 0
    count = 0

    for row in data:
        rev = float(row.get('GROSS_SALES_AMT',
                            row.get('gross_sales_amt', 0)) or 0)
        dev = float(row.get('DEMAND_DEVIATION_PCT',
                            row.get('demand_deviation_pct', 0)) or 0)
        total_daily_revenue += rev
        total_deviation_pct += dev
        count += 1

    if count == 0:
        return {'revenue_at_stake': 0, 'confidence': 'LOW'}

    avg_daily_revenue = total_daily_revenue / count
    avg_deviation = total_deviation_pct / count

    # Revenue at stake = avg daily incremental × days forward
    incremental_daily = avg_daily_revenue * (avg_deviation / 100)
    revenue_at_stake_est = incremental_daily * days_forward

    return {
        'avg_daily_revenue': round(avg_daily_revenue, 2),
        'avg_deviation_pct': round(avg_deviation, 2),
        'incremental_daily_revenue': round(incremental_daily, 2),
        'days_projected': days_forward,
        'revenue_at_stake_usd': round(revenue_at_stake_est, 2),
        'confidence': 'HIGH' if count >= 28 else 'MEDIUM' if count >= 7 else 'LOW'
    }
```

### collinearity_check.py

```python
"""
Multi-collinearity detection for demand driver signals.
Identifies overlapping signals and recommends dampening factors.
"""


def correlation(x: list, y: list) -> float:
    """Pearson correlation coefficient."""
    n = len(x)
    if n < 3:
        return 0.0

    mean_x = sum(x) / n
    mean_y = sum(y) / n

    cov = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    std_x = (sum((xi - mean_x) ** 2 for xi in x) / n) ** 0.5
    std_y = (sum((yi - mean_y) ** 2 for yi in y) / n) ** 0.5

    if std_x == 0 or std_y == 0:
        return 0.0

    return round(cov / (n * std_x * std_y), 3)


def check_collinearity(data: list) -> dict:
    """
    Check pairwise correlations between demand signal proxies.

    Args:
        data: List of dicts with signal columns from FACT_DEMAND_DAILY

    Returns:
        Dict with correlation matrix, flagged pairs, and dampening recommendations
    """
    SIGNAL_MAP = {
        'weather': 'TEMPERATURE_ANOMALY_F',
        'promo': 'PROMO_DISCOUNT_PCT',
        'competitor': 'COMPETITOR_PRICE_INDEX',
        'digital': 'GOOGLE_TRENDS_SCORE'
    }

    # Extract signal vectors
    signals = {name: [] for name in SIGNAL_MAP}
    for row in data:
        for name, col in SIGNAL_MAP.items():
            val = float(row.get(col, row.get(col.lower(), 0)) or 0)
            signals[name].append(val)

    # Compute pairwise correlations
    signal_names = list(SIGNAL_MAP.keys())
    correlations = {}
    flagged_pairs = []

    for i in range(len(signal_names)):
        for j in range(i + 1, len(signal_names)):
            s1, s2 = signal_names[i], signal_names[j]
            r = correlation(signals[s1], signals[s2])
            pair_key = f"{s1}_x_{s2}"
            correlations[pair_key] = r

            if abs(r) > 0.5:
                flagged_pairs.append({
                    'signal_1': s1,
                    'signal_2': s2,
                    'correlation': r,
                    'severity': 'HIGH' if abs(r) > 0.7 else 'MODERATE',
                    'dampening_recommendation': {
                        'target_signal': s2 if abs(r) > 0 else s1,
                        'dampening_factor': round(1 - abs(r) * 0.25, 3),
                        'explanation': (
                            f"{s1} and {s2} share {abs(r)*100:.0f}% "
                            f"correlation. Dampen the smaller contributor "
                            f"by {abs(r)*25:.0f}% to avoid double-counting."
                        )
                    }
                })

    return {
        'correlation_matrix': correlations,
        'flagged_pairs': flagged_pairs,
        'collinearity_detected': len(flagged_pairs) > 0,
        'total_pairs_checked': len(correlations),
        'recommendation': (
            'Apply dampening to flagged pairs before reporting attribution.'
            if flagged_pairs else
            'No significant collinearity detected. Report raw attribution.'
        )
    }
```

### How to Deploy

```sql
-- 1. Upload skill files to the existing stage
PUT file:///path/to/demand_driver_attribution/SKILL.md
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/demand_driver_attribution/;
PUT file:///path/to/demand_driver_attribution/driver_decomposition.py
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/demand_driver_attribution/;
PUT file:///path/to/demand_driver_attribution/collinearity_check.py
    @DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/demand_driver_attribution/;

-- 2. Attach skill to the Demand Sensing agent (when created)
CREATE OR REPLACE CORTEX AGENT DEMANDSENSING_AI.DEMANDSENSING_AI.DEMAND_SENSING_AGENT
  SPECIFICATION = $$
  {
    "models": {
      "orchestration": "claude-4-sonnet"
    },
    "orchestration": {
      "budget": {
        "seconds": 300,
        "tokens": 60000
      }
    },
    "instructions": {
      "orchestration": "You are a demand sensing intelligence agent for Brightway Retail. Follow the DETECT-EXPLAIN-PROJECT-RECOMMEND-COMMUNICATE workflow...",
      "response": "Always attribute demand deviations to the 5-driver model. Never use calendar quarters/months — use NRF 4-4-5 fiscal periods..."
    },
    "tools": [
      {
        "tool_spec": {
          "type": "cortex_analyst_text_to_sql",
          "name": "demand_sensing_analyst",
          "description": "NL2SQL for demand sensing data — daily SKU×Store demand, forecasts, promotions, supply chain, and recommendations"
        }
      },
      {
        "tool_spec": {
          "type": "code_execution",
          "name": "PythonSandbox",
          "description": "Run Python for driver decomposition, collinearity checks, scenario simulations, and statistical calculations"
        }
      },
      {
        "tool_spec": {
          "type": "data_to_chart",
          "name": "DemandChart",
          "description": "Generate standard visualizations (waterfall, line, bar, heatmap) from query results"
        }
      }
    ],
    "skills": [
      {
        "name": "demand_driver_attribution",
        "source": {
          "type": "STAGE",
          "path": "@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/demand_driver_attribution"
        }
      }
    ],
    "tool_resources": {
      "demand_sensing_analyst": {
        "semantic_model_file": "@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SEMANTIC_MODEL/DemandSensing_SemanticModel.yaml"
      }
    }
  }
  $$;
```

### How It Works at Runtime (Storyboard Step 2)

1. Sarah asks: *"Diagnose the Fresh Produce anomaly in the Southeast and South-Central regions."*
2. Agent evaluates skill descriptions → `demand_driver_attribution` matches ("diagnose" + "anomaly" + demand context)
3. Agent reads full SKILL.md from the stage
4. **Step 1:** Calls Cortex Analyst → queries FACT_DEMAND_DAILY for Southeast + South-Central, Fresh & Grocery, last 7 days, scenario_id IS NULL. Gets `avg(demand_deviation_pct) = +28%`
5. **Step 2:** Calls Cortex Analyst → retrieves avg of 5 driver columns. Gets: weather=+12.6pp, promo=+7.0pp, competitor=+4.2pp, digital=+2.8pp, residual=+1.4pp. Identity check: 12.6+7.0+4.2+2.8+1.4 = 28.0 ✓
6. **Step 3:** Uses Code Execution → runs `collinearity_check.py` on temperature_anomaly_f × google_trends_score. Gets r=0.62, applies 15% dampening to digital signal. Adjusted: digital=+2.4pp, residual=+1.8pp
7. **Step 4:** Calls Cortex Analyst → drills by category_l3. Gets: Salads +35%, Berries +31%, Stone Fruit +24%. Drill by store_cluster: 138-156 of 168 stores contributing → BROAD pattern
8. **Step 5:** Uses Code Execution → counterfactual: removes weather driver, residual = +15.4% (still elevated but within bounds of other drivers combined) → Weather confirmed as PRIMARY driver
9. **Step 6:** Formats the structured output per template, bridges to PROJECT step

**Result:** A mathematically grounded, causally attributed demand diagnosis — with collinearity awareness, concentration analysis, and counterfactual validation — every time, for any department, for any demand scenario.

---

## Part 4: Decision Matrix — Phase 3 vs Phase 2

| Criteria | Phase 2 (CPG PriceGap) | Phase 3 (Demand Sensing) |
|----------|----------------------|--------------------------|
| **Architecture** | Single agent | Multi-agent (11+ specialized agents) |
| **Analysis Mode** | Reactive only (user prompts) | Autonomous + Interactive |
| **Decomposition** | By dimensions (retailer → category → SKU) | By causal signals (5 drivers) + dimensions |
| **Time Model** | Calendar-based | NRF 4-4-5 fiscal calendar |
| **Scenarios** | None | 5 pre-defined + custom what-if |
| **Personas** | Generic analyst | 5 named personas with tailored outputs |
| **Governance** | Implicit | Explicit DIM_GUARDRAILS (8 rules) |
| **Prebuilt Tools** | None enabled | Code Execution + Data to Chart + Web Search |
| **Custom Skills** | Proposed but not implemented | Critical for multi-agent orchestration |

---

## Part 5: Implementation Roadmap

### Phase A — Enable Prebuilt (Immediate)

1. Enable **Code Execution** on the Demand Sensing agent — unlocks quantitative reasoning for Root Cause, Predictive, Trend Discovery, and Data Scientist agents
2. Enable **Data to Chart** for Morning Signal Pack visualizations and standard charts
3. Enable **Web Search** (requires account-level config) for external signal validation

### Phase B — Build Critical Custom Skills

4. Build `demand_driver_attribution` skill (detailed example above) — enables storyboard Step 2
5. Build `morning_signal_pack` skill — enables autonomous DETECT flow (storyboard Step 1)
6. Build `demand_scenario_projector` skill — enables PROJECT flow (storyboard Step 3)
7. Build `demand_action_recommender` skill — enables RECOMMEND flow (storyboard Step 4)

### Phase C — Build Supporting Skills

8. Build `persona_storyboard` skill — enables persona-tailored COMMUNICATE flow (storyboard Step 5)
9. Build `six_layer_demand_analysis` skill — structured analytical framework
10. Build `demand_kpi_derivation` skill — consistent KPI computation rules
11. Build `demand_seasonality_detector` skill — NRF calendar-aware trend detection

### Phase D — Build Utility Skills + Integrations

12. Build `demand_cross_validator` skill — quality gate before narration
13. Build `demand_signal_profiler` skill — data freshness and completeness checks
14. Configure **MCP Connector** for Blue Yonder / planning system integration

---

## Appendix: What's Genuinely NEW vs Phase 2

### Prebuilt Tools — ALL are new (none were enabled in Phase 2)

| Tool | Phase 2 | Phase 3 |
|------|---------|---------|
| Code Execution | Proposed, never enabled | **MUST enable** — quantitative attribution requires it |
| Data to Chart | Proposed, explicitly disabled | **MUST enable** — morning signal pack needs rapid visualization |
| Web Search | Proposed, never enabled | **Should enable** — external signal validation |
| MCP Connector | Proposed, never configured | Nice-to-have — Blue Yonder integration |

### Custom Skills — Phase 3 has 3 entirely new skill types

| Skill Type | Phase 2 | Phase 3 | Why New |
|------------|---------|---------|---------|
| Autonomous orchestration | ❌ None | `morning_signal_pack` | Phase 2 was reactive-only; Demand Sensing requires proactive overnight scanning |
| Scenario projection | ❌ None | `demand_scenario_projector` | Phase 2 had no what-if; Demand Sensing has 5 explicit scenarios in the data model |
| Persona-tailored narration | ❌ None | `persona_storyboard` | Phase 2 had one analyst; Demand Sensing has 5 named personas with different needs |

### Custom Skills — Phase 3 replaces Phase 2 equivalents with domain-specific versions

| Phase 2 Skill | Phase 3 Replacement | Key Difference |
|---------------|--------------------|----|
| `pricing_root_cause` | `demand_driver_attribution` | Signal-based (5 drivers) vs dimension-based |
| `action_prioritization` | `demand_action_recommender` | Guardrail-aware (DIM_GUARDRAILS) vs generic P0-P3 |
| `six_layer_analysis` | `six_layer_demand_analysis` | DETECT-EXPLAIN-PROJECT-RECOMMEND-COMMUNICATE vs generic |
| `seasonality_detector` | `demand_seasonality_detector` | NRF 4-4-5 fiscal calendar vs standard calendar |
| `kpi_derivation` | `demand_kpi_derivation` | Demand KPIs (MAPE, lost sales, OTIF) vs pricing KPIs (RWPG, margin) |
| `cross_validation_checker` | `demand_cross_validator` | 5-driver identity check + guardrails vs generic bounds |
| `schema_profiler` | `demand_signal_profiler` | Signal freshness + scenario coverage vs generic profiling |
| `segment_deep_dive` | (absorbed into `demand_driver_attribution` Step 4) | Dimensional drill is a sub-step, not a standalone skill |
