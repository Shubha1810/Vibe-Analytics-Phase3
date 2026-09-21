# Autonomous Retail Intelligence Report — Complete Business Guide

**Brightway Retail | Vibe Analytics — Demand Sensing Edition**
*Comprehensive Walkthrough, Business Explanation & Client Reference*
*September 2026*

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Autonomous AI Personas](#2-autonomous-ai-personas)
3. [Autonomous Workflow](#3-autonomous-workflow)
4. [Demand Sensing Explanation](#4-demand-sensing-explanation)
5. [Visualization-by-Visualization Guide](#5-visualization-by-visualization-guide)
6. [Detect Stage](#6-detect-stage-deep-dive)
7. [Explain Stage](#7-explain-stage-deep-dive)
8. [Act Stage](#8-act-stage-deep-dive)
9. [Business Drivers Framework](#9-business-drivers-framework)
10. [How the AI Generates Insights](#10-how-the-ai-generates-insights)
11. [Value Realization for Brightway Retail](#11-value-realization-for-brightway-retail)
12. [Complete Client Narrative](#12-complete-client-narrative)

---

## 1. Executive Overview

### About Brightway Retail

Brightway Retail is a mid-sized, multi-department US retailer with approximately $2.2 billion in annual revenue, operating 40 stores across 7 regions (Northeast, Southeast, South-Central, Midwest, West Coast, Mid-Atlantic, National/eCommerce). With 28% of sales flowing through e-commerce, Brightway maintains a strong omnichannel presence.

The retailer operates across three demand-uncertainty-prone departments:

| Department | Characteristics | SKU Count | Key Challenge |
|---|---|---|---|
| **Fresh & Grocery** | Perishable, weather-sensitive, short replenishment cycles | ~180 SKUs | Spoilage risk, 3–7 day shelf lives |
| **Consumer Electronics** | High-value, supply-chain-sensitive, vulnerable to viral trends | ~140 SKUs | Stockout cost per unit is high, digital signal volatility |
| **Seasonal & Home** | Discretionary, event-driven, narrow selling windows | ~130 SKUs | Markdown risk if sell-through slows |

### The Business Challenge

Brightway's demand planners today rely on a traditional planning suite for baseline forecasting, supplemented by Excel spreadsheets, manual cross-referencing of weather data, competitor monitoring, and email-driven coordination. This approach has three structural problems:

**Reactive, not proactive.** By the time a planner identifies that Milk sales in the Southeast are running 28% above forecast, the stockout has already occurred. The data exists — POS feeds, weather forecasts, social media trends — but it takes 7–14 days of cross-functional analysis to assemble, diagnose, and act on it.

**Siloed, not connected.** Sarah (Fresh & Grocery) doesn't know that Mark's (Consumer Electronics) Portable Speaker viral spike is competing for the same expedited freight capacity she needs for her Milk replenishment. Each planner operates in their own silo until the conflict surfaces at S&OP — often too late.

**Descriptive, not prescriptive.** Traditional dashboards answer "what happened?" They do not answer "why did it happen?", "how long will it last?", or "what should I do about it?" — the questions that actually drive decisions.

### Why Autonomous Analytics

The Autonomous Retail Intelligence Report represents a fundamental shift from descriptive reporting to autonomous decision intelligence:

| Traditional Reporting | Autonomous Intelligence |
|---|---|
| Planner discovers anomaly manually | System detects anomaly before planner logs in |
| Root cause requires 3–5 days of investigation | Drivers decomposed instantly with confidence scores |
| Impact sizing requires spreadsheet modeling | Financial exposure quantified automatically |
| Recommendations rely on planner experience | Sized actions generated with cost-benefit ratios |
| Cross-department conflicts surface at S&OP | Contentions flagged proactively with trade-off analysis |
| 7–14 day cycle from detection to action | Single morning from detection to approval |

### Business Value Delivered

Based on the current week's data from Brightway Retail's demand signal repository:

- **927 anomalies** detected across 42 product categories in 7 regions
- **$3.9M in revenue exposure** identified and quantified
- **$2.5M recoverable** if acted on within the action window
- **$481K daily erosion** — every day of inaction costs nearly half a million dollars
- **16.4x average benefit-cost ratio** on recommended interventions

What used to take 7–14 days of cross-functional analysis is now delivered as a pre-built decision package before the Monday morning standup.

---

## 2. Autonomous AI Personas

The Autonomous Report is structured around three personas that mirror the actual roles in Brightway Retail's demand planning organization. Each persona sees a tailored view of the data, with insights and recommendations scoped to their decision authority and accountability.

### 2.1 Demand Planner — Detect & Explain

| Attribute | Detail |
|---|---|
| **Primary Objective** | Identify what changed across the portfolio and why it changed |
| **Key Stakeholders** | Sarah Mitchell (Fresh & Grocery), Mark Thompson (Consumer Electronics), Emily Carter (Seasonal & Home) |
| **Decision Ownership** | Forecast adjustments, promotion posture, markdown initiation, cross-department signal escalation |
| **Inputs Consumed** | POS data, weather feeds, competitor pricing, promotional calendars, digital/social trend signals, demand deviation heatmaps |
| **Outputs Produced** | Prioritized anomaly list, root cause attribution, demand trajectory projections, cross-department awareness signals |
| **Business Impact** | Reduces time-to-insight from 3–5 days to minutes; ensures forecast adjustments are grounded in quantified driver analysis, not intuition |

The Demand Planner owns **Steps 1 (Detect) and 2 (Explain)**. Their job is to answer two questions: "What just changed across my portfolio?" and "Why did it change?" Every visualization in their section is designed to move them from signal detection to root cause understanding in a single sitting.

### 2.2 Supply Planner — Predict & Act

| Attribute | Detail |
|---|---|
| **Primary Objective** | Translate demand signals into inventory actions within operational guardrails |
| **Key Stakeholders** | David Park (Supply Chain Planner) |
| **Decision Ownership** | Replenishment orders, expedited delivery, inter-store transfers, supplier sourcing changes |
| **Inputs Consumed** | Demand Planner's anomaly findings, stockout risk projections, recovery economics, supplier OTIF data, days-of-supply corridors |
| **Outputs Produced** | Sized replenishment orders, expedite recommendations, sourcing split decisions, inter-store transfer plans |
| **Business Impact** | Protects $2.5M in recoverable revenue this week at $18K intervention cost; reduces stockout rate from 15.1% toward the <5% target |

The Supply Planner owns **Steps 3 (Predict) and 4 (Act)**. Their job is to answer: "How long will this last, what's at risk, and exactly what should I order?" Every visualization in their section converts demand intelligence into actionable, costed supply decisions.

### 2.3 Director of Demand Planning — Communicate

| Attribute | Detail |
|---|---|
| **Primary Objective** | Resolve cross-department trade-offs and represent demand planning at S&OP |
| **Key Stakeholders** | Lisa Hayes (Director of Demand Planning) |
| **Decision Ownership** | Cross-department resource allocation, above-threshold approvals, strategic direction on category priorities |
| **Inputs Consumed** | Enterprise-wide anomaly roll-up, cross-department contentions, pending approval queue, financial summary across all departments |
| **Outputs Produced** | Approved action package for S&OP, cross-department resource allocation decisions, strategic guidance on conflicting priorities |
| **Business Impact** | Turns a 2-hour S&OP meeting into a 15-minute decision session; ensures cross-department conflicts are resolved with data, not politics |

The Director owns **Step 5 (Communicate)**. Their job is to answer: "What does leadership need to know, and what needs my signature?" The Executive Briefing Pack consolidates all three departments into one decision surface.

### How the Personas Form an Autonomous Decision Chain

```
Sarah / Mark / Emily          David                     Lisa
(Demand Planners)        (Supply Planner)          (Director)
       │                       │                       │
   DETECT ──→ EXPLAIN ──→ PREDICT ──→ ACT ──→ COMMUNICATE
       │                       │                       │
  "What changed?       "How long will        "What needs
   Why did it           it last? What          my signature?
   happen?"             should we order?"      What are the
                                               trade-offs?"
```

Each persona's output feeds the next persona's input. The Demand Planner's root cause analysis becomes the Supply Planner's justification for replenishment sizing. The Supply Planner's action recommendations become the Director's approval queue. The Director's decisions close the loop and feed back into the next cycle's detection thresholds.

---

## 3. Autonomous Workflow

### End-to-End Data Flow

```
DATA SOURCES                    SIGNAL PROCESSING               DEMAND SENSING
─────────────                   ─────────────────               ──────────────
POS / Sales Data ──────────┐
Inventory Position ────────┤
Promotional Calendar ──────┤    Signal Aggregation              Anomaly Detection
Weather Forecasts ─────────┼──→ Pattern Recognition  ──────→   Driver Attribution
Competitor Pricing ────────┤    Time-Series Analysis            Impact Quantification
Digital / Social Trends ───┤    Cross-Signal Correlation        Recovery Modeling
Supplier OTIF ─────────────┤
Seasonal Baselines ────────┘

         │                            │                              │
         ▼                            ▼                              ▼
     DETECT                       EXPLAIN                          ACT
     ──────                       ───────                          ───
  "What changed?"            "Why did it change?"         "What should we do?"
  927 anomalies              5 drivers decomposed         Sized recommendations
  ranked by $3.9M            with confidence scores       with cost-benefit ratios
  revenue impact             and attribution weights      and authority tagging

         │                            │                              │
         └────────────────────────────┴──────────────────────────────┘
                                      │
                                      ▼
                              BUSINESS OUTCOME
                              ────────────────
                        $2.5M protected this week
                        $481K/day erosion prevented
                        16.4x return on intervention cost
                        7-14 day analysis cycle → 1 morning
```

### Data Sources — What Feeds the System

**Historical Sales (POS):** 46,139 weekly records across 42 product categories and 7 regions. This is the baseline — actual demand against forecast, measured at the store-SKU-week grain. The system ingests the latest fiscal week (currently FW202624) and compares actuals against the Blue Yonder baseline forecast.

**Inventory Position:** Current on-hand units, safety stock levels, reorder points, days-of-supply, and in-transit quantities at the store-SKU level. This data determines whether a demand surge can be fulfilled or will result in a stockout.

**Promotional Calendar:** Active and upcoming promotions with planned lift factors, start/end dates, and store coverage. Promotions are a known demand driver — the system validates whether observed demand lifts are consistent with planned promotional effects or represent incremental demand.

**Weather Forecasts:** 14-day forward weather projections at the regional level. Weather is the single most predictable external demand driver for perishable categories. The system uses historical weather-demand elasticities (approximately 2.8% demand lift per degree above seasonal norm for produce categories) to separate weather-driven demand from other factors.

**Competitor Pricing & Availability:** Regional competitor pricing feeds and availability signals (stockout confirmations at nearby competitor stores via mobile location and web scraping data). Competitor stockouts create spillover demand — the system quantifies this using store-pair analysis.

**Digital / Social Trends:** Search volume indices, social media mention rates, and viral trend indicators for product categories. Digital signals are leading indicators — they often spike 3–7 days before POS data reflects the demand change. The system dampens digital signals by 15% when correlation with weather exceeds 0.5 to avoid double-counting.

**Supplier Performance:** On-time-in-full (OTIF) rates, lead-time variance, and open purchase order status by supplier. This data informs whether replenishment recommendations can be fulfilled by the primary supplier or require sourcing diversification.

**Seasonal Baselines:** Historical seasonal demand patterns by category, region, and week. The system uses year-over-year comparisons and trailing 4-week trends to separate genuine demand shifts from normal seasonal variation.

### How Signals Combine

The system does not treat each data source independently. A +28% demand deviation in Milk is not a single number — it is the sum of:

- **Weather contribution (+2.20pp):** Heat wave in the Southeast, 10°F above seasonal norm
- **Digital contribution (+5.21pp):** Viral smoothie recipe trend on social media
- **Promotion contribution (+1.46pp):** Active BOGO campaign amplifying organic demand
- **Competitor contribution (-0.17pp):** Competitor undercut on private-label dairy, slight volume pull
- **Residual (+0.30pp):** Unexplained variance within the statistical noise band

Each driver is quantified, confidence-scored, and checked for multicollinearity (e.g., weather and digital trends often correlate — the system dampens overlapping signals to avoid double-counting). The result is a fully decomposed, auditable explanation for every anomaly.

---

## 4. Demand Sensing Explanation

### What Is Demand Sensing?

Demand sensing is the capability to detect changes in consumer demand patterns as they happen — or ideally, before they impact business performance — using a combination of real-time signals (POS, weather, social, competitor) and predictive models.

Traditional forecasting asks: *"Based on history, what should demand be next week?"*

Demand sensing asks: *"Given what's happening right now — in weather, in social media, in competitor stores — how is demand actually changing, and what should we do about it?"*

### How Demand Sensing Differs from Forecasting

| Dimension | Traditional Forecasting | Demand Sensing |
|---|---|---|
| Time horizon | Weeks to months ahead | Days to 2 weeks, in-season |
| Data sources | Historical sales, seasonal patterns | Real-time POS + external signals (weather, digital, competitor) |
| Update frequency | Weekly or monthly batch | Continuous as signals refresh |
| Granularity | Category or department level | Store-SKU-day level |
| Response to change | Detects after the fact, adjusts next forecast | Detects in real time, triggers immediate action |
| Driver awareness | Assumes drivers are stable | Decomposes each deviation into contributing drivers |
| Output | Updated forecast number | Quantified anomaly + root cause + sized action |

### Real-World Examples

**Example 1: Weather-Driven Perishable Surge**

A heat wave grips the Southeast and South-Central US — temperatures running 10°F above seasonal average for 8 consecutive days. Traditional forecasting would not capture this because the baseline was set weeks ago under normal weather assumptions.

Demand sensing detects the pattern on Day 2 of the heat wave: Fresh Produce sales in Southeast stores are running 28% above forecast. By Day 3, the system has decomposed the deviation — 45% attributable to weather, 25% to an overlapping promotion, 15% to competitor spillover — and projected the trajectory forward: the spike holds for 5 more days while heat and promo overlap, then decays to +12% as the promo ends, settling near +6% by Day 14.

The Demand Planner sees this at 8:00 AM Monday. The Supply Planner has a sized replenishment order staged by 9:00 AM. The stores receive expedited delivery by Tuesday. Revenue is captured. Without demand sensing, the stockout would have occurred on Wednesday — $72K in lost sales for pre-cut salads alone.

**Example 2: Viral Social Media Spike**

A TikTok influencer posts a video featuring Brightway's Portable Bluetooth Speaker as an outdoor party essential. Search volume triples overnight. National digital trend indices spike 2.8x.

Traditional forecasting sees nothing — the baseline was set before the video went viral. Demand sensing detects the +67.6% national demand surge within 24 hours, flags it as CRITICAL severity with $33,880 at risk per region, and attributes it primarily to the Digital driver. The system also flags that this signal is likely short-lived (5–7 day decay typical for viral trends) and recommends expedited restock from existing DC inventory rather than a large new supplier PO.

**Example 3: Promotion-Induced Category Transfer**

Brightway launches a "Summer Fresh BBQ" BOGO promotion on grilling meats. The promotion drives planned lift on meats — but also creates unplanned demand transfer into complementary categories: salad kits (+15%), premium beverages (+12%), and disposable tableware (+8%).

Traditional reporting shows the meat promotion hitting plan. Demand sensing detects that three adjacent categories are deviating from forecast and traces the cause back to the promotion through basket-affinity analysis. The result: Sarah adjusts her forecast for all BBQ-adjacent categories, preventing stockouts on items that were not explicitly promoted but are benefiting from the traffic.

**Example 4: Low Inventory Creating Lost Sales Risk**

Artisan Breads in the Northeast have been running 15% below forecast for 3 consecutive days. Traditional reporting would wait until the weekly markdown review to address the surplus. Demand sensing detects the softness immediately, projects $42K in markdown exposure if uncorrected, and recommends a two-step response: transfer 1,200 units to higher-velocity stores where bread is still selling, and mark down only the remaining 400 units by 30% before shelf life expires. The result: $42K exposure reduced to $18K — $24K in savings from acting 4 days earlier than the traditional review cycle would have caught it.

---

## 5. Visualization-by-Visualization Guide

This section provides a complete, independent explanation of every visualization in the Autonomous Report. For each visualization, we cover its purpose, what data it shows, how the AI analyzes it, the business drivers it considers, its implications, recommended actions, how each persona interprets it, a real-world example, and the expected business outcome.

---

### 5.1 Enterprise KPI Banner

**Purpose**
Provides an at-a-glance summary of portfolio health with 6 key performance indicators that anchor the entire report. This is the first thing any user sees — the "vital signs" of the business.

**What It Shows**
Six metric cards displayed in a horizontal strip:

| KPI | Current Value | Meaning |
|---|---|---|
| Total Anomalies | 927 | SKUs deviating >10% from forecast |
| High Impact | 530 | Anomalies with revenue at risk exceeding $10K |
| Departments | 3/3 | All departments have active anomalies |
| Revenue at Stake | $3.9M | Total financial exposure if unaddressed |
| Avg Stockout Rate | 15.1% | Portfolio-wide out-of-stock percentage |
| Units at Risk | 591,884 | Total units with potential demand shortfall |

**How the AI Analyzes the Data**
The system aggregates all active anomalies from the current fiscal week, filters by the 10% deviation threshold, and computes revenue exposure using the per-SKU value-at-risk model. High Impact items are those exceeding the $10K materiality threshold — a configurable guardrail that ensures planners focus on financially meaningful signals rather than statistical noise.

**Business Drivers Considered**
All drivers — weather, promotion, competitor, digital, seasonal — feed into the anomaly count. The KPI banner does not distinguish drivers; it shows the net effect.

**Business Implications**
When all 3 departments show active anomalies simultaneously (as this week), it signals either a broad external event (weather, macro) or a coincidence of department-specific events. The 15.1% stockout rate is 3x the target (<5%), indicating significant availability gaps. The $481K daily erosion means the financial picture degrades materially with every day of inaction.

**Recommended Actions**
Use the KPI banner to calibrate urgency. When Revenue at Stake exceeds $1M, the week requires immediate action — not "monitor and review." When Stockout Rate exceeds 10%, replenishment is the priority over all other planning activities.

**How a Demand Planner Interprets It**
"927 anomalies is a high-signal week. I need to triage fast — the 530 high-impact items are my priority. I'll start with the Anomaly Table to see which are in my department."

**How a Supply Planner Interprets It**
"$3.9M at stake with 15.1% stockout rate tells me this week is about availability protection, not optimization. I need to focus on replenishment and expedites."

**How an Executive Interprets It**
"All 3 departments are affected. This is likely a multi-signal week — I should expect cross-department resource contention in the Executive Briefing."

**Real-World Example**
In a typical low-signal week, Brightway sees ~200 anomalies with $500K at stake. This week's 927 anomalies and $3.9M exposure represent a 4x escalation — driven by the convergence of a heat wave, a viral social media trend, and back-to-school promotional activity. The KPI banner makes this escalation immediately visible without any analysis.

**Expected Business Outcome**
The planner saves 30–60 minutes of manual data assembly and immediately understands whether this week requires routine monitoring or emergency action. The answer this week: emergency action.

---

### 5.2 Multi-Signal Anomaly Detection (Anomaly Table)

**Purpose**
Provides a prioritized, ranked list of every demand anomaly with severity classification, geographic scope, financial exposure, and the primary demand driver. This is the actionable triage list — the "to-do list" for the week.

**What It Shows**
A sortable, severity-coded table with columns for:
- Product category (CATEGORY_L3)
- Region
- Severity (CRITICAL / HIGH / MEDIUM / LOW)
- Demand deviation percentage
- Value at risk (USD)
- Units at risk
- Primary driver
- Days running (how long the anomaly has persisted)

**How the AI Analyzes the Data**
Each anomaly is sourced from the FACT_DEMAND_RISK table, which compares actual demand against the forecast baseline at the category-region-week grain. The severity classification is computed from a composite score:

| Severity | Deviation | Value at Risk | Action Timeline |
|---|---|---|---|
| CRITICAL | >25% | >$20K | Same-day response |
| HIGH | 15–25% | $10K–$20K | Within 2–3 days |
| MEDIUM | 10–15% | $5K–$10K | Next weekly review |
| LOW | <10% | <$5K | Monitor only |

**Business Drivers Considered**
The Primary Driver column shows which signal is most responsible for the deviation. This week's top anomalies:

| # | Category | Region | Severity | Value at Risk | Deviation | Primary Driver |
|---|---|---|---|---|---|---|
| 1 | Milk | South-Central | CRITICAL | $51,508 | +28.1% | Digital |
| 2 | Milk | South-Central | CRITICAL | $42,214 | +28.1% | Digital |
| 3 | Milk | Southeast | CRITICAL | $37,351 | +20.4% | Digital |
| 4 | Portable Speakers | National | CRITICAL | $33,880 | +67.6% | See driver attribution |
| 5 | Milk | South-Central | CRITICAL | $32,562 | +28.1% | Digital |

**Business Implications**
The dominance of Milk across 3 of the top 5 positions, all driven by Digital signals, indicates a concentrated, demand-side event — not a supply failure. The Portable Speakers anomaly at +67.6% is an outlier even among CRITICAL items, suggesting a viral demand event that requires different handling than the weather/promo-driven Milk surge.

**Recommended Actions**
- Work the list top-to-bottom by severity. CRITICAL items first.
- Cross-reference with the Driver Attribution chart to understand root causes before ordering.
- Flag any CRITICAL items outside your department to the relevant peer planner.
- If multiple CRITICAL items compete for the same supplier or freight capacity, escalate to the Director.

**How a Demand Planner Interprets It**
Sarah sees Milk dominating the CRITICAL list with $126K+ exposure across South-Central and Southeast. She validates the digital signal (smoothie recipe trend) and adjusts her demand plan upward for Milk in the affected regions.

**How a Supply Planner Interprets It**
David sees the severity distribution and estimates total replenishment volume needed. He cross-references with current inventory to identify which stores will stock out first.

**How an Executive Interprets It**
Lisa sees that 530 of 927 anomalies are HIGH or CRITICAL, affecting all 3 departments. She anticipates the weekly S&OP will require trade-off decisions on shared resources.

**Real-World Example**
In December, the Anomaly Table flagged a CRITICAL anomaly for Holiday Gift Baskets — +40% above forecast in the Northeast, driven by a corporate gifting trend detected through digital purchase intent signals. The Demand Planner adjusted the forecast on Tuesday. The Supply Planner approved an expedited reorder on Wednesday. The stores received stock on Thursday — 3 days before the traditional review cycle would have detected the issue. $85K in additional revenue was captured.

**Expected Business Outcome**
Planners spend 80% less time discovering problems and 80% more time solving them. Every CRITICAL anomaly is addressed within 24 hours instead of 7–14 days.

---

### 5.3 Portfolio Deviation Heatmap

**Purpose**
Provides a geographic and departmental view of where demand deviations are concentrated. Red cells indicate over-forecast demand (stockout risk). Blue cells indicate under-forecast demand (markdown risk). White cells are within the normal ±10% variance band.

**What It Shows**
A matrix visualization with two views:

- **Default (L1) View:** Department (Consumer Electronics, Fresh & Grocery, Seasonal & Home) × Region — 3 columns × 7 rows = 21 cells showing average deviation percentage per department-region combination.
- **Drill-Down (L2) View:** When one or more departments are selected via the filter buttons, the heatmap drills into sub-categories (CATEGORY_L2) × Region — showing a more granular view of where within the department the deviation is concentrated.

**How the AI Analyzes the Data**
The heatmap aggregates DT_DEMAND_WEEKLY data at the selected grain (L1 or L2), computing the average weighted demand deviation percentage (WTD_DEMAND_DEVIATION_PCT) for each cell. Lost sales units and stockout counts are also aggregated to enable the dynamic insight computation.

**Business Drivers Considered**
The heatmap reflects the net effect of all drivers but highlights geographic concentration — which typically points to weather (regional), competitor (regional), or promotion (store-level) drivers. Nationally uniform deviations suggest digital or macro drivers.

**Business Implications**
When one region-department cell shows extreme red (>25%) while adjacent cells are white, the anomaly is localized and likely driven by a regional factor. When an entire column (all regions for one department) is red, the driver is department-wide — likely a promotion, digital trend, or supply constraint.

This week, Consumer Electronics shows 30–32% deviation across all 7 regions — indicating a national phenomenon (the viral Portable Speaker trend). Fresh & Grocery shows 24–32% concentrated in South-Central and Southeast — indicating regional factors (heat wave + local promo).

**Recommended Actions**
- **At L1 level:** Identify which departments show the widest deviation spread. Click into those departments.
- **At L2 level:** Identify which sub-categories are driving the department-level deviation. Focus investigation on the top 3 L2 categories by deviation magnitude.
- **Cross-reference:** Use the Driver Attribution chart to confirm whether the deviation is weather, digital, promotional, or competitor-driven.

**How a Demand Planner Interprets It**
Sarah selects "Fresh & Grocery" and sees the L2 breakdown: Dairy Products at +28% in South-Central and Southeast, Bakery at -15% in Northeast. She now knows exactly which sub-categories need attention.

**How a Supply Planner Interprets It**
David uses the heatmap to identify which regions will need replenishment capacity. If South-Central shows extreme red across multiple departments, the regional DC will face volume pressure.

**How an Executive Interprets It**
Lisa uses the L1 view to compare departmental health at a glance. If all 3 departments are red in the same region, she knows that region's logistics infrastructure will be contested.

**Real-World Example**
During back-to-school season, the heatmap showed Seasonal & Home deeply blue (below forecast) in the Northeast and Midwest — but bright red in the Southeast. Investigation revealed that hot weather in the Southeast was extending outdoor furniture demand past the traditional seasonal cutoff, while cooler-than-normal temperatures in the Northeast were ending the season early. Without the heatmap's geographic view, the national average would have shown Seasonal & Home as "normal" — masking two opposing regional trends that each required different actions (expedite in Southeast, markdown in Northeast).

**Expected Business Outcome**
Planners identify geographic concentration patterns in seconds rather than building regional pivot tables manually. The L1→L2 drill-down eliminates the need for ad-hoc sub-category queries — the answer is one click away.

---

### 5.4 Portfolio Health Overview (Variance Histogram)

**Purpose**
Shows the statistical distribution of demand deviations across the entire portfolio. This is the "health check" — it tells you whether the portfolio is broadly stable (bell curve centered near 0%) or under stress (skewed, with long tails).

**What It Shows**
A histogram where each bar represents a 5-percentage-point band of deviation (e.g., -10% to -5%, 0% to +5%). Bars are color-coded:

- **Green (±10%):** Normal forecast variance — 105 SKUs (38%)
- **Amber (±10–20%):** Watch zone — 61 SKUs (22%)
- **Red (>±20%):** True anomalies requiring investigation — 109 SKUs (40%)

A statistics panel shows: Total SKUs (275), Mean (13.8%), Median (10%), Std Dev (12.3), Skew (0.31).

**How the AI Analyzes the Data**
The system computes the deviation for each SKU-region combination from DT_DEMAND_WEEKLY, bins the values into 5pp intervals, and classifies each SKU into the Green / Amber / Red zones. The distributional statistics (mean, median, standard deviation, skewness) provide a quantitative health assessment.

**Business Drivers Considered**
The variance histogram reflects all drivers in aggregate. The shape of the distribution — not just the mean — is diagnostically important:

- **Tight, centered bell curve:** Portfolio is well-forecasted, no systemic issues
- **Right-skewed (positive skew):** Systematic under-forecasting — demand is running ahead of plan
- **Left-skewed (negative skew):** Systematic over-forecasting — excess inventory building
- **Bimodal (two peaks):** Two distinct demand regimes — typically seasonal transition or geographic divergence

**Business Implications**
This week's distribution shows a mean of +13.8% and positive skew of 0.31 — the portfolio is systematically running above forecast. With 40% of SKUs in the red zone (>20% deviation), this is not a handful of outliers — it's a broad portfolio stress event. The positive skew confirms that the forecast baseline is structurally underestimating demand, consistent with the -5.0% bias observed in Fresh & Grocery and -7.8% in Consumer Electronics.

**Recommended Actions**
- **When Red >30%:** Flag for emergency forecast review — the baseline is not capturing current demand dynamics
- **When Skew >0.5:** Recommend systematic bias correction across the portfolio
- **When Std Dev >15:** Investigate whether specific drivers (promotion, weather) are causing abnormally wide variance
- **For Demand Planners:** Use the histogram to advocate for model recalibration with the demand science team — show that 40% of SKUs are beyond the anomaly threshold

**How a Demand Planner Interprets It**
"40% of my portfolio is in the red zone. This isn't a few outliers — the baseline forecast needs recalibration. I'll flag this to the demand science team with the histogram as evidence."

**How a Supply Planner Interprets It**
"With the distribution skewed right, I should expect more replenishment requests than normal this week. I need to proactively check supplier capacity and freight availability."

**How an Executive Interprets It**
"When the green zone is below 50%, the planning system is underperforming. This week at 38% green, we need to invest in model improvement — not just react to individual anomalies."

**Real-World Example**
In Q1, the histogram showed 65% of SKUs in the green zone — a healthy portfolio. After a major promotion launch in Q2, the green zone dropped to 30% and the red zone spiked to 45%, with the mean shifting to +18%. The histogram made it immediately clear that the promotional lift was far exceeding plan, not just on promoted items but across complementary categories. This triggered an immediate re-plan of the entire seasonal inventory budget.

**Expected Business Outcome**
Executive leadership uses the histogram to track portfolio health over time. A shrinking green zone triggers structural investment in forecast model improvement — a strategic decision that individual anomaly responses alone would never surface.

---

### 5.5 Cross-Department Signal Awareness

**Purpose**
Provides each planner with a summary of what's happening in their peer planners' departments. This is the "peripheral vision" that prevents siloed decision-making and surfaces cross-department resource contention before it becomes a crisis.

**What It Shows**
A set of department cards, one per department, each showing:
- Department name and planner
- Total anomaly count
- Top anomaly by revenue impact
- Primary driver for that department's dominant signal

**How the AI Analyzes the Data**
The system aggregates anomalies by department and identifies the single highest-impact signal per department. Cross-department patterns are flagged — for example, when two departments both need expedited freight in the same 48-hour window, the system flags this as a resource contention.

**Business Drivers Considered**
All drivers, compared across departments. When the same driver (e.g., Weather) appears as dominant across multiple departments, it suggests a shared external force that may require coordinated response rather than independent departmental reactions.

**Business Implications**
This week, all 3 departments show simultaneous anomalies — an unusual convergence. Fresh & Grocery's heat-wave surge and Consumer Electronics' viral spike are independent events, but they compete for the same logistics infrastructure (expedited freight, DC pick-and-pack labor). Without cross-department awareness, both planners would independently request resources without knowing they're in contention.

**Recommended Actions**
- Check if peer planners' anomalies compete for the same resources (freight, suppliers, DC capacity)
- If contention exists, coordinate before independently escalating — a joint escalation to the Director is more effective than competing escalations
- Use the cross-department view to anticipate questions the Director will ask at S&OP

**How a Demand Planner Interprets It**
Sarah sees that Mark's Portable Speakers spike is +67.6% nationally — a bigger deviation than her Milk surge. She anticipates that Mark may need the same expedited freight capacity she's planning to request.

**How a Supply Planner Interprets It**
David sees all 3 departments flagged simultaneously. He proactively checks total DC capacity against combined replenishment volumes across all departments before individual orders are placed.

**How an Executive Interprets It**
Lisa sees the convergence of 3 department-level signals and prepares for a contentious S&OP — she'll need to arbitrate resource allocation.

**Real-World Example**
In November, the Cross-Department Strip showed Fresh & Grocery and Seasonal & Home both flagging the same Northeast region — Fresh for holiday baking demand (+22%) and Seasonal for holiday décor (+30%). Both needed the same Northeast DC capacity. The early signal allowed David to sequence the orders: perishable baking supplies first (shorter shelf life), décor second (could wait 2 days). Without the cross-department view, both orders would have been submitted simultaneously, overwhelming the DC.

**Expected Business Outcome**
Cross-department contention is identified 2–3 days earlier than in the traditional email-based coordination process. Resource allocation is proactive rather than reactive.

---

### 5.6 Root Cause Driver Attribution

**Purpose**
Decomposes each demand deviation into its contributing drivers — quantifying how much of the deviation is explained by Weather, Promotions, Competitor Activity, Digital/Social Trends, and Residual factors. This is the "why" behind the "what."

**What It Shows**
A horizontal bar chart showing each product category on the Y-axis and driver contributions (in percentage points) on the X-axis, stacked by driver. Each driver has a distinct color:

| Driver | Color | Average Contribution (pp) |
|---|---|---|
| Digital | #6366F1 (Indigo) | +5.21pp |
| Weather | #F59E0B (Amber) | +2.20pp |
| Promotion | #14B8A6 (Teal) | +1.46pp |
| Competitor | #FB7185 (Rose) | -0.17pp |
| Residual | #94A3B8 (Slate) | ~0pp |

A department filter allows drill-down to individual departments. Confidence scores and multicollinearity flags appear in a side panel.

**How the AI Analyzes the Data**
The system uses FACT_DRIVER_ATTRIBUTION, which contains pre-computed driver contributions for each anomaly. The attribution model decomposes each deviation using a multi-signal regression with cross-correlation checks:

1. **Weather signal:** Historical weather-demand elasticity (e.g., 2.8% lift per degree above norm for produce) applied to the current weather deviation
2. **Promotion signal:** Expected lift from active promotions (from the promotional calendar) compared against actual lift
3. **Competitor signal:** Spillover demand from confirmed competitor stockouts, validated via store-pair analysis
4. **Digital signal:** Search volume and social media indices, dampened by 15% when correlation with weather exceeds 0.5
5. **Residual:** Unexplained variance after all drivers are accounted for — should be <10% for high-confidence attribution

**Business Drivers Considered**
All 5 drivers simultaneously. The system checks for multicollinearity (when two drivers are correlated, e.g., hot weather and "BBQ recipe" searches) and adjusts contributions to avoid double-counting.

**Business Implications**
When a single driver dominates (>60% of the deviation), the response is clear and focused. When multiple drivers contribute roughly equally, it's a multi-signal event — the response must address multiple causes simultaneously.

This week, Digital dominates at +5.21pp — nearly 2.5x the next-largest driver (Weather at +2.20pp). This suggests that social media trends, not weather, are the primary demand accelerator. However, the combination of digital + weather + promotion creates a compounding effect that makes the total deviation larger than any single driver would produce.

**Recommended Actions**
- **If Weather dominates:** Secure short-term replenishment but don't over-order — weather effects are self-correcting within the forecast window
- **If Digital dominates:** Monitor for rapid decay — viral signals spike and fade within 5–7 days. Avoid large inventory commitments
- **If Promotion dominates:** Validate whether lift is incremental or pulled-forward demand. Check post-promo dip patterns
- **If Competitor dominates:** Assess sustainability — competitor stockout may be temporary (restock in days) or structural (store closure)

**How a Demand Planner Interprets It**
Sarah filters to Fresh & Grocery and sees Weather and Digital as co-dominant for Milk. She adjusts her forecast for the weather window (5 more days of heat) and monitors the digital signal for decay.

**How a Supply Planner Interprets It**
David sees Digital as dominant and knows that digital-driven demand is less predictable than weather-driven demand. He sizes his orders conservatively and uses expedited delivery to maintain flexibility.

**How an Executive Interprets It**
Lisa sees Digital at +5.21pp portfolio-wide and recognizes that the organization's digital demand sensing capability is being validated in real time — the system detected and quantified a signal that traditional forecasting would have missed entirely.

**Real-World Example**
During a winter storm, Driver Attribution showed Weather at +18pp for Fresh & Grocery (panic buying) and Competitor at +8pp (nearby competitor store closures). The combined +26pp deviation was 70% weather / 30% competitor. The Demand Planner knew the weather component would self-correct in 3 days (storm passing) but the competitor component might persist if the competitor was slow to reopen. The Supply Planner sized the response accordingly: emergency replenishment for 3 days of elevated demand, not 2 weeks.

**Expected Business Outcome**
Root cause attribution eliminates the "guessing game" of demand response. Instead of a blanket "demand is up 28% — let's order more," the planner knows exactly which drivers are responsible and can size the response to match the expected duration and magnitude of each driver.

---

### 5.7 14-Day Recovery Trajectory

**Purpose**
Projects how the demand deviation will evolve over the next 14 days, showing when the spike will peak, when it will decay back toward baseline, and how much recoverable revenue erodes each day.

**What It Shows**
A line chart with two Y-axes:
- **Left axis:** Demand deviation (%) over 14 days, showing the projected trajectory
- **Right axis:** Recoverable value ($), showing the decaying financial opportunity

Key features include:
- An "action window" shaded zone showing the optimal intervention period
- An "intervention cost baseline" reference line
- Marker annotations for key inflection points (promo end, weather break, competitor restock)

**How the AI Analyzes the Data**
The system uses FACT_RISK_RECOVERY_CURVE, which models the forward trajectory of each anomaly by overlaying the expected persistence of each driver:

- Weather component: Uses 14-day weather forecast to project when temperature returns to seasonal norm
- Promotion component: Uses promo calendar end-dates to project when promotional lift expires
- Competitor component: Uses estimated competitor restock timelines
- Digital component: Applies a modeled decay curve (typically 50% decay in 5 days for viral signals)

**Business Drivers Considered**
All drivers projected forward independently and summed. The confidence interval widens as the projection extends further into the future:
- Days 1–5: High confidence (±3pp)
- Days 6–9: Medium confidence (±5pp)
- Days 10–14: Medium-Low confidence (±6pp)

**Business Implications**
The recovery trajectory answers the most important question in demand planning: "How much time do I have?"

For Fresh & Grocery this week:
- **$1.3M recoverable today** — but eroding at $253K/day
- **14-day action window** — but perishable items (Milk, salads) have effective windows of only 3–5 days
- **Benefit-cost ratio: 16.4x** — every dollar of intervention cost protects $16.40 in revenue

For Consumer Electronics:
- **$912K recoverable** — eroding at $172K/day
- **19-day average window** — more time, but the viral spike may decay faster than the window suggests

**Recommended Actions**
- Act on perishable categories today — these have the steepest erosion curves
- For durable goods, stage orders within 48 hours but monitor digital signal decay before committing to large volumes
- Hand off to Supply Planning for sized replenishment actions

**How a Demand Planner Interprets It**
"The spike holds for 5 more days while heat + promo overlap. After that, deviation drops from +28% to +12%. I should adjust my forecast for the full 14-day window, not just this week."

**How a Supply Planner Interprets It**
"$253K erodes every day I wait. The Milk surge in South-Central has a 3-day stockout risk — I need to order today, not tomorrow."

**How an Executive Interprets It**
"The 16.4x BCR means these are high-return interventions. I should approve the expedite budget without hesitation — the payback is overwhelming."

**Real-World Example**
In June, the Recovery Timeline showed a Seasonal & Home patio furniture surge with a 20-day window — plenty of time. However, the trajectory also showed a sharp inflection at Day 12 when a competitor's summer sale was projected to begin. The Supply Planner used this insight to front-load the replenishment order before Day 12, capturing $180K in revenue that would have been lost to competitor price undercutting. Without the 14-day forward view, the planner would have waited for the standard weekly reorder cycle and missed the window.

**Expected Business Outcome**
Planners no longer need to guess how long a demand event will persist. The trajectory provides a quantified basis for sizing orders, timing expedites, and justifying intervention costs.

---

### 5.8 Stockout & Availability Risk (Supply Planner)

**Purpose**
Projects which specific product categories are approaching stockout based on current demand trajectories, existing inventory, and inbound replenishment timelines. This is the Supply Planner's primary decision tool.

**What It Shows**
A table ranked by urgency (days to impact) with columns for:
- Category and Region
- Days to Impact (estimated days until stockout at current demand rate)
- Value at Risk ($)
- Risk Level (color-coded: Critical, High, Medium)
- Primary Driver

**How the AI Analyzes the Data**
The system combines projected demand (from the trajectory model) with current on-hand inventory, safety stock levels, reorder points, and inbound replenishment schedules. A category is flagged when its projected demand exceeds available supply within the planning horizon.

**Business Drivers Considered**
- Current demand rate and trajectory
- On-hand inventory vs. safety stock corridor
- Inbound replenishment lead times
- Supplier OTIF reliability (e.g., a supplier at 81% OTIF increases stockout probability)

**Business Implications**
Items with Days to Impact < 3 are emergencies — the shelf will be empty before any standard replenishment cycle can respond. Items with Days to Impact of 3–7 can be addressed through expedited delivery. Items beyond 7 days have time for standard replenishment but should be staged proactively.

**Recommended Actions**
- Items < 3 days: Same-day inter-store transfers from nearby surplus stores
- Items 3–5 days: Expedited delivery from DC (next-day or 2-day)
- Items 5–7 days: Standard replenishment with increased order quantity
- All items: Check supplier OTIF before committing to increased orders — a supplier at 81% OTIF may not deliver reliably under surge conditions

**How a Demand Planner Interprets It**
Not a primary tool for the Demand Planner, but useful for understanding which categories are supply-constrained. If a category is flagged for stockout, the Demand Planner should avoid running promotions that would amplify demand for that item.

**How a Supply Planner Interprets It**
This is David's action list. He works it top-to-bottom by Days to Impact, approving replenishment orders within his authority threshold and escalating above-threshold items.

**How an Executive Interprets It**
Lisa uses the aggregate count (e.g., "530 high-risk items") and the total Value at Risk to assess whether the Supply Planner's response capacity is sufficient or whether additional resources (budget, labor, supplier flexibility) are needed.

**Real-World Example**
In March, the Stockout Risk Table flagged Premium Yogurt in the West at 1.5 days to impact — below the critical threshold. David approved a same-day transfer of 600 units from the Midwest (which had 5+ days of surplus). The transfer cost $1,200 in logistics but protected $38K in revenue — a 32x return. The standard replenishment cycle would have taken 4 days, during which 3 stores would have been out of stock for 2.5 days each.

**Expected Business Outcome**
Stockouts are identified 5–10 days before they would appear as empty shelves, giving the Supply Planner a window to respond proactively rather than reactively.

---

### 5.9 ACT — Prescriptive Action Cards (Supply Planner)

**Purpose**
Converts the Supply Planner's risk projections into specific, sized, costed recommendations — each with a clear action, expected impact, cost, confidence level, and authority-level tag.

**What It Shows**
A series of action cards, each containing:
- **Action description:** What to do (e.g., "Expedite 4,400 units of pre-cut salads to 9 South-Central stores")
- **Expected impact:** Revenue protected (e.g., "$72K")
- **Cost:** Intervention cost (e.g., "$6K expedite premium")
- **Confidence:** Model confidence level (High / Medium / Low)
- **Approval required:** Whether the action is within planner authority or needs escalation
- **Authority:** Who can approve (e.g., "David" or "David → Supervisor")

**How the AI Analyzes the Data**
Each recommendation is sized using the prescriptive model:
- **Order quantity** = (Target days of cover × Projected daily demand) − Current on-hand, rounded to case pack, capped by DOS corridor
- **Delivery mode** = Chosen by comparing days-to-stockout against lead-time options
- **Cost** = Standard delivery cost + any expedite premium
- **Impact** = Revenue protected if the stockout is prevented
- **Authority** = Checked against per-role threshold guardrails stored in DIM_GUARDRAILS

**Business Drivers Considered**
- Demand trajectory (duration and magnitude of the spike)
- Current inventory position (on-hand, in-transit, safety stock)
- Supplier reliability (OTIF rate affects sourcing decisions)
- Delivery options (standard vs. expedite vs. inter-store transfer)
- Cost thresholds (guardrails on expedite premiums and order sizes)

**Business Implications**
Each action card represents a quantified trade-off: the cost of intervention vs. the revenue it protects. A BCR of 16x means the intervention generates $16 for every $1 spent. Actions within planner authority can be executed immediately; escalated items create the Director's approval queue.

**Recommended Actions**
- Approve all actions with BCR > 5x within authority — these are high-return interventions
- For escalated items, forward to the Director with the BCR as justification
- Execute perishable-category actions before end of day — these have the steepest erosion curves
- Group supplier POs where possible to reduce freight costs

**How a Demand Planner Interprets It**
Not a primary tool for the Demand Planner, but useful for understanding what supply-side actions are being taken in response to their demand signals.

**How a Supply Planner Interprets It**
This is David's primary action queue. He reviews each card, validates the sizing, and either approves (within authority) or escalates (above threshold). The goal is to process all actions before the daily standup.

**How an Executive Interprets It**
Lisa sees the summary: X actions approved, Y pending. She signs off on the escalated items, resolves any cross-department contention, and has a complete picture for S&OP.

**Real-World Example**
In July, the ACT section recommended a sourcing split for Berries: 60% from Supplier B (primary, but OTIF declining to 81%) and 40% from Supplier E (backup, higher cost but 97% OTIF). The split protected $54K at a marginal cost increase of $2K — a 27x return. Without the recommendation, David would have placed the full order with Supplier B and risked a late delivery on 40% of the volume.

**Expected Business Outcome**
Every recommendation is sized, costed, and authority-tagged. The planner spends 90% less time on ad-hoc calculations and 90% more time on judgment calls — validating, adjusting, and approving.

---

### 5.10 Executive Briefing Pack (Director)

**Purpose**
Consolidates all departmental signals, actions, contentions, and pending approvals into a single decision surface for the Director's weekly S&OP meeting.

**What It Shows**
- **Enterprise summary table:** Department × Revenue at Stake × Protected/Recovered × Status
- **Cross-Department Contentions:** Where departments compete for the same resources
- **Pending Approvals:** Items above planner authority that need Director sign-off
- **Cortex AI Insight:** Enterprise-level strategic narrative

**How the AI Analyzes the Data**
The system rolls up all per-department anomalies, actions, and financial summaries into enterprise-level aggregates. It identifies cross-department contentions by checking whether two or more departments have competing claims on the same resource (e.g., expedited freight capacity, DC pick-and-pack labor, shared supplier PO slots).

**Business Drivers Considered**
All drivers across all departments, compared for convergence. When the same driver (e.g., Weather) appears dominant across multiple departments, the Director knows the response must be coordinated, not siloed.

**Business Implications**
This week's enterprise summary:

| Department | Revenue at Stake | Recoverable | Daily Erosion | BCR | Window |
|---|---|---|---|---|---|
| Fresh & Grocery | $2,007,261 | $1,306,902 | $252,982/day | 16.4x | 14 days |
| Consumer Electronics | $1,431,480 | $912,450 | $171,595/day | 15.1x | 19 days |
| Seasonal & Home | $489,403 | $311,777 | $56,986/day | 11.5x | 20 days |
| **Enterprise Total** | **$3,928,144** | **$2,531,129** | **$481,563/day** | — | — |

**Recommended Actions**
- Approve all escalated items (typically 2–3 per week) before S&OP
- Resolve cross-department contentions by prioritizing based on BCR and perishability
- Use the enterprise summary as the S&OP opening slide — it covers total exposure, recovery, and cost in one view
- Log all decisions for the feedback loop — realized outcomes improve next week's detection

**Real-World Example**
This week, the Executive Briefing flagged one genuine contention: Fresh & Grocery salad expedites and Consumer Electronics speaker air-freight both need the same 48-hour freight capacity. The recommendation: fund both ($18K total to protect $162K). If budget is capped, prioritize salads — higher return-per-dollar and perishable. Lisa approved both in 5 minutes at the Monday S&OP, turning what would have been a 45-minute debate into a data-driven decision.

**Expected Business Outcome**
The Director walks into S&OP with a pre-built decision package. The meeting shifts from "What happened?" to "Do we approve the recommended response?" — saving 30–60 minutes per session and ensuring every decision is backed by quantified trade-off analysis.

---

## 6. Detect Stage Deep Dive

The Detect stage answers: **"What just changed across my portfolio?"**

### Why Detect Exists

In a portfolio of 42 product categories × 7 regions × 40 stores, there are thousands of data points to monitor every week. No human planner can scan all of them. The Detect stage automates this surveillance, filtering the signal from the noise and surfacing only the anomalies that have real financial impact.

### How Anomalies Are Identified

1. **Baseline comparison:** Current week demand vs. forecast baseline at the category-region-week grain
2. **Threshold filtering:** Only deviations exceeding ±10% are flagged as anomalies (configurable)
3. **Severity classification:** Anomalies are scored by a composite of deviation magnitude and financial exposure
4. **Persistence check:** Anomalies running for 3+ days are flagged as persistent (less likely to be noise)

### Revenue Impact Interpretation

Revenue at Stake is not a simple "units × price" calculation. It accounts for:
- The demand deviation magnitude and expected persistence
- Current inventory position and replenishment lead times
- Whether the deviation is positive (stockout risk — lost revenue) or negative (markdown risk — margin erosion)
- The elasticity of the category (perishable items lose value faster than durables)

### Risk Prioritization

The Detect stage outputs a prioritized action list. CRITICAL items are expected to impact revenue within 24–48 hours if unaddressed. HIGH items within 3–5 days. MEDIUM items within the weekly review cycle. This tiering ensures that planner attention is allocated proportionally to financial urgency.

### Real-World Detect Scenarios

**Scenario 1: Holiday demand detection.**
Three weeks before Thanksgiving, the system detects a +18% surge in Baking Ingredients across the Northeast — driven by early holiday cooking searches (Digital driver). MAPE for this category is only 12%, so the deviation is well outside normal forecast error. The planner adjusts the forecast 10 days before the traditional seasonal planning process would have caught the shift.

**Scenario 2: Competitor stockout detection.**
A regional grocery competitor's distribution center suffers a fire, causing stockouts across 12 stores in the Southeast. Within 2 days, the system detects +22% demand spillover in Fresh & Grocery categories at Brightway stores near the affected competitor locations. The spillover is attributed to the Competitor driver via mobile-location traffic analysis. The planner sizes a targeted replenishment for the affected stores — not the entire region.

---

## 7. Explain Stage Deep Dive

The Explain stage answers: **"Why did it change?"**

### Root-Cause Identification

Every anomaly detected in Stage 1 is decomposed into its contributing drivers. The Explain stage does not simply flag "Milk is up 28%." It tells you: "Milk is up 28%, of which 5.21pp is from a digital viral trend, 2.20pp is from a heat wave, 1.46pp is from an active BOGO promotion, and -0.17pp is from competitor price pressure."

### Driver Attribution Methodology

The attribution model uses a multi-signal regression approach:
1. Each driver has a pre-computed signal index (weather deviation, digital trend score, promo lift factor, competitor availability score)
2. The model estimates the contribution of each signal to the observed deviation
3. Cross-correlation checks identify when two drivers overlap (e.g., hot weather and "BBQ recipe" searches both spike in the same week) and dampen the weaker signal to avoid double-counting
4. The Residual captures unexplained variance — a residual >10% suggests a missing driver or data quality issue

### Causal Relationships

The system distinguishes between correlation and causation using confidence scoring:
- **High confidence:** Driver has established historical elasticity (e.g., weather-demand relationship validated over 24+ months)
- **Medium confidence:** Driver has plausible causal mechanism but limited historical validation (e.g., competitor stockout spillover)
- **Low confidence:** Signal correlation exists but causal mechanism is uncertain (e.g., digital trend that may be coincidental)

### Impact Scoring

Each driver's contribution is expressed in both percentage points (for technical audiences) and estimated dollar impact (for business audiences). The dollar impact is computed by applying the driver's percentage-point contribution to the total value-at-risk for the anomaly.

### Recovery Trajectory

The 14-day forward trajectory projects each driver's persistence independently:
- Weather: Uses forward weather forecasts
- Promotion: Uses promo end-dates from the calendar
- Competitor: Uses estimated restock timelines
- Digital: Uses modeled viral decay curves (typically 50% decay in 5 days)

The combined trajectory shows when the anomaly is expected to peak, when it will decay, and how much of the opportunity remains recoverable at each point.

### Practical Retail Example

A bakery planner sees Artisan Breads running -15% below forecast in the Northeast. The Explain stage shows:
- Weather: -3pp (unseasonably cold week reduced foot traffic to stores)
- Competitor: -5pp (new artisan bakery opened nearby, pulling foot traffic)
- Digital: -2pp (trending recipes shifted from bread to summer smoothies)
- Promotion: 0pp (no active promotion)
- Residual: -5pp (higher than expected — possible data quality issue with one store's POS)

The planner now knows that 50% of the shortfall is temporary (weather returns to normal in 3 days) and 50% may be structural (new competitor). The response: wait 3 days for weather recovery, then reassess. If the -10% persists after weather normalizes, investigate the competitor impact and consider a localized promotion to recapture share.

---

## 8. Act Stage Deep Dive

The Act stage answers: **"What should we do — and who needs to approve it?"**

### Recommendation Generation

Each recommendation is generated by the prescriptive engine, which combines:
1. The demand trajectory from the Explain stage (how much demand, for how long)
2. Current inventory position (on-hand, in-transit, safety stock)
3. Supplier capabilities (lead times, OTIF rates, capacity constraints)
4. Cost parameters (standard vs. expedite delivery, inter-store transfer costs)
5. Authority thresholds (DIM_GUARDRAILS — per-role approval limits)

### Cost-Benefit Analysis

Every recommendation includes:
- **Revenue protected:** How much revenue the action saves if it prevents the stockout or captures the demand opportunity
- **Intervention cost:** Direct cost of the action (expedite premium, transfer logistics, etc.)
- **Benefit-Cost Ratio (BCR):** Revenue protected ÷ Intervention cost. A BCR of 16x means the action generates $16 for every $1 spent
- **Net benefit:** Revenue protected minus intervention cost

### Confidence Scoring

Recommendations carry the confidence level of the underlying demand projection:
- **High confidence:** Demand trajectory is well-supported by multiple drivers with established elasticities. Order with conviction.
- **Medium confidence:** Trajectory is plausible but relies on one or two drivers with moderate confidence. Order conservatively and use expedited delivery to maintain flexibility.
- **Low confidence:** Trajectory is uncertain (e.g., viral digital signal that may decay unpredictably). Avoid large commitments — use small initial orders with rapid reorder capability.

### Risk Assessment

Each recommendation also flags risks:
- **Supplier risk:** Is the primary supplier reliable? If OTIF is below 85%, a sourcing split may be advisable.
- **Demand risk:** Could the demand signal reverse? If the driver is digital (viral), the spike may be short-lived.
- **Execution risk:** Can the DC and logistics network handle the volume? If multiple departments need expedites simultaneously, capacity may be constrained.

### Authority-Level Tagging

Every recommendation is tagged with the approval authority:
- **Within planner authority:** The Supply Planner can approve and execute immediately
- **Needs supervisor:** Above the per-order threshold — requires Supply Ops Manager sign-off
- **Needs Director:** Cross-department allocation or above the departmental budget threshold
- **Needs Procurement:** Involves a new supplier or a sourcing change

### Operational Example

David receives a recommendation to expedite 4,400 units of pre-cut salads to 9 South-Central stores:
- **Revenue protected:** $72K
- **Cost:** $6K expedite premium
- **BCR:** 12x
- **Confidence:** High (weather + promo drivers both have established elasticities)
- **Authority:** $6K exceeds David's per-order limit ($5K) → needs Supervisor sign-off
- **Risk:** Supplier D has 96% OTIF — reliable. No sourcing risk.

David reviews, confirms the sizing, and routes to his Supervisor. The Supervisor sees the 12x BCR, approves in 2 minutes. The order ships same-day.

---

## 9. Business Drivers Framework

### Demand Drivers

| Driver | Input Data | Influence on Demand | Influence on Inventory | Business Impact |
|---|---|---|---|---|
| **Weather** | 14-day regional weather forecasts, historical weather-demand elasticities | ~2.8% demand lift per °F above seasonal norm (produce); inverse for cold-weather categories | Accelerates consumption of perishables; may strand seasonal inventory if weather shifts suddenly | Short-term, predictable, self-correcting. Primary driver for Fresh & Grocery. |
| **Digital / Social** | Search volume indices, social media mention rates, viral trend scores | Unpredictable magnitude; can drive 50–100%+ spikes. Typically decays 50% within 5 days | Can create sudden demand spikes that outrun safety stock within 24 hours | High-magnitude but short-lived. Primary driver for Consumer Electronics. Requires rapid, flexible response. |
| **Promotion** | Promotional calendar, planned lift factors, store coverage | Planned lift (e.g., 2x) but actual lift may exceed plan (this week: 2.1x for BBQ promo) | Pre-positioned inventory may be insufficient if actual lift exceeds plan | Partially predictable. Check actual vs. planned lift. Watch for demand transfer to complementary categories. |
| **Competitor** | Competitor pricing feeds, availability signals, store-pair traffic analysis | Spillover demand from competitor stockouts or price increases. Magnitude depends on proximity. | Concentrated at stores near affected competitor locations | Medium-confidence attribution. Duration depends on competitor recovery speed. |
| **Residual** | None — computed as the unexplained portion after all other drivers are accounted for | Should be <10% of total deviation. If >10%, suggests a missing driver or data quality issue | Not directly actionable — signals model improvement opportunity | Diagnostic indicator. High residual = investigate further. |

### Inventory Drivers

| Driver | Description | Impact |
|---|---|---|
| **Days of Supply (DOS)** | Current on-hand ÷ daily demand rate | Below corridor = stockout risk; above corridor = markdown risk |
| **Safety Stock Level** | Buffer inventory for demand variability | Insufficient safety stock amplifies stockout risk during demand surges |
| **Replenishment Lead Time** | Days from order to shelf | Longer lead times require earlier action; expedite options reduce effective lead time |
| **Supplier OTIF** | Percentage of orders delivered on time and in full | Below 85% = unreliable supplier; consider sourcing diversification |

### Seasonal Drivers

| Driver | Description | Impact |
|---|---|---|
| **Calendar Seasonality** | Known annual demand patterns (holidays, back-to-school, summer) | Baseline forecast should capture these; deviations from seasonal pattern are genuine anomalies |
| **Fiscal Week Position** | Where in the fiscal quarter the current week falls | End-of-quarter may see inventory adjustments for financial reporting |
| **Event Calendar** | Local events, sports seasons, festivals | Creates localized demand spikes not captured in national forecasts |

### Pricing Drivers

| Driver | Description | Impact |
|---|---|---|
| **Own Price Changes** | Planned price increases or decreases | Price elasticity varies by category (electronics: -1.5 to -2.0; grocery staples: -0.3 to -0.5) |
| **Competitor Pricing** | Competitor price changes relative to Brightway | Price gap widening drives volume shift; narrowing stabilizes |
| **Markdown Triggers** | Guardrail thresholds for markdown initiation | Triggered when sell-through rate drops below the category threshold (e.g., GR-007) |

---

## 10. How the AI Generates Insights

### Signal Aggregation

The system ingests data from 8+ sources (POS, weather, competitor, digital, promotions, inventory, supplier, seasonal) and aligns them at a common grain: category × region × fiscal week. This alignment ensures that a weather signal for "Southeast, FW202624" is compared against the demand signal for the same geography and time period.

### Pattern Recognition

The system applies multiple pattern recognition layers:
1. **Deviation detection:** Current demand vs. baseline forecast at each grain
2. **Persistence analysis:** How many consecutive days the deviation has been running
3. **Acceleration/deceleration:** Whether the deviation is growing, stable, or shrinking
4. **Cross-category correlation:** Whether multiple categories in the same region show similar patterns (suggesting a shared driver)
5. **Year-over-year comparison:** Whether the current deviation matches or exceeds the same-week-last-year pattern

### Anomaly Detection

An anomaly is flagged when:
1. The deviation exceeds the ±10% threshold (configurable per category)
2. The deviation has persisted for 2+ days (reduces false positives from daily noise)
3. The financial exposure exceeds the $5K materiality threshold

Each anomaly is then classified by severity (CRITICAL / HIGH / MEDIUM / LOW) using a composite score of deviation magnitude and financial exposure.

### How Strategic Insights Are Generated

Each visualization's Cortex AI Insight card is generated by analyzing the data behind that specific visualization:

1. **Key Findings:** Computed from the top anomalies, dominant drivers, and extreme values in the data. The system identifies the 3–5 most significant observations and presents them as bullet points.

2. **Business Implications:** Derived by applying business rules to the findings — e.g., "When 40% of SKUs exceed the 20% threshold, the forecast baseline needs recalibration" or "When Daily Erosion exceeds $200K, every hour of delay has material financial impact."

3. **Recommended Actions:** Generated by matching the dominant driver to a response playbook — weather-driven spikes need short-term replenishment, digital spikes need conservative ordering with expedite flexibility, promotion spikes need post-promo dip monitoring.

### How Dynamic Insights Work

Two visualizations have filter-responsive insights:

- **Portfolio Deviation Heatmap:** When the user selects specific departments, the insight recalculates based on the filtered scope — showing department-specific deviation patterns, sub-category hotspots, and scoped lost-sales exposure.

- **Root Cause Driver Attribution:** When the user filters by department, the insight recalculates driver contributions for that department alone — showing which drivers are dominant in that specific portfolio and providing department-specific action guidance.

This ensures the insights are always contextual and relevant to the user's current view, not generic observations about the entire portfolio.

---

## 11. Value Realization for Brightway Retail

### Measurable Outcomes

| Outcome | Before (Traditional) | After (Autonomous) | Improvement |
|---|---|---|---|
| **Time to detect anomaly** | 3–5 days | Immediate (overnight scan) | 90%+ reduction |
| **Time to diagnose root cause** | 3–5 additional days | Instant (pre-decomposed) | 95%+ reduction |
| **Time to sized recommendation** | 2–3 additional days | Instant (pre-computed) | 95%+ reduction |
| **Total detection-to-action cycle** | 7–14 days | <1 morning | 90%+ reduction |
| **Revenue at risk identified** | Ad-hoc, incomplete | $3.9M this week (systematic) | Complete coverage |
| **Revenue protected** | Unknown (no systematic tracking) | $2.5M recoverable | Quantified ROI |
| **Intervention cost** | Unmeasured | $18K (BCR: 16x) | Transparent cost-benefit |
| **Cross-department coordination** | Email-based, 2–3 day lag | Real-time cross-department signals | 2–3 day acceleration |
| **S&OP preparation time** | 4–8 hours per week | 15 minutes (pre-built briefing) | 90%+ reduction |

### Revenue Growth

The autonomous system captures revenue that would otherwise be lost to stockouts. This week's $2.5M in recoverable revenue represents demand that the traditional process would have missed — either because the anomaly would not have been detected in time, or because the response would not have been sized and approved before the demand eroded.

Over a 52-week cycle, if the system captures even 50% of the weekly recoverable revenue, the annualized impact is approximately $65M in protected revenue — against an annual revenue base of $2.2B, this represents a 3% revenue uplift purely from better demand response.

### Reduced Stockouts

The current 15.1% portfolio-wide stockout rate costs Brightway an estimated $320M annually in lost sales. The autonomous system targets reducing this to below 5% by identifying stockout risks 5–10 days before they manifest and triggering proactive replenishment. A 10-percentage-point reduction in stockout rate represents approximately $210M in annual revenue recovery.

### Reduced Excess Inventory

The -15% under-forecast anomalies (e.g., Artisan Breads in the Northeast) create excess inventory that eventually requires markdowns. The autonomous system detects these early and recommends inter-store transfers before markdown is necessary. This week's $42K in Artisan Breads markdown exposure was reduced to $18K through proactive transfer — a 57% markdown savings.

### Better Forecast Accuracy

The system identifies systematic forecast bias (-5.0% in Fresh & Grocery, -7.8% in Consumer Electronics) and flags it for model recalibration. Each 1-percentage-point improvement in MAPE reduces safety stock requirements by approximately 5% while maintaining the same service level — freeing working capital for other investments.

### Faster Response to Demand Shifts

The 7–14 day traditional cycle means that by the time a planner responds, the demand event may be half over. The autonomous system compresses this to hours, ensuring the full action window is available for response. For a heat-wave surge with a 14-day action window, the difference between responding on Day 1 vs. Day 7 is approximately $1.8M in additional captured revenue.

### Improved Customer Satisfaction

Empty shelves are the single largest driver of customer dissatisfaction in retail. By reducing stockouts from 15% to 5%, Brightway improves the customer experience for approximately 10% of shopping trips — reducing customer churn and increasing basket size as customers find the products they expect.

### Better Planning Efficiency

Each demand planner currently spends approximately 60% of their week on data gathering, cross-referencing, and manual analysis — leaving only 40% for judgment, decisions, and stakeholder engagement. The autonomous system inverts this ratio: 20% on validation and review, 80% on judgment and decisions. Across a team of 5 planners, this reclaims approximately 100 person-hours per week — equivalent to 2.5 additional FTEs of productive planning capacity without any hiring.

---

## 12. Complete Client Narrative

### A Day in the Life: Tuesday Morning at Brightway Retail

**7:45 AM — The Signals Have Arrived**

Over the long weekend, Brightway's demand signal repository has refreshed with the latest POS data, weather feeds, competitor pricing signals, and digital trend indices. The autonomous system completed its overnight scan at 4:00 AM, processing 46,139 weekly demand records across 42 product categories and 7 regions.

The result: 927 demand anomalies detected. 530 classified as high-impact. $3.9M in total revenue exposure identified, quantified, decomposed by root cause, projected forward 14 days, and converted into sized action recommendations — all before anyone has logged in.

**8:00 AM — Sarah Opens Her Morning Signal Pack**

Sarah Mitchell, Senior Demand Planner for Fresh & Grocery, opens the Autonomous Report. The KPI banner immediately tells her this is not a normal week: 927 anomalies, $3.9M at stake, 15.1% stockout rate.

She switches to the Demand Planner tab and scans the Anomaly Table. Milk in South-Central jumps out: CRITICAL severity, $126K at risk, +28.1% deviation, running for 4 days. She clicks into the Driver Attribution chart and sees the decomposition: Digital signals (+5.21pp) from a viral smoothie recipe trend, Weather (+2.20pp) from the Southeast heat wave, and the active BOGO promotion (+1.46pp) amplifying both.

The Heatmap confirms the geographic pattern: South-Central and Southeast are bright red for Fresh & Grocery, while the Northeast is normal. She selects "Fresh & Grocery" in the drill-down filter and sees that Dairy Products is the primary sub-category driving the department-level deviation.

Sarah validates: this is a real, multi-driver demand event — not noise. She adjusts her demand plan upward for Milk in the affected regions and flags the signal for David.

**Time: 8:25 AM. Traditional process: This would have taken 3–5 days.**

**8:30 AM — David Sizes the Response**

David Park, Supply Chain Planner, opens the Supply Planner tab. The Stockout Risk Table shows 9 stores in South-Central with pre-cut salads at 1.8 days of supply — below the 3-day lead time for standard delivery. The Recovery Timeline shows $253K eroding per day in Fresh & Grocery alone.

The ACT section presents a staged response:
- **Immediate:** Surge order of 4,400 units of pre-cut salads to 9 stores, next-day delivery. Cost: $6K. Revenue protected: $72K. BCR: 12x.
- **Same-day:** Transfer 800 units from nearby surplus stores to bridge the 1-day gap before the expedited order arrives. Cost: $1.5K. Revenue protected: $28K.
- **Standard:** Increase berry and stone fruit orders for 7 and 4 stores respectively. Revenue protected: $76K combined.

Total intervention cost: $18K. Total revenue protected: $142K. Portfolio BCR: 7.9x.

David approves the transfer and the berry/stone fruit orders within his authority. The salad expedite exceeds his per-order threshold — he routes it to his Supervisor with the 12x BCR attached.

**Time: 8:50 AM. Traditional process: This would have taken 7–10 additional days.**

**9:00 AM — Lisa Prepares for S&OP**

Lisa Hayes, Director of Demand Planning, opens the Director tab. The Executive Briefing Pack shows the enterprise picture:

- Fresh & Grocery: $2.0M at stake, $1.3M recoverable, most actions approved
- Consumer Electronics: $1.4M at stake (viral Portable Speakers spike), needs air-freight approval
- Seasonal & Home: $489K at stake, within Emily's authority

Cross-Department Contention: Fresh salad expedites and Consumer Electronics speaker air-freight both need 48-hour freight capacity. The system recommends: fund both ($18K to protect $162K). If budget is capped, salads first — perishable, higher return-per-dollar.

Lisa approves both freight allocations and the berry sourcing split. She has 2 decisions to make, not 20.

**Time: 9:15 AM. Traditional process: This would have required a 2-hour S&OP meeting after 2 weeks of cross-functional alignment.**

**Day 3 — The Outcome**

The expedited salad delivery arrives at all 9 South-Central stores on Wednesday morning — 12 hours before the projected stockout. The $72K in pre-cut salad revenue is captured. The berry sourcing split ensures reliable delivery despite Supplier B's declining OTIF. The store transfers bridged the critical 1-day gap for the most at-risk locations.

Total revenue captured from the coordinated response: $142K. Total intervention cost: $18K. Net benefit: $124K. Time from detection to complete resolution: less than 48 hours.

**The Feedback Loop**

The realized outcomes — actual demand vs. projected, actual supplier delivery vs. OTIF prediction, actual revenue captured vs. estimate — are logged and fed back into the system. The weather-demand elasticity for produce categories in the Southeast is updated. The digital signal decay model for viral social trends is refined. The supplier OTIF trend for Supplier B is flagged for continued monitoring.

Each cycle makes the next detection sharper, the next attribution more accurate, and the next recommendation more precisely sized. The system is not just reporting — it is learning.

---

**This concludes the Autonomous Retail Intelligence Report Business Guide.**

*The data, examples, and financial figures in this document are sourced from Brightway Retail's live demand signal repository (DEMANDSENSING_AI.DEMANDSENSING_SCHEMA) as of fiscal week FW202624, September 2026. All visualizations, insights, and recommendations are generated autonomously by the Vibe Analytics Demand Sensing platform running on Snowflake.*

---

*Vibe Analytics — Demand Sensing Edition | Powered by Snowflake Cortex AI + Multi-Agent Orchestration*
