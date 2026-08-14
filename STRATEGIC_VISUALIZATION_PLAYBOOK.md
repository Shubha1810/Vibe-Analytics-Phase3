# Strategic Visualization Playbook — Demo-Ready D3 Charts

## Context

This document maps **10 high-impact, complex visualization types** to specific questions you can ask the INTERACTIVE_DEMANDSENSING_AGENT in the demo. Each visualization is designed to flex D3.js capabilities beyond standard bar/line charts, grounded in the actual data (450 SKUs, 41 stores, 7 regions, 5 scenarios, 16M+ demand rows, 535K forecast rows, 7K promos, 16K POs).

---

## 1. Signal Attribution Waterfall

**Question:** "Diagnose the Fresh Produce anomaly in the Southeast and South-Central regions. Decompose the +28% deviation into signal-by-signal attribution."

**What it shows:** Floating bars building from 0 → Weather (+12.2pp) → Promo (+6.8pp) → Competitor (+4.1pp) → Digital (+2.7pp) → Residual (+1.4pp) → Total (+27.5pp). Each bar starts where the previous one ended.

**Why it flexes:** Waterfall with y/y2 encoding, connector lines, color-coded segments (blue=positive, green=total), animated entry. Shows additive decomposition — the gold standard for attribution storytelling.

**Data source:** `fresh_produce_heatwave` scenario, driver_*_pp columns averaged across SE + South-Central.

---

## 2. Forecast Confidence Funnel (Area with P10/P90 Bands)

**Question:** "What is the 13-week forward forecast for the West Coast region? Show confidence bands."

**What it shows:** A line chart with P10/P90 shaded area bands fanning out as the horizon increases (week 1 = tight, week 13 = wide). Central line = consensus forecast, with upper/lower bounds creating a "funnel of uncertainty."

**Why it flexes:** Gradient-filled area between two lines, temporal x-axis, increasing uncertainty visualization. Demonstrates probabilistic forecasting communication.

**Data source:** `FACT_FORECAST` where `forecast_type = 'forward_projection'` AND `region = 'West Coast'`. Fields: `forecast_units`, `forecast_lower_units`, `forecast_upper_units`, `horizon_week`.

---

## 3. Dual-Axis Lost Revenue vs Stockout Rate (Bar + Point)

**Question:** "What Demand risks do we observe in Fresh & Grocery this week?"

**What it shows:** Horizontal bars for lost revenue by sub-category (left x-axis, $), with red dots overlaid showing stockout rate % (top x-axis, independent scale). Sorted by revenue impact.

**Why it flexes:** Independent dual x-axis rendering, two mark types on same y-axis, diverging visual encoding. Shows both magnitude (dollars) and breadth (rate) in one view.

**Data source:** `FACT_DEMAND_DAILY` latest fiscal week, grouped by `category_l3`, computing `SUM(lost_sales_units_est * regular_price)` and `AVG(stockout_flag)`.

---

## 4. Scenario Comparison Diverging Bar

**Question:** "How does the viral speaker spike scenario compare to baseline for Consumer Electronics?"

**What it shows:** Diverging horizontal bar chart — baseline metrics on the left (negative axis), scenario metrics on the right (positive axis). Metrics: units sold, revenue, lost sales. Center axis = 0 (parity). Bars extend left or right depending on which scenario is higher.

**Why it flexes:** Diverging bars with bidirectional encoding, center reference line, positive/negative color split. Visually answers "what changes under this scenario?" in one glance.

**Data source:** `FACT_DEMAND_DAILY` where `scenario_id IN ('viral_speaker_spike', NULL)` AND `department = 'Consumer Electronics'`. The viral spike shows +84.7% deviation, $1.85M revenue impact.

---

## 5. Supplier Reliability Heatmap

**Question:** "Show me the OTIF rate and fill rate by supplier and transport mode as a heatmap."

**What it shows:** Grid of 25 suppliers × 5 transport modes, cells colored by OTIF rate (sequential blue scale). Values displayed inside cells. Red border on cells below 85% threshold.

**Why it flexes:** Rect-based heatmap with cell-level text annotations, threshold highlighting, two-axis categorical layout. Dense information display — 125 cells in one view.

**Data source:** `FACT_SUPPLY_CHAIN` joined to `DIM_SUPPLIER`. Group by `supplier_name` × `transport_mode`, compute `AVG(CASE WHEN otif_flag THEN 1 ELSE 0 END)`.

---

## 6. Multi-Series Time Trend with Changepoint Annotations

**Question:** "Show me the demand deviation trend for Fresh & Grocery perishables over the last 13 fiscal weeks. Highlight any significant shifts."

**What it shows:** Multi-line chart (one line per top-5 sub-category), with vertical annotation rules marking the start of the heatwave scenario (Jul 10) and changepoint detection. Dots on hover, smooth interpolation, animated line drawing.

**Why it flexes:** Animated multi-series with per-series legend, vertical reference lines with labels, temporal axis, curve interpolation. Tells the trend story with event context.

**Data source:** `FACT_DEMAND_DAILY` baseline, grouped by `fiscal_week` × `category_l3`, for perishable sub-categories. Last 13 weeks of `AVG(demand_deviation_pct)`.

---

## 7. Stacked Driver Attribution by Sub-Category

**Question:** "Break down the demand deviation by driver for each Fresh & Grocery sub-category."

**What it shows:** Horizontal stacked bars — each sub-category has a bar divided into Weather, Promo, Competitor, Digital, Residual segments. Sorted by total deviation. Color legend at top.

**Why it flexes:** True stacked bar with color-per-series, per-segment tooltips, animated segment-by-segment entry. Shows composition AND comparison simultaneously.

**Data source:** `FACT_DEMAND_DAILY` latest week, baseline, `department = 'Fresh & Grocery'`. Aggregate `AVG(driver_*_pp)` per `category_l3`.

---

## 8. KPI Bullet/Gauge Chart

**Question:** "What's our forecast accuracy and supply chain health vs targets?"

**What it shows:** Horizontal bullet charts for key KPIs: MAPE (actual vs 20% target), OTIF rate (72.4% vs 85% target), Fill rate (93.4% vs 95% target), Stockout rate (25.5% vs 5% target). Background bands show poor/acceptable/good zones.

**Why it flexes:** Custom bullet chart renderer — no standard library supports this natively. Background zones + actual bar + target marker. Immediately shows which KPIs are breaching guardrails.

**Data source:** Derived from multiple tables: `FACT_FORECAST` for MAPE, `FACT_SUPPLY_CHAIN` for OTIF/fill rate, `FACT_DEMAND_DAILY` for stockout rate. Thresholds from `DIM_GUARDRAILS`.

---

## 9. Promotional ROI Scatter with Quadrant Annotations

**Question:** "Show me promotional effectiveness — plot lift vs ROI for the top 20 promotions, colored by promo type."

**What it shows:** Scatter plot with `promo_lift_pct` on x-axis, `promo_roi` on y-axis. Points colored by `promo_type` (% Off, BOGO, Multi-buy, etc.). Four quadrant lines at median values creating "High Lift/High ROI", "High Lift/Low ROI", etc. zones.

**Why it flexes:** Scatter with color grouping, quadrant annotation lines (both horizontal and vertical reference rules), animated dot entry with size encoding, hover revealing promo name.

**Data source:** `FACT_PROMOTIONS` joined to `DIM_PRODUCT`. Top 20 by `promo_roi`. Fields: `promo_lift_pct`, `promo_roi`, `promo_type`, `promo_name`.

---

## 10. Recommendation Impact Lollipop (Dot + Line)

**Question:** "Show all active AI recommendations ranked by projected revenue impact."

**What it shows:** Lollipop chart — thin horizontal lines from 0 to each recommendation's projected impact, with a circle at the end. Color: green for "Capture upside", red for "Mitigate downside". Labels: scenario name + urgency badge. Guardrail status icon (✓ for PASS, ⚠ for Blocked).

**Why it flexes:** Lollipop is a custom chart type (line + circle for each row) — visually cleaner than bars for sparse data. Shows directionality (positive/negative from 0), urgency, and governance compliance in one view.

**Data source:** `FACT_RECOMMENDATIONS` — 5 rows. Fields: `recommendation_id`, `projected_revenue_impact_usd`, `action_type`, `urgency`, `guardrail_status`, `scenario_id`.

---

## Demo Sequencing Recommendation

| # | Question Theme | Viz Type | Wow Factor |
|---|---|---|---|
| 1 | "What risks do we see in Fresh & Grocery?" | Dual-axis bar + point | Opens strong — shows breadth |
| 2 | "Diagnose the anomaly — decompose the drivers" | Waterfall | The signature chart |
| 3 | "Show the 13-week forward forecast with confidence" | Area with P10/P90 bands | Uncertainty communication |
| 4 | "Compare viral speaker spike to baseline" | Diverging bar | Scenario comparison |
| 5 | "Show supplier reliability" | Heatmap | Dense operational view |
| 6 | "What are all the AI recommendations?" | Lollipop | Governance + action |
| 7 | "Show promo effectiveness" | Scatter with quadrants | Advanced analytics |
| 8 | "Trend over 13 weeks with changepoints" | Multi-line + annotations | Temporal storytelling |

---

## Implementation Status

| Viz Type | D3Chart Renderer | Status |
|---|---|---|
| Waterfall (y/y2) | `renderWaterfallChart` | ✅ Built |
| Stacked Bar | `renderStackedBar` | ✅ Built |
| Dual-axis Bar + Line/Point | `renderBarChart` (layered) | ✅ Built |
| Horizontal Bar | `renderBarChart` (isHorizontal) | ✅ Built |
| Line (multi-series) | `renderLineChart` | ✅ Built |
| Area (gradient) | `renderAreaChart` | ✅ Built |
| Heatmap | `renderHeatmap` | ✅ Built |
| Scatter | `renderScatterChart` | ✅ Built |
| Forecast Funnel (P10/P90) | Needs `renderAreaChart` with y2 | 🔨 Extend area renderer |
| Bullet/Gauge | `renderBulletChart` | 🔨 New renderer needed |
| Lollipop | `renderLollipopChart` | 🔨 New renderer needed |
| Diverging Bar | `renderBarChart` with negative axis | 🔨 Extend bar renderer |
| Scatter + Quadrant Lines | `renderScatterChart` + annotations | 🔨 Extend scatter renderer |

---

## Key Insight

The agent already generates the **data** for all 10 visualizations — the SQL queries produce the right numbers. The gap is only in:
1. **Agent choosing the right chart type** (solved via skill instructions)
2. **D3Chart handling the spec pattern** (partially solved, 4 extensions needed)

The 8 already-built renderers cover ~70% of demo scenarios. The remaining 4 extensions (funnel, bullet, lollipop, diverging) are each ~60-80 lines of D3 code.
