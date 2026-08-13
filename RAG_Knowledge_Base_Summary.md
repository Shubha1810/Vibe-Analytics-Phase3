# RAG Knowledge Base — Complete Document Summary

> **Source:** `DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RAG_KNOWLEDGE_BASE`
> **Total Documents:** 30
> **Categories:** CONTRACT (8), POLICY (8), RESEARCH (6), SOP (8)
> **Cortex Search Service:** `DEMAND_SENSING_RAG_SEARCH`

---

## Table of Contents

1. [CONTRACTS (8 documents)](#contracts)
2. [POLICIES (8 documents)](#policies)
3. [RESEARCH NOTES (6 documents)](#research-notes)
4. [STANDARD OPERATING PROCEDURES (8 documents)](#standard-operating-procedures)

---

## CONTRACTS

### CONTRACT-001 — Master Supply Agreement: Perez Inc (SUP-00001)
| Field | Value |
|-------|-------|
| Department | Consumer Electronics |
| Personas | Mark Thompson, David Park |
| Tags | supplier, contract, China, lead-time, expedite, Perez-Inc |

**Summary:** Supply agreement with Perez Inc, a China-based supplier with a 98.6/100 reliability score and 6/100 risk score. Covers consumer electronics (Outdoor Bluetooth Speakers, Smart Home Devices, LED Lighting). Key terms: 14-day standard lead time, 7-day expedite via air freight (+35% surcharge), 500-unit MOQ, 95% OTIF target. Volume discounts at 5% (>2K units) and 8% (>5K units). Includes demand sensing integration with weekly 13-week forecast sharing, 15% capacity buffer, +30% spike protocol with 7-day notice, and 48-hour stockout expedite guarantee. Covers 45 SKUs across 3 DCs.

---

### CONTRACT-002 — Master Supply Agreement: Prince-Gill (SUP-00003)
| Field | Value |
|-------|-------|
| Department | Fresh & Grocery |
| Personas | Sarah Mitchell, David Park |
| Tags | supplier, contract, Canada, fresh-produce, JIT, Prince-Gill, berries |

**Summary:** Agreement with Prince-Gill (Canada), a premium fresh produce supplier with 97.3/100 reliability and 5/100 risk. Supplies berries, stone fruit, salad greens, and organic vegetables. Key terms: 5-day lead time (cross-border truck, USMCA), 2-day expedite, daily orders permitted (JIT), 97% OTIF target, 99% fill rate, cold chain at 34-38°F. Emergency replenishment within 12 hours with no MOQ. Primary supplier for the `fresh_produce_heatwave` scenario. Weather-linked: automatic +20% allocation when temperature exceeds 85°F. Serves 38 SKUs across Northeast and Midwest DCs. Seasonal availability May-October (peak).

---

### CONTRACT-003 — Master Supply Agreement: White PLC (SUP-00005)
| Field | Value |
|-------|-------|
| Department | Seasonal & Home |
| Personas | Emily Carter, David Park |
| Tags | supplier, contract, US, patio-furniture, long-lead-time, White-PLC |

**Summary:** US-based manufacturer of patio furniture, outdoor grills, and large garden equipment. Reliability 91.1/100, risk 12/100 (LOW-MEDIUM). Longest domestic lead time at 30 days due to complex manufacturing. 90% OTIF target (below network average — improvement plan active). Single-source risk for 8 SKUs (no backup). 45-day safety stock buffer maintained for single-source items. Seasonal: 60% of volume ships in fiscal weeks 10-26 (March-June). Pre-season booking requires firm orders 90 days in advance. Relevant to `patio_furniture_drop` scenario. Active improvement plan targeting 93% OTIF by Q4 2026. 22 SKUs total.

---

### CONTRACT-004 — Master Supply Agreement: Chavez-Curry (SUP-00006)
| Field | Value |
|-------|-------|
| Department | Fresh & Grocery |
| Personas | Sarah Mitchell, David Park |
| Tags | supplier, contract, Mexico, avocados, risk, Chavez-Curry, USMCA |

**Summary:** Mexico-based supplier with elevated risk profile (88.4/100 reliability, 32/100 risk — highest in portfolio). Supplies avocados, citrus, tropical fruit, prepared salsas, pottery, and ceramic planters. 10-day lead time via USMCA cross-border (Laredo crossing). 88% OTIF target (below standard). Risk factors: tariff uncertainty, single border crossing bottleneck, limited financial capacity, 4.2% rejection rate. Mitigation: developing alternate supplier for 40% of volume, establishing Nogales backup crossing, quarterly audits. Maintains 21-day safety stock (vs standard 14-day). 28 SKUs.

---

### CONTRACT-005 — Master Supply Agreement: Adkins and Sons (SUP-00017)
| Field | Value |
|-------|-------|
| Department | Consumer Electronics |
| Personas | Mark Thompson, David Park |
| Tags | supplier, contract, US, speakers, viral-demand, Adkins, premium-partner |

**Summary:** Premium US-based partner (97.7/100 reliability, 10/100 risk) and primary supplier for the `viral_speaker_spike` scenario. Supplies premium audio equipment and Outdoor Bluetooth Speakers. 21-day standard lead time, 10-day expedite. Strategic partner status with priority allocation. Viral demand response protocol: +50% surge with 10-day notice, +100% with 14-day notice (25% premium). Maintains 6-week component buffer for top 5 SKUs. 4-hour response SLA during spike events. Sole supplier for Outdoor Bluetooth Speaker category — 19,278 incremental unit capacity. $1.85M revenue impact from viral scenario. 18 SKUs.

---

### CONTRACT-006 — Master Supply Agreement: Taylor-Ortega (SUP-00018)
| Field | Value |
|-------|-------|
| Department | Fresh & Grocery |
| Personas | Sarah Mitchell, David Park |
| Tags | supplier, contract, Canada, dairy, yogurt, organic, Taylor-Ortega |

**Summary:** Canada-based supplier (97.5/100 reliability, 5/100 risk) for organic dairy, premium yogurt, artisan cheeses, and plant-based alternatives. B-Corp certified, carbon-neutral shipping. Primary supplier for `premium_yogurt_lift` scenario. 10-day lead time, 4-day expedite. 97% OTIF, 99% fill rate (highest in supplier base). Supports +20% above forecast with 5-day notice. Cold-chain guaranteed at 34°F. 21-day minimum shelf life at delivery. Key sustainability partner for Brightway private-label organic range. Consumer data shows 62% of premium yogurt buyers cite sustainability as purchase driver. 32 SKUs. Backup: Miller Ltd (SUP-00019).

---

### CONTRACT-007 — Vendor-Funded Promotion Agreement (Multi-Supplier)
| Field | Value |
|-------|-------|
| Department | All |
| Personas | Sarah Mitchell, Mark Thompson, Emily Carter |
| Tags | vendor-funded, promotion, co-op, funding, advertising, margin |

**Summary:** Master terms for vendor-funded promotional events across all 25 vendors. Three funding models: (A) Fixed Co-Op (5-15% of wholesale per promoted unit), (B) Performance-Based (per incremental unit above 4-week baseline), (C) Display Fee ($5K/week endcap, $3K feature aisle, $8K digital homepage). Guardrails apply: max 40% discount even with full vendor funding (GR-002), 18% margin floor after offset (GR-001). FY2026 stats: 2,847 of 7,144 promos are vendor-funded (39.8%), average 8.2% contribution, 22% higher ROI vs Brightway-funded. Top partners: Perez Inc, Adkins and Sons, Taylor-Ortega.

---

### CONTRACT-008 — Logistics & Transportation Master Agreement (DC Network)
| Field | Value |
|-------|-------|
| Department | All |
| Personas | David Park, Lisa Hayes |
| Tags | logistics, DC, transportation, delivery, capacity, supply-chain |

**Summary:** Covers Brightway's 6 distribution centers serving 40 stores + 1 eCommerce FC. DC assignments: Northeast (8 stores), Southeast (8), Midwest (8), West (8), South-Central (6), Mid-Atlantic (2). Transport SLAs: next-day delivery (same-region), 2-3 days cross-DC, same-day emergency (+50% surcharge, max 3/day/DC). Standard capacity: 15 FTL/DC/day, +40% peak season pre-booked. Cross-DC transfer rules: donor needs >7 days supply AND recipient <1.5 days (fresh) or <7 days (non-perishable). Average cost: $0.45-$0.85/case. Target: OTIF >= 85%, fill_rate >= 95%.

---

## POLICIES

### POLICY-001 — Gross Margin Protection (GR-001)
| Field | Value |
|-------|-------|
| Severity | High |
| Scope | All Departments |
| Owner | Finance |
| Personas | Lisa Hayes, Sarah Mitchell, Mark Thompson, Emily Carter |

**Summary:** Non-negotiable minimum gross margin floor of 18% at SKU-store-day level. Calculation: (revenue - COGS - markdown_cost + vendor_funding) / revenue. Action on breach: BLOCK — system prevents pricing actions that violate. Covers store labor (8%), overhead (5%), shrink (2%), transport (3%). Exceptions (VP Finance approval): end-of-season clearance (15% for perishables), competitive match (7 days max), new store opening (14 days at 15%), private label launch (16% for 4 weeks). Real-time validation on all price changes.

---

### POLICY-002 — Maximum Promotional Discount Cap (GR-002)
| Field | Value |
|-------|-------|
| Severity | High |
| Scope | All Departments |
| Owner | Merchandising |
| Personas | Sarah Mitchell, Mark Thompson, Emily Carter, Lisa Hayes |

**Summary:** No promotional discount may exceed 40% off regular price without VP Merchandising approval. Protects brand equity, prevents reference-price erosion, and maintains vendor MAP compliance. Discount tiers: 5-10% (standard), 11-20% (event-driven), 21-30% (competitive/clearance), 31-40% (deep clearance/vendor-funded max), 41-50% (VP required), >50% (board notification — liquidation only). BOGO offers treated differently (50% effective but positioned as value-add). Even 100% vendor-funded promos cannot exceed 40%.

---

### POLICY-003 — Fresh Product Stockout Threshold (GR-003)
| Field | Value |
|-------|-------|
| Severity | CRITICAL |
| Scope | Fresh & Grocery |
| Owner | Supply Chain |
| Personas | David Park, Sarah Mitchell |

**Summary:** Fresh & Grocery must maintain minimum 1.5 days of supply at all times. Only CRITICAL-severity guardrail (perishable stockouts = irreversible lost sales). Calculation: ending_on_hand_units / avg_daily_demand_units (7-day trailing). Breach triggers immediate SOP-002 emergency replenishment: automated alert to David Park + Sarah Mitchell, first response within 30 minutes, supplier contact within 1 hour. Weather adjustment: during heatwave (temp >+8°F above seasonal), uses forward-looking demand estimate. Store variation: Tier 1 = 150-300 units, Tier 3 = 20-50 units, eCommerce FC = 2.5-day threshold.

---

### POLICY-004 — Electronics Overstock Cap (GR-004)
| Field | Value |
|-------|-------|
| Severity | Medium |
| Scope | Consumer Electronics |
| Owner | Planning |
| Personas | Mark Thompson, David Park |

**Summary:** Consumer Electronics must not exceed 45 days of supply. Flags SKU-store combinations for clearance review to prevent capital lockup and obsolescence risk. Rationale: CE products depreciate 1-3% per week past peak; average lifecycle = 18 months. Mark Thompson reviews within 48 hours with decision: hold (with justification), markdown (per SOP-004 adapted), or transfer to higher-velocity location. Interaction with viral_speaker_spike: post-spike inventory may breach this threshold — must clearance non-trendy variants while protecting core SKUs.

---

### POLICY-005 — Auto-Reorder Spend Limit (GR-005)
| Field | Value |
|-------|-------|
| Severity | High |
| Scope | All Departments |
| Owner | Procurement |
| Personas | Lisa Hayes, David Park |

**Summary:** No single purchase order may exceed $250,000 without Director-level approval. Prevents runaway automated replenishment from over-committing capital during demand spikes where AI may overreact. System holds PO in "Pending Approval" status until Director authorizes. Critical during high-deviation scenarios (e.g., viral_speaker_spike could generate POs exceeding limit). Emergency protocol: if fresh item stockout + SOP-002 active, expedited approval pathway (2-hour SLA).

---

### POLICY-006 — Weekly Price Increase Cap (GR-006)
| Field | Value |
|-------|-------|
| Severity | Medium |
| Scope | All Departments |
| Owner | Pricing |
| Personas | Sarah Mitchell, Mark Thompson, Emily Carter |

**Summary:** Weekly list-price increases capped at 10% to prevent price shock and maintain competitive positioning. Breach action: hold price change, requires pricing committee review and customer communication plan. Rationale: sudden price jumps drive customers to competitors and damage trust. Exceptions: cost-pass-through from verified supplier increases (with documentation), seasonal price resets at defined calendar transitions, new product launch pricing.

---

### POLICY-007 — Seasonal Markdown Window (GR-007)
| Field | Value |
|-------|-------|
| Severity | Medium |
| Scope | Seasonal & Home |
| Owner | Merchandising |
| Personas | Emily Carter, Lisa Hayes |

**Summary:** Seasonal items within 4 weeks of season-end must begin markdown glidepath if days_of_supply exceeds target. Prevents dead-stock accumulation while maximizing recovery value. Triggers SOP-004 execution. Markdown tiers: Week 4 (15% off), Week 3 (25% off), Week 2 (30% off), Final week (40% off — terminal). Must maintain GR-001 (18% margin) at each tier. Particularly relevant to patio furniture (season end = fiscal week 30) and holiday décor categories.

---

### POLICY-008 — AI Recommendation Confidence Floor (GR-008)
| Field | Value |
|-------|-------|
| Severity | High |
| Scope | All Departments |
| Owner | Analytics |
| Personas | Lisa Hayes, Sarah Mitchell, Mark Thompson, Emily Carter, David Park |

**Summary:** AI-generated recommendations with confidence_score below 0.60 are SUPPRESSED from auto-execution and presented for human review only. Prevents autonomous action on low-certainty predictions. Confidence calculation factors: data quality, model fit, scenario novelty, external variable uncertainty. Triage via SOP-007: confidence 0.60-0.75 = review recommended; 0.75-0.90 = auto-execute with notification; >0.90 = full auto-execute. Below 0.60 requires explicit persona approval to proceed. Monthly calibration review ensures threshold remains appropriate.

---

## RESEARCH NOTES

### RESEARCH-001 — Heatwave Impact on Fresh Produce Demand
| Field | Value |
|-------|-------|
| Department | Fresh & Grocery |
| Personas | Sarah Mitchell, David Park, Lisa Hayes |
| Tags | research, heatwave, weather, fresh-produce, demand-spike, scenario, Southeast |
| Scenario | `fresh_produce_heatwave` (ACTIVE) |

**Summary:** Documents a sustained July 2026 heatwave across Southeast and South-Central regions driving +26.1% demand deviation in Fresh & Grocery. Affected categories: Salads & Pre-Cut Greens, Berries, Stone Fruit, Avocados. Provides demand signal decomposition from FACT_DEMAND_DAILY, historical precedent analysis, and projected duration. Links to GR-003 (fresh stockout threshold), SOP-002 (emergency replenishment), and Prince-Gill supplier contract for emergency response. Includes weather-demand elasticity coefficients and region-specific impact factors.

---

### RESEARCH-002 — Viral Social Media Product Spike (Outdoor Bluetooth Speakers)
| Field | Value |
|-------|-------|
| Department | Consumer Electronics |
| Personas | Mark Thompson, David Park, Lisa Hayes |
| Tags | research, viral, social-media, speakers, demand-spike, scenario, influencer, digital |
| Scenario | `viral_speaker_spike` (ACTIVE) |

**Summary:** Analyzes an +82.6% demand spike across all regions for Outdoor Bluetooth Speakers triggered by a lifestyle influencer (12M followers) posting a camping video featuring the BrightWave Pro speaker (SKU-000312) — 4.2M views in 72 hours. Combined with summer outdoor season and competitor stockouts, represents $1.85M revenue opportunity. Documents viral propagation mechanics, demand decay modeling, supplier response capacity (Adkins and Sons: 19,278 incremental units), and pricing strategy (no discounting during spike — preserve margin). Scenario confidence: 0.90 (HIGH).

---

### RESEARCH-003 — Patio Furniture Demand Decline (Northeast/Midwest)
| Field | Value |
|-------|-------|
| Department | Seasonal & Home |
| Personas | Emily Carter, David Park, Lisa Hayes |
| Tags | research, patio-furniture, seasonal-decline, weather, competitor, markdown, overstock |
| Scenario | `patio_furniture_drop` (ACTIVE) |

**Summary:** Documents -21.6% demand deviation from plan for Patio Furniture Sets in Northeast and Midwest. Root causes: unseasonable cool/rainy June in Northeast, aggressive competitor promotions, declining consumer confidence in these regions. Provides historical pattern analysis, competitor promotional intelligence, and recommended response (trigger GR-007 markdown glidepath, cross-DC transfer to stronger markets, reduce forward purchase commitments). Links to White PLC contract cancellation terms and SOP-004 markdown execution.

---

### RESEARCH-004 — NRF 4-4-5 Fiscal Calendar Guide
| Field | Value |
|-------|-------|
| Department | All |
| Personas | Lisa Hayes, Sarah Mitchell, Mark Thompson, Emily Carter, David Park |
| Tags | research, NRF, fiscal-calendar, 4-4-5, seasonality, planning, methodology |
| Type | PERMANENT Reference |

**Summary:** Definitive reference guide for Brightway's NRF 4-4-5 fiscal calendar. Critical rule: never use YEAR(transaction_date) or QUARTER(transaction_date) for analysis — always use fiscal_year, fiscal_quarter, fiscal_week from DIM_DATE. Calendar divides year into 4 quarters of 13 weeks (months of 4-4-5 weeks). Documents fiscal year start/end logic, week numbering, year-over-year comparison methodology, seasonal planning windows, and integration with all demand planning queries. Permanent reference document — foundational for all time-based analytics.

---

### RESEARCH-005 — Consumer Confidence Index Impact on Electronics Demand
| Field | Value |
|-------|-------|
| Department | Consumer Electronics |
| Personas | Mark Thompson, Lisa Hayes |
| Tags | research, CCI, consumer-confidence, economics, electronics, demand-elasticity, macro |
| Type | Analytical Framework |

**Summary:** Establishes Consumer Confidence Index (CCI) from DIM_EXTERNAL_MACRO as a leading indicator for Consumer Electronics demand with 4-6 week lag. Documents the correlation methodology, elasticity coefficients by product tier (premium electronics more CCI-sensitive than budget), regional variation, and practical application for forward demand planning. Used by Mark Thompson for proactive inventory positioning when CCI shifts are detected. Includes historical validation showing CCI-to-demand correlation R² and actionable thresholds.

---

### RESEARCH-006 — Competitor Stockout Analysis & Market Share Capture
| Field | Value |
|-------|-------|
| Department | All |
| Personas | Sarah Mitchell, Mark Thompson, Emily Carter, David Park |
| Tags | research, competitor, stockout, market-share, availability, switching, intelligence |
| Type | Methodology + Current Intelligence (ACTIVE) |

**Summary:** Documents Brightway's methodology for detecting, quantifying, and capitalizing on competitor stockout events. Uses FACT_DEMAND_DAILY signals: competitor_price_index and competitor_availability_pct. When competitor availability drops below threshold, excess demand switches to Brightway (switching elasticity varies by category). Covers: detection algorithms, demand uplift quantification, inventory pre-positioning response, pricing strategy (maintain price vs. tactical increase), and post-event analysis. Currently active for viral_speaker_spike scenario where competitor stockouts are amplifying Brightway's demand.

---

## STANDARD OPERATING PROCEDURES

### SOP-001 — Daily Demand Signal Review Process
| Field | Value |
|-------|-------|
| Department | All |
| Personas | Sarah Mitchell, Mark Thompson, Emily Carter, David Park, Lisa Hayes |
| Tags | demand-review, morning-signal, anomaly-detection, escalation |

**Summary:** Defines the daily 7:00-9:00 AM morning review workflow for demand signals across all 450 SKUs, 41 store nodes, and 7 regions. Ensures anomalies are detected, triaged, and escalated before replenishment cut-off times. Each persona reviews their department's signals, flags deviations above threshold (±15%), and decides: acknowledge (expected), investigate (unclear), or escalate (critical). Feeds into all other SOPs as the primary signal detection mechanism.

---

### SOP-002 — Emergency Replenishment Escalation (Fresh & Grocery)
| Field | Value |
|-------|-------|
| Department | Fresh & Grocery |
| Personas | David Park, Sarah Mitchell |
| Tags | emergency, replenishment, fresh, stockout, expedite, GR-003 |

**Summary:** Expedited replenishment process triggered when fresh items fall below 1.5 days of supply (GR-003). Trigger: days_of_supply < 1.5 OR stockout_flag = TRUE for any Fresh & Grocery SKU. Response timeline: automated alert (immediate), supplier contact (within 1 hour), PO confirmation (within 2 hours), shipment (within 12-24 hours depending on supplier). Covers supplier escalation hierarchy (Prince-Gill primary, Chavez-Curry secondary), cross-DC emergency transfer protocols, and store-level allocation when supply is constrained.

---

### SOP-003 — Promotional Lift Analysis Workflow
| Field | Value |
|-------|-------|
| Department | All |
| Personas | Sarah Mitchell, Mark Thompson, Emily Carter |
| Tags | promotion, lift-analysis, ROI, cannibalization, GR-001, GR-002 |

**Summary:** Standardized process for measuring promotional effectiveness using FACT_PROMOTIONS data. Covers net lift calculation accounting for cannibalization and halo effects. Methodology: baseline = 4-week pre-promo average → gross lift = promo sales - baseline → net lift = gross lift - cannibalization + halo. ROI formula accounts for markdown cost, vendor funding, and incremental margin. Applies to all 7,144 promotional events. Validates against GR-001 (margin) and GR-002 (discount cap). Post-promo dip analysis determines minimum gap before next promotion.

---

### SOP-004 — Seasonal Markdown Glidepath Execution
| Field | Value |
|-------|-------|
| Department | Seasonal & Home |
| Personas | Emily Carter, Lisa Hayes |
| Tags | markdown, seasonal, clearance, glidepath, GR-007, GR-001, patio-furniture |

**Summary:** Systematic markdown process for seasonal items approaching end-of-season, triggered by GR-007 (season_end_weeks <= 4) when days_of_supply > 30. Glidepath tiers: Week 4 = 15% off, Week 3 = 25%, Week 2 = 30%, Final week = 40% (terminal). Each tier must maintain GR-001 (18% margin). Emily Carter owns execution; Lisa Hayes approves exceptions. Covers sell-through rate targets per tier, inventory transfer consideration before marking down, and post-season dead-stock liquidation (if any remains after terminal week).

---

### SOP-005 — Stockout Response & Lost Sales Recovery
| Field | Value |
|-------|-------|
| Department | All |
| Personas | David Park, Sarah Mitchell, Mark Thompson, Emily Carter |
| Tags | stockout, lost-sales, recovery, replenishment, demand-sensing |

**Summary:** Response process when stockout_flag = TRUE occurs. Lost sales calculation: lost_sales_units_est = MAX(0, actual_demand_units - units_sold). Covers: detection (real-time monitoring of ending_on_hand_units = 0), immediate response (replenishment trigger, substitute recommendation, cross-DC transfer), recovery (expedite orders, temporary substitution signage), and post-mortem (root cause, prevention measures). Links to SOP-002 for fresh items. Recovery priority: fresh perishables > promoted items > high-margin items > standard.

---

### SOP-006 — Forecast Override Approval Process
| Field | Value |
|-------|-------|
| Department | All |
| Personas | Lisa Hayes, Sarah Mitchell, Mark Thompson, Emily Carter |
| Tags | forecast, override, approval, governance, bias-prevention |

**Summary:** Governs when and how manual overrides of AI-generated demand forecasts are permitted. Override categories: (A) Event-Driven/pre-approved (confirmed weather, competitor exits, store closures), (B) Judgment-Based (requires Director approval + documentation), (C) Emergency (during active crisis — streamlined approval). Bias prevention: all overrides tracked, monthly accuracy comparison of AI vs. overridden forecasts, persona-level bias scoring. Maximum override: ±30% without VP approval. Lisa Hayes is final approver for all non-emergency overrides.

---

### SOP-007 — AI Recommendation Triage & Approval
| Field | Value |
|-------|-------|
| Department | All |
| Personas | Lisa Hayes, Sarah Mitchell, Mark Thompson, Emily Carter, David Park |
| Tags | recommendation, AI, approval, triage, confidence, GR-008, governance |

**Summary:** Triage and approval workflow for AI recommendations from FACT_RECOMMENDATIONS. Recommendation schema: recommendation_id, scenario_id, department, action_type, confidence_score, projected_revenue_impact, projected_margin_impact, guardrail_compliance. Triage tiers based on confidence + impact: (1) Auto-execute (confidence > 0.90, guardrail-compliant), (2) Review-execute (0.75-0.90, notification sent), (3) Human-required (0.60-0.75, persona must approve), (4) Suppressed (<0.60, per GR-008). Escalation: if recommended action conflicts with active guardrail, routes to Lisa Hayes regardless of confidence.

---

### SOP-008 — Cross-Departmental Demand Escalation
| Field | Value |
|-------|-------|
| Department | All |
| Personas | Lisa Hayes, Sarah Mitchell, Mark Thompson, Emily Carter, David Park |
| Tags | escalation, cross-department, coordination, war-room, multi-department |

**Summary:** Escalation process when demand events impact 2+ departments simultaneously. Trigger: 2+ departments showing correlated demand anomalies (demand_deviation_pct > ±15%) from shared root cause (e.g., macroeconomic shift, weather event affecting multiple categories, competitor chain-wide action). Response: Lisa Hayes convenes cross-functional war room within 4 hours. Covers resource allocation priority, shared supplier coordination, unified communications, and de-escalation criteria. Examples: heatwave affecting fresh + seasonal outdoor; economic downturn affecting electronics + discretionary home goods.

---

## Document Statistics

| Category | Count | Avg Length (chars) | Key Theme |
|----------|-------|-------------------|-----------|
| CONTRACT | 8 | 2,363 | Supplier agreements, SLAs, demand sensing integration |
| POLICY | 8 | 2,642 | Guardrails (GR-001 through GR-008), thresholds, approval workflows |
| RESEARCH | 6 | 3,726 | Active scenarios, analytical frameworks, market intelligence |
| SOP | 8 | 2,687 | Operational procedures, escalation paths, daily workflows |

## Key Cross-References

| Scenario | Documents Referenced |
|----------|---------------------|
| `fresh_produce_heatwave` | RESEARCH-001, CONTRACT-002, POLICY-003, SOP-002, SOP-008 |
| `viral_speaker_spike` | RESEARCH-002, CONTRACT-005, POLICY-004, POLICY-005, RESEARCH-006 |
| `patio_furniture_drop` | RESEARCH-003, CONTRACT-003, POLICY-007, SOP-004 |
| `premium_yogurt_lift` | CONTRACT-006 |

## Personas & Document Relevance

| Persona | Role | Primary Documents |
|---------|------|-------------------|
| Sarah Mitchell | Fresh & Grocery | CONTRACT-002/004/006, POLICY-003, RESEARCH-001, SOP-002/003 |
| Mark Thompson | Consumer Electronics | CONTRACT-001/005, POLICY-004, RESEARCH-002/005, SOP-001 |
| Emily Carter | Seasonal & Home | CONTRACT-003, POLICY-007, RESEARCH-003, SOP-004 |
| David Park | Supply Chain | CONTRACT-008, POLICY-003/005, SOP-002/005, all supplier contracts |
| Lisa Hayes | Director, S&OP | POLICY-001/005/008, SOP-006/007/008, all research notes |
