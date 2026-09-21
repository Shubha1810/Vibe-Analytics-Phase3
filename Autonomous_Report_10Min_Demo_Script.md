# Autonomous Demand Sensing — Client Presentation Script (Detailed)

**Brightway Retail | Vibe Analytics — Demand Sensing Edition**
*Live Demo Narration — September 2026*
*Estimated Runtime: 12–15 minutes*

---

## OPENING INTRODUCTION (0:00 – 0:45)

"Good morning everyone, thank you for your time today."

"What I'm going to walk you through is something that fundamentally changes how a retail organization senses, interprets, and responds to demand — before it hits the shelf, before it impacts the P&L, and before customers even notice."

"We've built this for Brightway Retail — a $2.2 billion multi-department retailer operating 40 stores across 7 regions, with a strong omnichannel presence. They run three departments that are highly sensitive to demand volatility — Fresh & Grocery where products spoil in days, Consumer Electronics where one viral social media post can triple demand overnight, and Seasonal & Home where you have narrow selling windows and every week of excess inventory costs margin."

"Let me show you what this looks like in practice."

---

## THE BUSINESS PROBLEM (0:45 – 1:45)

"Here's the reality of demand planning in most retail organizations today."

"When something unexpected happens — say a heat wave hits the Southeast, or a product goes viral on social media, or a competitor suddenly runs out of stock — the demand planning team doesn't find out in real time. They find out days later, when the POS data refreshes and someone notices the numbers look off."

"Then begins the investigation. Pull the data. Cross-reference it with weather. Check the promo calendar. Look at what competitors are doing. Build a spreadsheet. Email supply chain. Wait for a response. Escalate to leadership. Get approval. Place the order."

"By the time all of that happens — 7 to 14 days have passed. For perishable goods, the shelf was empty a week ago. For trending electronics, the viral moment has already peaked and faded. The revenue opportunity is gone."

"The core problem is not that the data doesn't exist. It does — POS data, weather feeds, social media signals, competitor pricing, promotional calendars, supplier performance — it's all there. The problem is that no human being can scan all of it, connect the dots, quantify the impact, and generate a recommendation fast enough to matter."

"That's what this solution does."

---

## WHAT IS DEMAND SENSING (1:45 – 2:45)

"Before I show you the platform, let me explain what demand sensing actually means in business terms."

"Traditional forecasting looks backward. It says — based on last year's sales and seasonal patterns, here's what we think demand will be. And that works for the 70% of your business that's predictable."

"Demand sensing is about the other 30% — the part that changes because of things happening right now. A sudden heat wave that drives beverage and produce demand up 25% in two regions. A festival weekend that creates unexpected foot traffic and completely different basket compositions. A competitor running out of stock on a key item, sending their customers to your stores. A promotion that not only lifts the promoted product but transfers demand into complementary categories nobody planned for."

"The platform we've built doesn't just detect these signals — it decomposes them. It tells you exactly how much of a demand change is coming from weather, how much from a digital trend, how much from a promotion, and how much from competitor activity. And then it tells you what to do about it, how much it will cost, and how much revenue it protects."

"Think of it this way — instead of your planning team spending a week assembling a picture of what happened, the system assembles that picture overnight and presents it as a decision-ready package before anyone logs in Monday morning."

---

## THE THREE PERSONAS (2:45 – 3:45)

"The solution is structured around three personas that mirror how retail planning organizations actually work."

"The first is the **Demand Planner Persona**. This persona is responsible for detection and diagnosis. What changed across my product portfolio? Which categories are deviating from forecast? Where geographically is the stress concentrated? And most importantly — why is it happening? Is it weather? Is it a promotion exceeding plan? Is it a competitor stockout creating spillover demand? The Demand Planner Persona gets a complete root-cause decomposition — not just a number, but a fully explained signal."

"The second is the **Supply Planner Persona**. Once the demand signal is understood, this persona translates it into action. How long will this demand event last? Which stores are at risk of stockout? Exactly how many units should be ordered, from which supplier, through which delivery channel, and at what cost? Every recommendation comes with a cost-benefit ratio — so the supply planner knows the return on every dollar of intervention."

"The third is the **Executive Persona**. This persona sees the enterprise roll-up. All three departments, consolidated into one decision surface. Where are the cross-department conflicts? Which actions need leadership approval? What's the total revenue exposure and how much is the team protecting? The Executive Persona walks into the weekly S&OP meeting with a pre-built decision package — not a 50-slide deck that took someone three days to prepare."

"These three personas work as a chain. The Demand Planner Persona's diagnosis becomes the Supply Planner Persona's input. The Supply Planner Persona's recommendations become the Executive Persona's approval queue. Each layer adds value without repeating work."

---

## THE DETECT PHASE — VISUALIZATION WALKTHROUGH (3:45 – 6:00)

"Let me walk you through what each phase delivers, starting with Detect. The Detect phase answers one question — what just changed across my portfolio?"

"The platform scans the entire product universe — in Brightway's case, that's 42 product categories across 7 regions, over 46,000 weekly data points. It compares actual demand against the forecast baseline and surfaces every deviation above 10%. This week alone, it found 927 anomalies."

---

### Enterprise KPI Banner

"The first thing the Demand Planner Persona sees is this KPI banner — six vital signs for the entire business."

"Its purpose is simple — in 5 seconds, you know whether this is a normal week or an emergency."

"What it shows: 927 total anomalies, 530 high-impact items with more than $10,000 each at risk, $3.9 million in total revenue exposure, a 15.1% stockout rate, and 591,884 units at risk across all 3 departments."

"How the AI produces this — it aggregates every active anomaly from the current fiscal week, filters by the 10% deviation threshold, and computes revenue exposure using a per-SKU value-at-risk model. The high-impact filter at $10,000 is a configurable guardrail — it ensures planners focus on financially meaningful signals, not statistical noise."

"The business implication: when all 3 departments show active anomalies simultaneously, it signals either a broad external event like weather or a coincidence of department-specific events. The 15.1% stockout rate is three times the target of 5%. That tells the Demand Planner Persona — this is not a monitoring week, this is an action week. And the $481,000 in daily erosion means the financial picture gets materially worse with every day of inaction."

"In a typical low-signal week, Brightway sees about 200 anomalies with $500,000 at stake. This week's 927 anomalies and $3.9 million represent a 4x escalation — driven by a heat wave, a viral social media trend, and back-to-school promotional activity converging at the same time."

---

### Multi-Signal Anomaly Detection Table

"Next is the anomaly table — and this is the Demand Planner Persona's prioritized action list for the week."

"Its purpose is to rank every anomaly by severity and financial impact, so the planner knows exactly where to focus first."

"What it shows: every anomaly with its product category, region, severity classification, demand deviation percentage, value at risk in dollars, and the primary demand driver. The severity classification works like a triage system — Critical items have the highest revenue exposure and need same-day response, High-impact items need action within 2–3 business days, and Medium items go on the watchlist."

"How the AI classifies these — each anomaly is scored on a composite of deviation magnitude and dollar exposure. A 28% deviation on a $50,000 item is Critical. A 12% deviation on a $6,000 item is Medium. The system does this classification for all 927 anomalies overnight."

"Look at the top of this week's list: Milk in South-Central, Critical severity, $51,000 at risk, running 28% above forecast for 4 consecutive days. The primary driver says Digital — and that's a clue we'll follow into the Explain phase."

"The business implication: Milk dominates the top 5 positions, all driven by Digital signals. That tells the Demand Planner Persona this is a concentrated, demand-side event — not a supply failure, not a data error. It's a real demand surge that needs a real response."

"Think of it like a hospital emergency room triage. The Critical cases get treated first. The stable cases wait. Without this prioritization, the planner would be staring at 927 items trying to figure out where to start. With it, they start at the top and work down."

---

### Portfolio Deviation Heatmap

"Now the Demand Planner Persona wants to see the geographic picture — where exactly is the portfolio stressed?"

"The purpose of this heatmap is to show deviation patterns across departments and regions simultaneously. Red cells mean demand is running above forecast — stockout risk or opportunity to capture. Blue cells mean below forecast — markdown risk and excess inventory."

"What it shows at the default level: 3 departments across 7 regions — 21 cells, each showing the average deviation percentage. At a glance, the Demand Planner Persona can see that Consumer Electronics is running 30–32% above forecast across every single region — that's a national phenomenon, probably a digital or viral driver. Fresh & Grocery is concentrated in South-Central and Southeast — that points to a regional factor like weather or a local promotion."

"How the AI computes this — it aggregates over 46,000 weekly demand records at the department-region grain, computing the weighted average deviation for each cell. Lost sales units and stockout counts are also aggregated for the dynamic insight computation."

"Here's where it gets powerful — when the Demand Planner Persona selects one or more departments using the filter buttons at the top, the heatmap drills down from department level to sub-category level. So instead of seeing 'Fresh & Grocery is stressed,' you see 'Dairy Products is the sub-category driving 70% of the department deviation.' The AI insight card below the chart also updates dynamically — showing implications and actions specific to the filtered scope."

"This drill-down — from department to sub-category to specific product line — used to require the planner to build pivot tables for 2 hours. Now it's one click, and the insight updates in real time."

"Real-world example: during back-to-school season, the heatmap showed Seasonal & Home deeply blue in the Northeast but bright red in the Southeast. The national average looked normal — masking two opposing regional trends that each required completely different actions. Expedite outdoor furniture in the Southeast. Initiate markdowns in the Northeast. Without the geographic heatmap, the planner would have seen 'Seasonal is fine' and missed both."

---

### Portfolio Health Overview

"The last visualization in the Detect phase is the portfolio health histogram — and this is the overall vital sign for the entire portfolio."

"Its purpose is to show the statistical distribution of demand deviations. Think of it as a health check — is the portfolio broadly stable, or is it under systemic stress?"

"What it shows: a histogram where each bar represents a 5-percentage-point band. Green bars are the normal zone — within ±10% of forecast. Amber bars are the watch zone — 10 to 20% deviation, worth monitoring. Red bars are true anomalies beyond ±20% that need investigation. A statistics panel shows the mean, median, standard deviation, and skewness."

"How the AI reads this: it's not just the average that matters — it's the shape. A tight bell curve centered near zero means the forecast is well-calibrated. A right-skewed distribution means the forecast is systematically underestimating demand. A bimodal distribution with two peaks usually means there's a seasonal transition or a geographic divergence hiding inside the national average."

"This week: only 38% of SKUs are in the green zone. 40% are in the red. The mean is +13.8% with a positive skew of 0.31. That tells the Demand Planner Persona something important — this isn't a handful of outlier products. The entire portfolio is running above forecast. The baseline itself may need recalibration."

"The business implication is strategic, not just tactical. Individual anomaly responses fix individual problems. But when 40% of your portfolio is in the red zone, the Demand Planner Persona needs to escalate to the demand science team and say — our model is underperforming, we need a structural correction."

---

### Cross-Department Signal Awareness

"One more visualization in the Detect phase — and this one prevents the most expensive mistake in demand planning: siloed decision-making."

"Its purpose is to give each planner peripheral vision into what's happening in their peer planners' departments."

"What it shows: a card for each department summarizing the anomaly count, the top signal by revenue impact, and the dominant driver."

"Why this matters — when Fresh & Grocery and Consumer Electronics both need expedited freight in the same 48-hour window, and neither planner knows the other has the same need, they submit competing requests. The warehouse gets overwhelmed. One department gets served, the other doesn't. Revenue is lost — not because the system failed, but because the planners didn't have visibility into each other's needs."

"The AI flags these cross-department convergences proactively. This week, all 3 departments show simultaneous anomalies. The system surfaces this so the Demand Planner Persona can anticipate resource contention before it becomes a crisis."

"In practical terms — before calling supply chain to request an expedite, the planner checks this strip and says, 'Consumer Electronics also has a Critical item. I should coordinate with them before we both compete for the same freight capacity.' That 30-second check can save thousands of dollars in suboptimal logistics."

---

## THE EXPLAIN PHASE — VISUALIZATION WALKTHROUGH (6:00 – 8:00)

"Once you know what changed, the critical question is — why? That's the Explain phase."

"This is where most traditional dashboards stop. They tell you demand is up 28%. They don't tell you why. Our platform goes further — it decomposes every deviation into its root causes."

---

### Root Cause Driver Attribution

"This is the centerpiece of the Explain phase."

"Its purpose is to break down each demand deviation into five independent drivers — weather, digital and social media signals, promotional effects, competitor activity, and a residual component for anything unexplained."

"What it shows: a horizontal bar chart with product categories on the Y-axis and driver contributions in percentage points on the X-axis, stacked by driver type. Each driver has a distinct color. A confidence score panel on the right shows how reliable each attribution is, and multicollinearity flags appear when two drivers overlap — like when hot weather and 'BBQ recipe' searches both spike in the same week."

"How the AI decomposes this — it uses a multi-signal regression with cross-correlation checks. For weather, it applies historical elasticities — for produce categories, that's about 2.8% demand lift per degree above seasonal normal. For promotions, it compares actual lift against planned lift from the promotional calendar. For digital signals, it measures search volume and social media mentions, then dampens them by 15% when they correlate with weather to avoid double-counting. For competitor effects, it validates through store-pair analysis — comparing Brightway stores near a competitor stockout against Brightway stores that aren't nearby."

"This week, Digital signals are the dominant driver at +5.21 percentage points — nearly 2.5 times the next largest driver, Weather at +2.20 points. Promotions add +1.46 points. Competitor is slightly negative at -0.17 points."

"The business implication — and this is crucial — the correct response depends entirely on the cause. A weather-driven spike is temporary. It self-corrects when the heat breaks. The Demand Planner Persona should secure short-term replenishment but not over-order. A digital trend spike is unpredictable — it could fade in 5 days or accelerate. The response needs to be flexible — smaller initial orders with the option to reorder fast. A promotion-driven lift has a known end date, but the Demand Planner Persona should watch for post-promo demand dips."

"This visualization also has a department filter. When the Demand Planner Persona selects a single department, the chart, the insight card, and the recommended actions all update dynamically — showing driver patterns specific to that department. Fresh & Grocery might be weather-dominated while Consumer Electronics is digital-dominated. Same week, completely different response strategies."

"Practical example: during a winter storm, this chart showed Weather at +18 percentage points for Fresh & Grocery — classic panic buying — and Competitor at +8 points from nearby store closures. The combined deviation was +26%, but the Demand Planner Persona knew 70% would self-correct in 3 days when the storm passed. Only the 30% competitor component might persist. The replenishment was sized accordingly — enough for 3 days of elevated demand, not 2 weeks."

---

### 14-Day Recovery Trajectory

"The second visualization in the Explain phase projects the anomaly forward in time."

"Its purpose is to answer the most important question in demand planning — how much time do I have?"

"What it shows: a line chart projecting how the demand deviation will evolve over the next 14 days, based on when each driver is expected to fade. There's an action window shaded zone showing the optimal intervention period, and a daily erosion figure showing how much recoverable revenue is lost for every day of inaction."

"How the AI builds this projection — it takes each driver's expected persistence and overlays them forward. Weather uses the 14-day weather forecast to project when temperatures return to seasonal normal. Promotions use the promo calendar end-dates. Competitor effects use estimated restock timelines. Digital signals use a modeled decay curve — typically 50% decay within 5 days for viral trends. The confidence interval widens as the projection extends further out — high confidence for the first 5 days, medium for days 6 through 9, lower beyond that."

"This week for Fresh & Grocery: $1.3 million is recoverable today, but it's eroding at $253,000 per day. The action window is 14 days — but perishable items like pre-cut salads have effective windows of only 3 to 5 days. The benefit-cost ratio on intervention is 16.4 times — meaning every dollar spent on replenishment protects $16.40 in revenue."

"The business implication: this chart creates urgency with data, not panic. The Demand Planner Persona can show the Supply Planner Persona exactly why today's action protects $253,000 more than tomorrow's action. And the trajectory shows when the demand event is expected to fade — so the team doesn't over-order into a declining signal."

"Think of it like watching a window close in real time. For perishable categories, the window closes fast — days, not weeks. For durable goods like electronics, you typically have 2–3 weeks. The trajectory makes this visible and quantified."

---

## THE ACT PHASE — VISUALIZATION WALKTHROUGH (8:00 – 9:45)

"Now we move to Act — where the Supply Planner Persona takes the demand diagnosis and converts it into specific, costed supply actions."

---

### Stockout & Availability Risk Table

"The first tool in the Supply Planner Persona's view."

"Its purpose is to project which specific categories are approaching stockout based on current demand trajectories, existing inventory, and inbound replenishment timelines."

"What it shows: a table ranked by urgency — days to impact. If a product has 1.8 days of supply remaining but the standard delivery takes 3 days, those shelves will be empty before any normal replenishment arrives. Each row shows the category, region, value at risk, risk level, and primary driver."

"How the AI determines this — it combines the projected demand from the trajectory model with current on-hand inventory, safety stock levels, and inbound replenishment schedules. It also factors in supplier reliability — if a supplier's on-time delivery rate has dropped from 94% to 81% over the past three weeks, the stockout probability goes up even if the order has been placed."

"The business implication: items with less than 3 days to impact are emergencies — the shelf will be empty before standard replenishment can respond. The Supply Planner Persona works this table top to bottom. Items under 3 days get same-day inter-store transfers from nearby surplus stores. Items at 3–5 days get expedited delivery. Items beyond 5 days can use standard replenishment but should be staged proactively."

"Practical example: last quarter, this table flagged a premium yogurt category in the West at 1.5 days to impact. The Supply Planner Persona approved a same-day transfer of 600 units from the Midwest, which had 5 days of surplus. The transfer cost $1,200 in logistics but protected $38,000 in revenue — a 32x return. The standard replenishment cycle would have taken 4 days, during which 3 stores would have been out of stock."

---

### Prescriptive Action Cards

"This is where the system becomes truly prescriptive."

"The purpose of these action cards is to convert risk projections into specific, sized, costed recommendations — each with a clear action, expected impact, cost, confidence level, and authority-level tag."

"What each card shows: the exact action — like 'Expedite 4,400 units of pre-cut salads to 9 South-Central stores, next-day delivery.' The revenue protected — $72,000. The cost — $6,000 in expedite premium. The benefit-cost ratio — 12x. And the authority tag — whether this is within the Supply Planner Persona's approval limit or needs escalation."

"How the AI sizes these — the order quantity is calculated as target days of cover multiplied by projected daily demand, minus current on-hand, rounded to the case pack size and capped by the days-of-supply corridor. The delivery mode is chosen by comparing days-to-stockout against available lead-time options. The cost includes any expedite premium. And the authority check compares the total cost against per-role threshold guardrails."

"The business implication: each card is a pre-built business case. Instead of the Supply Planner Persona spending 3 days building a justification for an expedite, the justification is already there — the numbers, the ROI, the approval path. The conversation shifts from 'should we act?' to 'do we agree with the size and timing of this action?'"

"The ACT section also has its own Cortex AI Insight card that summarizes the full action package — how many actions are recommended, how many are within planner authority versus requiring escalation, the total revenue protected, total cost, and portfolio benefit-cost ratio."

---

### Executive Briefing Pack

"Finally, the Executive Persona's view — the Communicate phase."

"Its purpose is to consolidate all departmental signals, actions, and contentions into a single decision surface for the weekly S&OP meeting."

"What it shows: an enterprise summary table with each department's revenue at stake, recoverable value, and action status. A cross-department contentions section showing where departments compete for the same resources. And a pending approvals queue with the items that exceed planner authority."

"How the AI builds this — it rolls up all per-department anomalies, actions, and financial summaries. It identifies cross-department contentions by checking whether two or more departments have competing claims on the same resource — expedited freight, warehouse capacity, shared supplier slots."

"This week's enterprise picture: Fresh & Grocery has $2 million at stake with $1.3 million recoverable. Consumer Electronics has $1.4 million from the viral speaker spike. Seasonal & Home has $489,000 with the longest action window. Total enterprise exposure: $3.9 million."

"The cross-department contention this week: Fresh & Grocery's salad expedites and Consumer Electronics' speaker air-freight both need the same 48-hour freight capacity. The AI recommendation: fund both — $18,000 total to protect $162,000. If the budget is capped, salads first because they're perishable and have a higher return per dollar."

"The business implication: the Executive Persona walks into S&OP with exactly 2 decisions to make, not 20. Most actions are already approved within planner authority. The 2 escalated items come with quantified trade-offs and a clear recommendation. Decision time: under 10 minutes."

"What used to be a 2-hour alignment meeting built on different versions of the truth becomes a 15-minute decision meeting built on a single, auditable recommendation package."

---

## BUSINESS DRIVERS (9:45 – 10:15)

"Let me briefly touch on the drivers that power this analysis."

"The platform considers five categories of demand signals. Weather patterns — because a 10-degree temperature swing can move perishable demand by 25% in affected regions. Digital and social trends — because a viral post can triple demand overnight with zero warning in traditional data. Promotional activity — because actual lift often exceeds planned lift, and promotions create demand transfer into complementary categories that nobody forecasted. Competitor dynamics — because a competitor stockout or price change redirects customer traffic within hours. And seasonal baselines — because the system needs to distinguish genuine anomalies from normal seasonal variation."

"What makes this powerful is not any single driver in isolation. It's the combination. When weather, digital signals, and a promotion all converge on the same product in the same region at the same time, the demand impact compounds. A 2-point weather effect plus a 5-point digital effect plus a 1.5-point promo effect doesn't add to 8.5 — the convergence amplifies the response. The platform detects these convergences and quantifies each driver's contribution independently, while checking for double-counting between correlated signals."

---

## END-TO-END BUSINESS SCENARIO (10:15 – 11:45)

"Let me bring this all together with a complete scenario from start to finish."

"It's Monday morning. A heat wave has been building in the southern US over the weekend. At the same time, a social media recipe trend has gone viral featuring a summer smoothie that requires fresh milk and berries. And Brightway has an active buy-one-get-one promotion on dairy products."

"The platform's overnight scan detects a 28% demand surge in dairy categories across the South-Central and Southeast regions. 927 anomalies total, 530 high-impact. $3.9 million at stake across the enterprise."

"The **Demand Planner Persona** opens the report and sees the KPI banner — this is a 4x escalation from a normal week. The anomaly table ranks Milk at the top with $126,000 at risk across two regions. The heatmap confirms the stress is regional, not national — South-Central and Southeast are bright red. The drill-down into Fresh & Grocery shows Dairy Products as the primary sub-category. The portfolio health histogram confirms this isn't a few outliers — 40% of the portfolio is in the anomaly zone."

"Moving to Explain: the driver attribution decomposes the 28% Milk deviation. Digital signals contribute +5.21 percentage points from the viral smoothie trend. Weather adds +2.20 points from the heat wave. The active BOGO promotion adds +1.46 points. These three drivers are all pushing in the same direction — high confidence, not noise. The 14-day recovery trajectory shows the spike holds for 5 more days while heat and promo overlap, then decays to +12% when the promo ends, settling near +6% by Day 10. Recoverable value: $1.3 million — eroding at $253,000 per day."

"The signal flows to the **Supply Planner Persona**. The stockout risk table shows 9 stores will run out of pre-cut salads within 3 days. The action cards recommend: surge order of 4,400 units with next-day delivery at $6,000, protecting $72,000 — a 12x return. Same-day transfer of 800 units from surplus stores to bridge the 1-day gap. Berry orders sized with a supplier split — 60% from the primary supplier, 40% from a backup, because the primary supplier's delivery reliability has been declining."

"One action exceeds the supply planner's approval limit. It routes to the **Executive Persona** along with one other contested item — Consumer Electronics also needs expedited freight for the viral speaker spike. The system flags the resource conflict and recommends: fund both expedites, $18,000 total to protect $162,000. If constrained, prioritize the perishable goods."

"The Executive Persona reviews, approves both in under 10 minutes. Stores receive the expedited dairy delivery on Tuesday. Shelves stay stocked. Revenue is captured. Total cost: $18,000. Total revenue protected: $142,000."

"What would have taken 7 to 14 days of investigation, spreadsheets, emails, and committee meetings — happened in a single morning."

---

## VALUE REALIZATION (11:45 – 12:30)

"Let me put numbers on the business impact."

"This week alone: $3.9 million in revenue at risk identified. $2.5 million recoverable with timely action. $481,000 eroding every single day of inaction. Total intervention cost: $18,000. Return: 16 times the investment."

"The structural improvements go beyond one week. Planners spend 80% less time finding problems and 80% more time solving them. Stockout rates come down from 15% toward the 5% target — in dollar terms, a 10-percentage-point improvement in stockout rate represents over $200 million in annual revenue recovery for a retailer of Brightway's size."

"Markdown exposure is caught early and redirected through inter-store transfers before it becomes a write-down. Forecast bias — the systematic under-forecasting we saw in the portfolio health histogram — is identified and fed back for model recalibration. So the baseline gets better every cycle."

"And the S&OP meeting transforms. Instead of a 2-hour alignment session where everyone brings different numbers, it becomes a 15-minute decision meeting built on a single source of truth with pre-staged recommendations."

"Over a full year, even capturing half of the weekly recoverable revenue represents approximately $65 million in protected revenue against a $2.2 billion base — a 3% revenue uplift from better demand response alone."

---

## CLOSING REMARKS (12:30 – 13:00)

"To close — this is not about replacing planning teams. The Demand Planner Persona still makes the judgment call on whether to adjust the forecast. The Supply Planner Persona still decides whether the expedite is justified. The Executive Persona still resolves the cross-department trade-offs."

"What changes is where they spend their time. Instead of assembling information, they're interpreting it. Instead of building business cases from scratch, they're reviewing pre-built recommendations. Instead of reacting to last week's problems, they're responding to this week's signals before those signals become next week's problems."

"Every visualization in the report — every anomaly table, every heatmap, every driver chart, every action card — has its own AI-generated insight card that explains what the data means, what the business implications are, and what actions should be taken. These insights are contextual to the specific visualization, they update dynamically when filters are applied, and they are tailored to the persona viewing them."

"That's the shift — from reactive reporting to autonomous decision intelligence. From 'what happened last week' to 'here's what to do about it before it impacts the business.'"

"Thank you. I'm happy to take questions."

---

## Q&A READY-REFERENCE

**"How does it handle signals it hasn't seen before?"**
"The driver framework captures five known demand forces. When something unexplained appears, it shows up in the Residual component. A high residual flags the team to investigate — it's a built-in signal that the model is encountering something new."

**"Does the system execute actions automatically?"**
"No. Every recommendation is staged for human review and approval. The system surfaces the decision, quantifies the trade-off, and routes it to the right authority level. The planner always makes the final call."

**"Can this work for our categories?"**
"The framework is category-agnostic. The same five drivers apply to any retail category. The elasticities and thresholds are calibrated from historical data specific to each product line."

**"How are the AI insight cards generated?"**
"Each insight card is computed from the data behind its specific visualization — not from a generic narrative. The system identifies the top findings, evaluates the business implications using rule-based analysis, and generates recommended actions matched to the dominant driver type. When a user applies a filter, the insight recalculates based on the filtered scope."

**"What's the ROI?"**
"This week: $18,000 in intervention cost protected $142,000 in revenue. Annualized, even capturing half of the weekly recoverable value represents roughly $65 million in protected revenue against a $2.2 billion base — a 3% revenue uplift."

**"How often does it run?"**
"The autonomous scan runs every planning cycle, currently weekly. The underlying data feeds refresh more frequently, so the system always works with the most current signals."

---

*Total runtime: 12–15 minutes depending on pacing. The script runs about 13 minutes at natural speaking speed. If you need to tighten to 10 minutes, abbreviate the Detect phase by covering KPI Banner and Anomaly Table in detail but summarizing the Heatmap, Portfolio Health, and Cross-Department views in one paragraph each. The Explain and Act phases are already concise and should not be cut.*
