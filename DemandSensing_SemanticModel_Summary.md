# Vibe Analytics — Demand Sensing Semantic Model

## Executive Summary

The `DemandSensing_AI` semantic model is an SME-grade Cortex Analyst specification designed to power natural language querying for the **Vibe Analytics Agentic AI Solution** at Brightway Retail. It encodes the full demand sensing domain — from raw daily demand signals through forecast accuracy, promotional effectiveness, supply chain logistics, and AI-driven prescriptive recommendations — into a machine-interpretable schema that enables Cortex Analyst to generate accurate SQL from business questions.

---

## 1. Scope & Coverage

| Attribute | Detail |
|-----------|--------|
| **Retailer** | Brightway Retail |
| **Database** | `DEMANDSENSING_AI.DEMANDSENSING_SCHEMA` |
| **Data Span** | 2023-07-17 to 2026-07-13 (~1,093 days) |
| **Fiscal Calendar** | NRF 4-4-5 retail calendar |
| **SKUs** | 450 across 3 departments |
| **Stores** | 41 nodes (40 B&M + 1 eCommerce FC) |
| **Regions** | 7 (Northeast, Southeast, Midwest, West Coast, South-Central, Mid-Atlantic, National) |
| **Departments** | Fresh & Grocery, Consumer Electronics, Seasonal & Home |
| **Total Rows (primary fact)** | ~15.8 million (FACT_DEMAND_DAILY) |

---

## 2. Tables Defined (10)

### Dimension Tables (5)

| Table | Rows | Purpose |
|-------|------|---------|
| **DIM_PRODUCT** | 450 | Product master with 4-level category hierarchy, brand, lifecycle stage, perishability, and substitution mapping |
| **DIM_STORE** | 41 | Store network with format, tier, geography, DC assignment, and traffic metrics |
| **DIM_SUPPLIER** | 25 | Vendor master with contractual lead times, reliability scores, country of origin, and supply risk |
| **DIM_EXTERNAL_MACRO** | 222 | Monthly regional macro-economic signals (CPI, unemployment, consumer confidence) |
| **DIM_GUARDRAILS** | 8 | AI governance rules defining thresholds, breach actions, severity, and persona ownership |

### Fact Tables (5)

| Table | Rows | Grain | Purpose |
|-------|------|-------|---------|
| **FACT_DEMAND_DAILY** | ~15.8M | Daily SKU x Store | Master one-big-table containing demand actuals, forecasts, sales, inventory, external signals, demand driver attribution, and scenario overlays |
| **FACT_FORECAST** | 535,500 | Weekly SKU x Region | Forecast accuracy (historical actuals vs. forecast) and 13-week forward projections with P10/P90 confidence intervals |
| **FACT_PROMOTIONS** | 7,144 | Promo x SKU x Store | Promotion events with mechanics, effectiveness analytics (lift, ROI), and side-effects (cannibalization, halo, post-promo dip) |
| **FACT_SUPPLY_CHAIN** | 16,703 | Purchase Order | PO ledger with supplier delivery performance, lead times, fill rates, OTIF, and freight costs |
| **FACT_RECOMMENDATIONS** | 5 | Recommendation | AI-generated prescriptive actions with financial impact sizing, confidence scores, urgency, and guardrail compliance |

---

## 3. Semantic Columns Defined

The model defines a total of **185+ semantic columns** across the 10 tables, classified as:

- **Dimensions** (categorical/groupable attributes): 85 columns including time dimensions (dates), fiscal calendar labels, geographic attributes, product hierarchy, and categorical flags
- **Facts** (numeric/aggregatable measures): 80+ columns covering demand quantities, financial amounts, inventory positions, external signals, and driver attribution percentages
- **Time Dimensions** (date-typed columns with time-series handling): 10 columns (transaction_date, week_start_date, order dates, promo dates, etc.)

Each column definition includes:

- **Expression** (`expr`): Physical column reference
- **Data type**: Snowflake-native type (VARCHAR, FLOAT, NUMBER, BOOLEAN, DATE)
- **Description**: Business-context description incorporating Cortex AI Semantic Notes from the data dictionary — including derivation formulas, alert thresholds, and join guidance
- **Synonyms**: 2-5 alternative natural language terms per column for robust NLQ matching
- **Sample values** (where applicable): Enumerated domain values for categorical dimensions

---

## 4. Pre-Defined Metrics (19)

Table-level metrics encode standard KPI formulas directly into the model, ensuring consistent calculation regardless of how a question is phrased.

### FACT_DEMAND_DAILY Metrics (9)

| Metric | Formula | Business Use |
|--------|---------|--------------|
| **TOTAL_NET_SALES** | `SUM(NET_SALES_AMT)` | Top-line revenue reporting |
| **TOTAL_GROSS_MARGIN** | `SUM(GROSS_MARGIN_AMT)` | Profitability measurement |
| **GROSS_MARGIN_PCT** | `SUM(GROSS_MARGIN_AMT) / SUM(NET_SALES_AMT) * 100` | Margin health vs. 18% guardrail floor |
| **TOTAL_UNITS_SOLD** | `SUM(UNITS_SOLD)` | Volume tracking |
| **TOTAL_LOST_SALES_UNITS** | `SUM(LOST_SALES_UNITS_EST)` | Stockout impact quantification |
| **LOST_SALES_REVENUE** | `SUM(LOST_SALES_UNITS_EST * REGULAR_PRICE)` | Revenue opportunity lost to stockouts |
| **STOCKOUT_RATE** | `AVG(CASE WHEN STOCKOUT_FLAG THEN 1 ELSE 0 END) * 100` | Availability performance |
| **AVG_DAYS_OF_SUPPLY** | `AVG(DAYS_OF_SUPPLY)` | Inventory health |
| **SELL_THROUGH_RATE** | `SUM(UNITS_SOLD) / SUM(ON_HAND_UNITS) * 100` | Inventory velocity |

### FACT_FORECAST Metrics (2)

| Metric | Formula | Business Use |
|--------|---------|--------------|
| **FORECAST_ACCURACY_MAPE** | `AVG(ABS_PCT_ERROR)` | Forecast model accuracy benchmarking |
| **FORECAST_BIAS** | `AVG(FORECAST_BIAS_PCT)` | Systematic over/under-forecasting detection |

### FACT_PROMOTIONS Metrics (3)

| Metric | Formula | Business Use |
|--------|---------|--------------|
| **AVG_PROMO_ROI** | `AVG(PROMO_ROI)` | Promotion effectiveness |
| **AVG_PROMO_LIFT** | `AVG(PROMO_LIFT_PCT)` | Average promotional uplift |
| **TOTAL_INCREMENTAL_PROMO_UNITS** | `SUM(PROMO_UNITS_INCREMENTAL)` | Total promo-attributed volume |

### FACT_SUPPLY_CHAIN Metrics (4)

| Metric | Formula | Business Use |
|--------|---------|--------------|
| **OTIF_RATE** | `AVG(CASE WHEN OTIF_FLAG THEN 1 ELSE 0 END) * 100` | Supplier delivery performance vs. 85% target |
| **AVG_FILL_RATE** | `AVG(FILL_RATE_PCT)` | Order completeness vs. 95% target |
| **AVG_LEAD_TIME** | `AVG(LEAD_TIME_DAYS)` | Supply chain cycle time |
| **TOTAL_FREIGHT_COST** | `SUM(FREIGHT_COST)` | Logistics spend |

### FACT_RECOMMENDATIONS Metrics (1)

| Metric | Formula | Business Use |
|--------|---------|--------------|
| **PROJECTED_TOTAL_REVENUE_IMPACT** | `SUM(PROJECTED_REVENUE_IMPACT_USD)` | Total AI recommendation portfolio value |

---

## 5. Relationships (8 Join Paths)

The model explicitly declares all foreign-key join paths enabling Cortex Analyst to navigate multi-table queries:

| Relationship | Left Table | Right Table | Join Column(s) |
|---|---|---|---|
| FACT_DEMAND_DAILY to DIM_PRODUCT | FACT_DEMAND_DAILY | DIM_PRODUCT | SKU_ID |
| FACT_DEMAND_DAILY to DIM_STORE | FACT_DEMAND_DAILY | DIM_STORE | STORE_ID |
| FACT_DEMAND_DAILY to FACT_PROMOTIONS | FACT_DEMAND_DAILY | FACT_PROMOTIONS | PROMO_ID |
| FACT_FORECAST to DIM_PRODUCT | FACT_FORECAST | DIM_PRODUCT | SKU_ID |
| FACT_SUPPLY_CHAIN to DIM_PRODUCT | FACT_SUPPLY_CHAIN | DIM_PRODUCT | SKU_ID |
| FACT_SUPPLY_CHAIN to DIM_SUPPLIER | FACT_SUPPLY_CHAIN | DIM_SUPPLIER | SUPPLIER_ID |
| FACT_PROMOTIONS to DIM_PRODUCT | FACT_PROMOTIONS | DIM_PRODUCT | SKU_ID |
| FACT_PROMOTIONS to DIM_STORE | FACT_PROMOTIONS | DIM_STORE | STORE_ID |

---

## 6. Custom Instructions (12 Domain Rules)

The model embeds domain-specific rules that guide Cortex Analyst's SQL generation behaviour:

1. **Fiscal Calendar** — Enforce NRF 4-4-5 fiscal dimensions; never use calendar YEAR/QUARTER functions
2. **Baseline vs. Scenario** — Default to `scenario_id IS NULL` for standard KPIs; include scenarios only when explicitly requested
3. **Demand Driver Identity** — The five driver components (weather, promo, competitor, digital, residual) sum exactly to `demand_deviation_pct`
4. **Censored vs. Uncensored Demand** — Distinguish `units_sold` (revenue calculations) from `actual_demand_units` (demand sensing)
5. **Lost Sales** — Formula and stockout-flag dependency for lost revenue estimation
6. **Forecast Accuracy** — MAPE/bias calculation rules and the requirement to filter by `forecast_type`
7. **Macro-Economic Join** — Explicit join expression between DIM_EXTERNAL_MACRO and FACT_DEMAND_DAILY using `DATE_TRUNC('month', transaction_date)`
8. **Channel Stratification** — Mandate separating Brick & Mortar from eCommerce in store-level KPIs
9. **Guardrail Compliance** — Mapping between guardrail rules and fact table fields (18% margin floor, 40% discount cap)
10. **Promo Analytics** — Net lift formula, vendor-funded ROI implications, post-promo dip avoidance window
11. **Supply Chain** — OTIF/fill-rate targets, lead-time variance interpretation, DC-to-store traceability
12. **Recommendations** — Approval workflow rules and confidence-score suppression threshold (GR-008)

---

## 7. Verified Queries (15 Grounding Examples)

The model includes 15 verified question-SQL pairs spanning all major analytical domains. These serve as grounding examples so Cortex Analyst produces high-accuracy SQL for similar questions:

| # | Domain | Question |
|---|--------|----------|
| 1 | Revenue | Total net sales by department (FY2026) |
| 2 | Availability | Top stockout SKUs in the last month |
| 3 | Forecast | MAPE by region |
| 4 | Promotions | Top 10 promotions by ROI |
| 5 | Supply Chain | OTIF rate by supplier |
| 6 | Demand Drivers | Biggest demand drivers this week |
| 7 | Lost Sales | Categories with highest lost revenue from stockouts |
| 8 | AI Recommendations | All active recommendations with projected impact |
| 9 | Margin Trends | Gross margin trend by month for Fresh & Grocery |
| 10 | Inventory | Average days of supply by store tier and department |
| 11 | Scenarios | Viral speaker spike vs. baseline comparison |
| 12 | Governance | Active guardrail rules and thresholds |
| 13 | Macro-Economics | Latest month macro conditions by region |
| 14 | Supplier Performance | Suppliers with highest lead-time variance |
| 15 | Forward Planning | 13-week forward forecast for West Coast |

---

## 8. Validation & Testing

| Check | Result |
|-------|--------|
| `cortex reflect` YAML validation | Passed |
| Cortex Analyst API — "Net sales by department" | Correct SQL with scenario_id IS NULL filter |
| Cortex Analyst API — "OTIF rate by supplier country" | Correct multi-table join with metric formula |
| Cortex Analyst API — "Demand driver decomposition for heatwave scenario" | Correct scenario filter with all 5 driver columns |

---

## 9. Design Principles Applied

- **Data Dictionary-Driven**: Every column description incorporates the Cortex AI Semantic Notes from the source data dictionary, ensuring formulas, thresholds, and interpretation guidance are embedded at the column level.
- **SME-Grade Synonyms**: 2-5 natural language alternatives per column (e.g., "out of stock", "oos", "stocked out" all resolve to `STOCKOUT_FLAG`) for robust question understanding.
- **Enumerated Values**: Key categorical dimensions include `sample_values` and `is_enum: true` to constrain Cortex Analyst to valid filter values.
- **Guard-railed AI**: Custom instructions encode governance rules directly, ensuring the AI agent respects business constraints (margin floors, discount caps, confidence thresholds) in its generated queries.
- **Scenario-Aware**: The model distinguishes 5 named demand scenarios from baseline data, enabling what-if analysis without polluting standard KPI reporting.

---

## 10. File Reference

| File | Location | Purpose |
|------|----------|---------|
| `DemandSensing_SemanticModel.yaml` | `C:\Users\2000167629\Vibe-Analytics-Phase3\` | The semantic model specification (ready for stage upload or Semantic View deployment) |
| `DemandSensing_SFHorizon_DDL_CORRECTED.sql` | Same folder | Corrected DDL for table creation and data loading |
| `Vibe_Analytics_Demand_Sensing_Data_Dictionary.xlsx` | Same folder | Source data dictionary (11 tabs) used as basis for semantic definitions |

---

*Generated for Vibe Analytics Phase 3 POC — Brightway Retail Demand Sensing Agentic AI Solution*
