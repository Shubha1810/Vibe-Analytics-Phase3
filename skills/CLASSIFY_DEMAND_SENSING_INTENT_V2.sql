-- ====================================================================
-- CLASSIFY_DEMAND_SENSING_INTENT V2
-- Enhanced intent classifier for INTERACTIVE_DEMANDSENSING_AGENT
--
-- Changes from V1:
--   1. Added 3 new intents: DETECT, BENCHMARK, RECOVERY_ECONOMICS
--   2. Restructured priority order to prevent mis-routing
--   3. Enhanced fuzzy matching with phonetic/typo coverage
--   4. Context-dependent confidence penalty for pronouns ("that", "those")
--   5. Reduced over-aggressive entity penalty (-0.15 instead of -0.30)
--   6. "changed" moved from trend_signals to detect_signals
--   7. "rank" + action context routes to RECOMMENDATION not COMPARISON
--   8. "forecast error" in projection context routes to PREDICTION
-- ====================================================================

CREATE OR REPLACE FUNCTION DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.CLASSIFY_DEMAND_SENSING_INTENT("QUESTION" VARCHAR)
RETURNS VARIANT
LANGUAGE PYTHON
RUNTIME_VERSION = '3.11'
HANDLER = 'classify_intent'
AS '
import json
import re

def classify_intent(question):
    if not question:
        return {"intent": "DATA_QUERY", "confidence": 0.30, "entities": {"departments": [], "regions": [], "scenarios": [], "personas": [], "metrics": []}, "corrections": [], "needs_clarification": True, "recommended_chart": "bar", "viz_rationale": "Default bar chart", "sub_tasks": [], "kpis": []}

    q = question.lower().strip()

    # --- ENHANCED FUZZY MATCHING ---
    fuzzy_map = {
        # Departments and categories
        "fresh produce": "Fresh Produce", "fresh prod": "Fresh Produce", "produce": "Fresh Produce",
        "frsh": "Fresh Produce", "freash": "Fresh Produce", "fres": "Fresh Produce",
        "bakery": "Bakery", "bread": "Bakery", "baked goods": "Bakery", "bakry": "Bakery",
        "dairy": "Dairy", "yogurt": "Dairy", "milk": "Dairy", "yoghurt": "Dairy",
        "electronics": "Consumer Electronics", "tech": "Consumer Electronics", "gadgets": "Consumer Electronics",
        "electonics": "Consumer Electronics", "elecrtonics": "Consumer Electronics", "elec": "Consumer Electronics",
        "seasonal": "Seasonal & Home", "patio": "Seasonal & Home", "furniture": "Seasonal & Home",
        "garden": "Seasonal & Home", "seasonl": "Seasonal & Home",
        # Scenarios
        "heatwave": "fresh_produce_heatwave", "heat wave": "fresh_produce_heatwave", "heat": "fresh_produce_heatwave",
        "viral speaker": "viral_speaker_spike", "speaker spike": "viral_speaker_spike",
        "patio drop": "patio_furniture_drop", "furniture drop": "patio_furniture_drop",
        "bread dip": "artisan_bread_dip", "artisan bread": "artisan_bread_dip",
        "yogurt lift": "premium_yogurt_lift", "premium yogurt": "premium_yogurt_lift",
        # Metric shorthands and typos
        "stockout": "stockout", "stock out": "stockout", "oos": "stockout", "out of stock": "stockout",
        "stokout": "stockout", "stock-out": "stockout",
        "fillrate": "fill_rate", "fill-rate": "fill_rate", "filrate": "fill_rate",
        "leadtime": "lead_time", "lead-time": "lead_time", "ledtime": "lead_time",
        "dos": "days_of_supply", "days supply": "days_of_supply", "daysupply": "days_of_supply",
        "otif": "otif_rate", "on time in full": "otif_rate", "ontiminfull": "otif_rate",
        "mape": "forecast_accuracy", "forecast error": "forecast_accuracy", "forcast": "forecast_accuracy",
        # Intent-related paraphrases
        "whats going on": "what changed", "what is going on": "what changed",
        "whats happening": "what changed", "what is happening": "what changed",
        "give me the lay of the land": "what changed", "status update": "what changed",
        "morning brief": "morning update", "daily brief": "morning update",
        "break down": "decompose", "breakdown": "decompose", "drill into": "decompose",
        "deep dive": "decompose", "unpack": "decompose",
        "year on year": "year over year", "y-o-y": "year over year", "y/y": "year over year",
        "month on month": "month over month", "m-o-m": "month over month", "m/m": "month over month",
        "quarter on quarter": "quarter over quarter", "q-o-q": "quarter over quarter", "q/q": "quarter over quarter",
        "how much can i save": "how much can i capture", "whats at stake": "how much can i capture",
        "cost of waiting": "delay cost", "cost of inaction": "delay cost",
    }

    corrected_entities = []
    for misspell, correct in fuzzy_map.items():
        if misspell in q:
            corrected_entities.append({"original": misspell, "corrected": correct})
            q = q.replace(misspell, correct.lower())

    # --- ENTITY DETECTION ---
    departments = []
    dept_map = {
        "fresh": "Fresh & Grocery", "grocery": "Fresh & Grocery", "produce": "Fresh & Grocery",
        "bakery": "Fresh & Grocery", "dairy": "Fresh & Grocery", "milk": "Fresh & Grocery",
        "cold beverage": "Fresh & Grocery", "perishable": "Fresh & Grocery",
        "electronics": "Consumer Electronics", "tech": "Consumer Electronics",
        "speaker": "Consumer Electronics", "laptop": "Consumer Electronics", "headphone": "Consumer Electronics",
        "seasonal": "Seasonal & Home", "home": "Seasonal & Home", "patio": "Seasonal & Home",
        "furniture": "Seasonal & Home", "garden": "Seasonal & Home", "outdoor": "Seasonal & Home"
    }
    for keyword, dept in dept_map.items():
        if keyword in q and dept not in departments:
            departments.append(dept)

    regions = []
    for r in ["Northeast", "Southeast", "Midwest", "Southwest", "West Coast",
              "Mid-Atlantic", "South-Central", "National"]:
        if r.lower() in q:
            regions.append(r)

    scenarios = []
    scenario_names = ["fresh_produce_heatwave", "viral_speaker_spike", "patio_furniture_drop",
                      "artisan_bread_dip", "premium_yogurt_lift"]
    for s in scenario_names:
        if s.replace("_", " ") in q or s in q:
            scenarios.append(s)

    personas = []
    persona_map = {
        "sarah": "Sarah Mitchell", "fresh manager": "Sarah Mitchell",
        "mark": "Mark Thompson", "electronics manager": "Mark Thompson",
        "emily": "Emily Carter", "seasonal manager": "Emily Carter",
        "david": "David Park", "supply chain": "David Park",
        "lisa": "Lisa Hayes", "vp": "Lisa Hayes", "s&op": "Lisa Hayes",
        "executive": "Lisa Hayes", "director": "Lisa Hayes"
    }
    for keyword, persona in persona_map.items():
        if keyword in q and persona not in personas:
            personas.append(persona)

    metrics = []
    metric_keywords = {
        "stockout": "stockout_rate", "out of stock": "stockout_rate",
        "lost sales": "lost_sales_revenue", "lost revenue": "lost_sales_revenue",
        "days of supply": "days_of_supply", "dos": "days_of_supply", "inventory": "days_of_supply",
        "fill rate": "fill_rate", "fulfillment": "fill_rate",
        "otif": "otif_rate", "on time": "otif_rate",
        "forecast": "forecast_accuracy", "mape": "forecast_accuracy", "bias": "forecast_accuracy",
        "deviation": "demand_deviation", "anomaly": "demand_deviation",
        "exposure": "demand_deviation", "risk": "demand_deviation",
        "driver": "demand_drivers", "weather": "demand_drivers", "promo": "demand_drivers",
        "competitor": "demand_drivers", "digital": "demand_drivers",
        "margin": "gross_margin", "profit": "gross_margin",
        "sell through": "sell_through_rate", "sell-through": "sell_through_rate",
        "lead time": "lead_time", "replenishment": "lead_time",
        "revenue": "revenue", "sales": "revenue",
        "demand": "demand_units", "units": "demand_units",
        "shrinkage": "shrinkage", "waste": "shrinkage",
        "recover": "recovery_economics", "capture": "recovery_economics",
        "delay cost": "recovery_economics", "erosion": "recovery_economics",
    }
    for keyword, metric in metric_keywords.items():
        if keyword in q and metric not in metrics:
            metrics.append(metric)

    # --- INTENT CLASSIFICATION ---
    # Priority order matters: most specific first, broadest last.

    intent = "DATA_QUERY"
    confidence = 0.70

    # Signal groups — order of checking determines priority
    driver_signals = ["driver", "attribution", "weather impact", "promo impact",
                      "competitor effect", "digital signal", "decompose",
                      "multicollinearity", "collinearity", "confidence per driver",
                      "signal by signal", "by signal"]

    recovery_signals = ["already safe", "already secured", "still capture",
                        "can i capture", "can i still", "capture today",
                        "delay cost", "cost of delay", "cost of waiting",
                        "day of delay", "each day", "erosion",
                        "recoverable", "forfeited", "window closes",
                        "how much is already", "how much can i"]

    scenario_signals = ["scenario", "what-if", "what if", "overlay",
                        "under the heatwave", "under the spike",
                        "under the dip", "under the lift"]

    forecast_accuracy_signals = ["mape", "forecast accuracy", "forecast error",
                                 "bias", "over-forecast", "under-forecast",
                                 "accuracy by"]

    lost_sales_signals = ["lost sales", "lost revenue", "missed demand",
                          "stockout cost", "censored demand"]

    root_cause_signals = ["why", "root cause", "explain", "reason",
                          "what caused", "what is causing", "contributing",
                          "diagnose", "diagnosis"]

    detect_signals = ["what changed", "what happened", "what is new",
                      "what moved", "what shifted", "where is risk",
                      "risk concentrated", "risk exposure", "risk overview",
                      "risk register", "current week", "this week",
                      "anomalies", "anomaly", "morning update",
                      "signal pack", "summarize", "summary",
                      "what should i worry", "portfolio"]

    benchmark_signals = ["benchmark", "abnormal", "normal",
                         "seasonal", "same week last year", "same month last year",
                         "same quarter last year", "year over year",
                         "month over month", "quarter over quarter",
                         "is that typical", "is this typical",
                         "is that unusual", "is this unusual",
                         "compared to last year", "leakage",
                         "outgrowing", "versus last year"]

    trend_signals = ["trend", "over time", "weekly pattern", "fiscal week by",
                     "improving", "declining", "trajectory",
                     "time series", "trending"]

    prediction_signals = ["project", "predict", "projection", "forward",
                          "next week", "next quarter", "next 13 weeks",
                          "weeks out", "forecast band", "confidence band",
                          "untrustworthy", "growth or contraction"]

    comparison_signals = ["compare", "versus", "difference between",
                          "better than", "worse than"]

    recommendation_signals = ["should", "recommend", "optimize", "improve",
                              "action", "strategy", "what can we do",
                              "next steps", "intervention", "options",
                              "deliver inside"]

    perishable_signals = ["perishable", "shelf life", "expiry", "shrinkage",
                          "waste", "fresh risk", "freshness"]

    replenishment_signals = ["replenishment", "reorder", "otif",
                             "fill rate", "lead time", "supplier",
                             "purchase order"]

    # --- Priority chain: most specific intent first ---

    if any(s in q for s in driver_signals):
        intent = "DEMAND_DRIVER_ATTRIBUTION"
        confidence = 0.85

    elif any(s in q for s in recovery_signals):
        intent = "RECOVERY_ECONOMICS"
        confidence = 0.85

    elif any(s in q for s in forecast_accuracy_signals) and not any(s in q for s in prediction_signals):
        # Only match FORECAST_ACCURACY if no prediction signals present
        intent = "FORECAST_ACCURACY"
        confidence = 0.85

    elif any(s in q for s in lost_sales_signals):
        intent = "LOST_SALES_ANALYSIS"
        confidence = 0.85

    elif any(s in q for s in root_cause_signals):
        intent = "ROOT_CAUSE"
        confidence = 0.80

    elif any(s in q for s in detect_signals):
        intent = "DETECT"
        confidence = 0.85

    elif any(s in q for s in benchmark_signals):
        intent = "BENCHMARK"
        confidence = 0.85

    elif any(s in q for s in prediction_signals):
        intent = "PREDICTION"
        confidence = 0.85

    elif any(s in q for s in trend_signals):
        intent = "TREND_ANALYSIS"
        confidence = 0.85

    elif any(s in q for s in recommendation_signals):
        intent = "RECOMMENDATION"
        confidence = 0.80

    elif any(s in q for s in comparison_signals):
        intent = "COMPARISON"
        confidence = 0.85

    elif any(s in q for s in perishable_signals):
        intent = "PERISHABLE_RISK"
        confidence = 0.85

    elif any(s in q for s in replenishment_signals):
        intent = "REPLENISHMENT_HEALTH"
        confidence = 0.80

    elif any(s in q for s in ["risk", "at risk", "vulnerability", "critical", "alert", "severity"]):
        intent = "RISK_ASSESSMENT"
        confidence = 0.80

    elif any(s in q for s in ["kpi", "scorecard", "performance", "overview"]):
        intent = "OPERATIONAL_KPI"
        confidence = 0.80

    # --- SPECIAL COMPOUND CHECKS ---
    # "rank" + recommendation context = RECOMMENDATION, not COMPARISON
    if "rank" in q and any(s in q for s in ["intervention", "option", "action", "return", "supplier"]):
        intent = "RECOMMENDATION"
        confidence = 0.80

    # "forecast error" + projection context = PREDICTION, not FORECAST_ACCURACY
    if any(s in q for s in ["forecast error", "forecast accuracy"]) and any(s in q for s in ["project", "weeks out", "forward", "confidence band"]):
        intent = "PREDICTION"
        confidence = 0.85

    # "heatwave"/"scenario" + recovery language = RECOVERY_ECONOMICS, not SCENARIO_ANALYSIS
    if any(s in q for s in ["heatwave", "scenario", "spike"]) and any(s in q for s in recovery_signals):
        intent = "RECOVERY_ECONOMICS"
        confidence = 0.85

    # --- CONFIDENCE ADJUSTMENTS ---

    # Context-dependent pronoun penalty: "that X", "those X", "it" referencing prior context
    context_pronouns = re.findall(r"\b(that|those|its|the same)\b\s+\w+", q)
    has_context_dependency = len(context_pronouns) > 0 and not any(
        s in q for s in ["that is", "that are", "that means", "that way"]
    )
    if has_context_dependency:
        confidence -= 0.20

    # No-entity penalty (lighter than V1: -0.15 instead of -0.30)
    if not metrics and not departments and not regions and not scenarios:
        confidence -= 0.15

    confidence = max(confidence, 0.30)

    # --- VISUALIZATION RECOMMENDATION ---
    intent_to_chart = {
        "DETECT": "lollipop",
        "BENCHMARK": "grouped_bar",
        "RECOVERY_ECONOMICS": "waterfall",
        "DEMAND_DRIVER_ATTRIBUTION": "waterfall",
        "TREND_ANALYSIS": "line",
        "COMPARISON": "grouped_bar",
        "FORECAST_ACCURACY": "dual_axis",
        "RISK_ASSESSMENT": "bullet_kpi",
        "SCENARIO_ANALYSIS": "diverging_bar",
        "LOST_SALES_ANALYSIS": "bar",
        "OPERATIONAL_KPI": "bullet_kpi",
        "PERISHABLE_RISK": "heatmap",
        "REPLENISHMENT_HEALTH": "heatmap",
        "ROOT_CAUSE": "waterfall",
        "PREDICTION": "forecast_fan",
        "RECOMMENDATION": "lollipop",
        "DATA_QUERY": "bar",
    }

    intent_to_rationale = {
        "DETECT": "Lollipop ranks anomalies by exposure magnitude for quick triage",
        "BENCHMARK": "Grouped bars compare current vs prior-year periods side by side",
        "RECOVERY_ECONOMICS": "Waterfall decomposes total at risk into secured, recoverable, and forfeited",
        "DEMAND_DRIVER_ATTRIBUTION": "Waterfall shows how each driver contributes cumulatively to total deviation",
        "TREND_ANALYSIS": "Line chart reveals temporal patterns and inflection points",
        "COMPARISON": "Grouped bars enable side-by-side metric comparison across categories",
        "FORECAST_ACCURACY": "Dual-axis overlays actual vs forecast with error rate on secondary axis",
        "RISK_ASSESSMENT": "Bullet chart shows KPIs against target thresholds at a glance",
        "SCENARIO_ANALYSIS": "Diverging bars compare baseline vs scenario bidirectionally",
        "LOST_SALES_ANALYSIS": "Bar chart ranks categories by revenue impact magnitude",
        "OPERATIONAL_KPI": "Bullet chart visualizes performance vs guardrail thresholds",
        "PERISHABLE_RISK": "Heatmap reveals SKU x store risk concentration patterns",
        "REPLENISHMENT_HEALTH": "Heatmap surfaces supplier x metric performance matrix",
        "ROOT_CAUSE": "Waterfall decomposes total deviation into additive driver contributions",
        "PREDICTION": "Fan chart shows forecast with expanding confidence intervals",
        "RECOMMENDATION": "Lollipop ranks actions by projected impact with directionality",
        "DATA_QUERY": "Bar chart provides clear magnitude comparison",
    }

    intent_to_subtasks = {
        "DETECT": ["Classify intent", "Query current-week risk register", "Rank by exposure and severity", "Generate ranked anomaly visualization"],
        "BENCHMARK": ["Classify intent", "Query current period metrics", "Query same-period-last-year metrics", "Compute period-over-period deltas", "Generate benchmark comparison visualization"],
        "RECOVERY_ECONOMICS": ["Classify intent", "Query risk recovery curve at day 0", "Compute secured vs recoverable vs forfeited", "Generate recovery waterfall visualization"],
        "DEMAND_DRIVER_ATTRIBUTION": ["Classify intent", "Query driver attribution data", "Compute running totals for waterfall", "Generate waterfall visualization"],
        "TREND_ANALYSIS": ["Classify intent", "Query time-series data by fiscal week", "Detect changepoints and patterns", "Generate trend line visualization"],
        "COMPARISON": ["Classify intent", "Query comparison metrics", "Rank and sort results", "Generate grouped bar visualization"],
        "FORECAST_ACCURACY": ["Classify intent", "Query MAPE and bias metrics", "Compare actual vs forecast", "Generate dual-axis visualization"],
        "RISK_ASSESSMENT": ["Classify intent", "Query risk KPIs", "Evaluate against guardrail thresholds", "Generate risk scorecard"],
        "SCENARIO_ANALYSIS": ["Classify intent", "Query baseline metrics", "Query scenario overlay metrics", "Generate scenario comparison visualization"],
        "LOST_SALES_ANALYSIS": ["Classify intent", "Query lost sales by category", "Rank by revenue impact", "Generate ranked bar visualization"],
        "ROOT_CAUSE": ["Classify intent", "Query demand deviation data", "Decompose into driver signals", "Generate attribution waterfall"],
        "PREDICTION": ["Classify intent", "Query forward projection data", "Extract confidence bounds", "Generate forecast fan visualization"],
        "RECOMMENDATION": ["Classify intent", "Query active interventions and recovery economics", "Rank by benefit-cost ratio", "Generate recommendation lollipop"],
        "OPERATIONAL_KPI": ["Classify intent", "Query KPI scorecard metrics", "Compare against targets", "Generate KPI bullet chart"],
        "PERISHABLE_RISK": ["Classify intent", "Query perishable inventory metrics", "Cross-reference shelf life vs DOS", "Generate risk heatmap"],
        "REPLENISHMENT_HEALTH": ["Classify intent", "Query supply chain metrics", "Evaluate OTIF and fill rate", "Generate supplier heatmap"],
        "DATA_QUERY": ["Classify intent", "Query data", "Analyze results", "Generate visualization"],
    }

    recommended_chart = intent_to_chart.get(intent, "bar")
    viz_rationale = intent_to_rationale.get(intent, "Standard bar chart for magnitude comparison")
    sub_tasks = intent_to_subtasks.get(intent, ["Classify intent", "Query data", "Analyze results", "Generate visualization"])

    # KPI mapping
    kpi_map = {
        "stockout_rate": "stockout_rate", "lost_sales_revenue": "lost_revenue_usd",
        "days_of_supply": "avg_days_of_supply", "fill_rate": "fill_rate_pct",
        "otif_rate": "otif_rate_pct", "forecast_accuracy": "mape_pct",
        "demand_deviation": "demand_deviation_pct", "demand_drivers": "driver_attribution_pp",
        "gross_margin": "gross_margin_pct", "revenue": "net_sales_amt",
        "demand_units": "actual_demand_units", "recovery_economics": "recoverable_value_usd",
    }
    relevant_kpis = [kpi_map.get(m, m) for m in metrics[:5]] if metrics else ["demand_deviation_pct", "stockout_rate", "days_of_supply"]

    return {
        "intent": intent,
        "confidence": round(confidence, 2),
        "entities": {
            "departments": departments,
            "regions": regions,
            "scenarios": scenarios,
            "personas": personas,
            "metrics": metrics
        },
        "corrections": corrected_entities,
        "needs_clarification": confidence < 0.40,
        "context_dependent": has_context_dependency,
        "recommended_chart": recommended_chart,
        "viz_rationale": viz_rationale,
        "sub_tasks": sub_tasks,
        "kpis": relevant_kpis,
    }
';
