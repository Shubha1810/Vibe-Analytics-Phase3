# Vibe Analytics — Demand Sensing: Skills Summary Tables

---

## Prebuilt Skills Summary

| Agent | Prebuilt Tool | Priority | Effort | Demand Sensing Use Case |
|-------|--------------|----------|--------|------------------------|
| Data Scientist + Predictive Agent | Code Execution | **CRITICAL** | Low (enable) | Run demand driver decomposition math in-loop: seasonal decomposition, driver attribution (weather_pp + promo_pp + competitor_pp + digital_pp + residual_pp), confidence interval calculations for 13-week forward projections, scenario overlay simulations |
| Root Cause Analysis Agent | Code Execution | **CRITICAL** | Low (enable) | Quantitative waterfall decomposition across sub-categories (Salads +35%, Berries +31%, Stone Fruit +24%), store-cluster contribution analysis, counterfactual validation ("remove weather signal — is residual within normal bounds?") |
| Visualization Agent | Data to Chart | **HIGH** | Low (re-enable) | Morning Signal Pack visualizations (deviation heatmaps, driver waterfall charts, 13-week forecast fans with P10/P90 bands), promotional lift bar charts, inventory days-of-supply gauges |
| Master + Insight Narration Agent | Web Search | **HIGH** | Low (enable + account config) | External context enrichment for the EXPLAIN and COMMUNICATE steps: weather forecast validation (NWS data), competitor news (retailer stockout reports), social media trend verification (viral product confirmation), commodity price indices |
| Persona Context Agent | MCP Connector | **MEDIUM** | Medium (configure MCP server) | Pull active planning cycles from Blue Yonder API, Jira tickets for open replenishment actions, Teams/Slack context for David Park's supply escalations — enrich persona scope beyond "which department do you own" to "what are you actively working on this week" |
| Trend Discovery Agent | Code Execution | **HIGH** | Low (enable) | Time-series decomposition (STL) on NRF 4-4-5 fiscal calendar, changepoint detection for demand regime shifts, moving average calculations for 7-day/28-day baselines, holiday effect quantification, Google Trends score correlation analysis |

---

## Custom Skills Summary

| Agent | Custom Skill | Priority | Effort | Purpose |
|-------|-------------|----------|--------|---------|
| Master Agent | `morning_signal_pack` | **CRITICAL** | High | Orchestrate the overnight autonomous scan: portfolio-wide anomaly detection across 14,400 SKU-store combinations, impact ranking by revenue at stake, cross-departmental awareness surfacing, and persona-tailored Morning Signal Pack presentation before the user types anything |
| Root Cause Analysis Agent | `demand_driver_attribution` | **CRITICAL** | Medium | Systematic decomposition of demand deviations into the 5 causal driver signals (weather, promo, competitor, digital, residual) with multi-collinearity checks, dampening logic, sub-category and store-cluster drill-downs, and counterfactual validation |
| Predictive Agent | `demand_scenario_projector` | **HIGH** | Medium | Project demand forward under multiple scenarios using the 5 pre-defined scenario overlays (fresh_produce_heatwave, viral_speaker_spike, patio_furniture_drop, artisan_bread_dip, premium_yogurt_lift) + custom what-if parameters, with P10/P90 confidence bands and sensitivity analysis |
| Prescriptive Agent | `demand_action_recommender` | **HIGH** | Medium | Generate guardrail-compliant, persona-routed recommendations with projected revenue impact, confidence scores, urgency classification, and approval routing — validated against DIM_GUARDRAILS (8 active rules: gross_margin ≥ 18%, discount ≤ 40%, confidence ≥ 0.6) and output matching FACT_RECOMMENDATIONS schema |
| BA Orchestrator | `six_layer_demand_analysis` | **HIGH** | Low | Demand-specific analytical structure mapping to the storyboard flow: Scope → Describe → Diagnose → Project → Prescribe → Validate, with demand-specific KPIs at each layer (stockout rate, MAPE, days of supply, lost sales revenue, OTIF rate) |
| Feature Enhancement Agent | `demand_kpi_derivation` | **MEDIUM** | Low | Consistent rules for deriving demand sensing composite KPIs: lost_revenue (lost_units × regular_price), sell_through_rate (units_sold/on_hand), MAPE (avg(abs_pct_error)), forecast_bias, net_promo_lift (lift − cannibalization), effective_coverage (ending_on_hand + on_order + in_transit), demand_deviation identity |
| Trend Discovery Agent | `demand_seasonality_detector` | **MEDIUM** | Medium | Detect demand patterns on the NRF 4-4-5 fiscal calendar with holiday effects (Thanksgiving, Christmas, 4th July, Memorial Day), weather_condition seasonal correlation, fiscal_week-based YoY comparison rules — never using YEAR()/QUARTER() on transaction_date |
| Validation Agent | `demand_cross_validator` | **MEDIUM** | Low | Validate analytical outputs against domain rules: 5-driver attribution identity check (must sum to demand_deviation_pct), guardrail threshold validation (8 rules from DIM_GUARDRAILS), scenario_id filtering verification, censored vs uncensored demand consistency (units_sold ≤ actual_demand_units when stockout_flag = TRUE) |
| Insight Narration Agent | `persona_storyboard` | **MEDIUM** | Medium | Generate persona-tailored narratives: Sarah gets sub-category detail + action windows; David gets supply chain impact + replenishment triggers; Lisa gets enterprise roll-up + S&OP talking points — with communication style guide, urgency language framework, and cross-departmental awareness format |
| Data Gathering Agent | `demand_signal_profiler` | **LOW** | Medium | Profile the demand signal repository: check signal freshness (last refresh timestamp), null rates on external signals (weather, competitor, digital), scenario coverage completeness, store-SKU combination validation, and date range verification against NRF calendar |
