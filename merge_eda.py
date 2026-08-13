import sys
sys.stdout.reconfigure(encoding='utf-8')
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from copy import copy

# Load both workbooks
v1 = openpyxl.load_workbook(r'C:\Users\2000167629\Vibe-Analytics-Phase3\DemandSensing_AI_EDA_V1.xlsx')
v2 = openpyxl.load_workbook(r'C:\Users\2000167629\Vibe-Analytics-Phase3\DemandSensing_AI_EDA_V2.xlsx')

# Create merged workbook starting from V2 (has the new Scope, AI Readiness, Analytics Readiness)
merged = openpyxl.Workbook()
merged.remove(merged.active)

# Style definitions for narrative boxes
narrative_font = Font(name='Calibri', size=10, italic=True, color='1F4E79')
narrative_header_font = Font(name='Calibri', size=11, bold=True, color='1F4E79')
narrative_fill = PatternFill(start_color='DAEEF3', end_color='DAEEF3', fill_type='solid')
thin_border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)

def copy_sheet(source_wb, source_name, target_wb, target_name=None):
    """Copy a sheet from source to target workbook preserving values and styles."""
    src = source_wb[source_name]
    dst = target_wb.create_sheet(target_name or source_name)
    
    # Copy column dimensions
    for col_letter, col_dim in src.column_dimensions.items():
        dst.column_dimensions[col_letter].width = col_dim.width
    
    # Copy row dimensions
    for row_idx, row_dim in src.row_dimensions.items():
        dst.row_dimensions[row_idx].height = row_dim.height
    
    # Copy merged cells
    for merged_range in src.merged_cells.ranges:
        dst.merge_cells(str(merged_range))
    
    # Copy cells
    for row in src.iter_rows():
        for cell in row:
            new_cell = dst.cell(row=cell.row, column=cell.column, value=cell.value)
            if cell.has_style:
                new_cell.font = copy(cell.font)
                new_cell.fill = copy(cell.fill)
                new_cell.alignment = copy(cell.alignment)
                new_cell.border = copy(cell.border)
                new_cell.number_format = cell.number_format
    
    return dst

def add_narrative_block(ws, start_row, narratives):
    """Add a storyboard narrative block at the specified row."""
    ws.cell(row=start_row, column=2, value='STORYBOARD NARRATIVE: How This Data Powers the Demo').font = narrative_header_font
    ws.cell(row=start_row, column=2).fill = narrative_fill
    for i, (label, text) in enumerate(narratives):
        r = start_row + 1 + i
        ws.cell(row=r, column=2, value=label).font = Font(name='Calibri', size=10, bold=True, color='2E75B6')
        ws.cell(row=r, column=2).fill = narrative_fill
        ws.cell(row=r, column=3, value=text).font = narrative_font
        ws.cell(row=r, column=3).fill = narrative_fill
        ws.cell(row=r, column=3).alignment = Alignment(wrap_text=True)
    return start_row + 1 + len(narratives)

# ===== SHEET ORDER =====
# 1. Scope (from V2 - updated)
# 2. Tables&Cols (from V1 + narrative)
# 3. DQ Summary (from V1 + narrative)
# 4. DQ Fails (from V1 + narrative)
# 5. Demand Profiling (from V1 + narrative)
# 6. Forecast & Accuracy (from V1 + narrative)
# 7. Supply & Promos (from V1 + narrative)
# 8. Scenarios & Drivers (from V1 + narrative)
# 9. Dimensions (from V1 + narrative)
# 10. AI Readiness (from V2 - refactored)
# 11. Analytics Readiness (from V2 - refactored)
# 12. Storyboard VizMap (from V2 - new)
# 13. Gaps & Investments (from V2 - new)

print("Copying Scope from V2...")
copy_sheet(v2, 'Scope', merged, 'Scope')

print("Copying Tables&Cols from V1...")
ws = copy_sheet(v1, 'Tables&Cols', merged, 'Tables&Cols')
# Find last row
max_r = ws.max_row + 3
add_narrative_block(ws, max_r, [
    ('DETECT (Step 1)', 'FACT_DEMAND_DAILY (61 cols) is the primary table for the Morning Signal Pack. Deviation heatmaps, anomaly ranking, variance histograms all query this single denormalized fact table. The 7-region x 30-category grain supports the Portfolio Deviation Heatmap visualization.'),
    ('EXPLAIN (Step 2)', 'Driver columns (driver_weather_pp, driver_digital_pp, driver_competitor_pp) enable the Attribution Waterfall. CATEGORY_L3 enables the Sub-Category Heat Strip. FACT_PROMOTIONS (20 cols) provides the real promo signal (promo_lift_pct) that the driver_promo_pp column cannot.'),
    ('PREDICT (Step 3)', 'FACT_FORECAST (16 cols) provides the 13-week forward baseline. Inventory columns in FACT_DEMAND_DAILY (on_hand, safety_stock, reorder_point, in_transit, DOS) enable store-SKU stockout prediction. FACT_SUPPLY_CHAIN (18 cols) feeds the Predictive Availability Model.'),
    ('ACT (Step 4)', 'DIM_GUARDRAILS (11 cols, 8 rules) provides the governance framework for approval routing. FACT_RECOMMENDATIONS (18 cols) shows the output template. DIM_PRODUCT.pack_size enables order rounding. DIM_SUPPLIER.reliability enables alternate sourcing.'),
    ('COMMUNICATE (Step 5)', 'FACT_RECOMMENDATIONS.projected_revenue_impact_usd enables the enterprise roll-up. DIM_GUARDRAILS.owner_role enables approval routing to the correct persona. RAG_KNOWLEDGE_BASE (9 cols) provides SOP templates for S&OP briefing generation.'),
])

print("Copying DQ Summary from V1...")
ws = copy_sheet(v1, 'DQ Summary', merged, 'DQ Summary')
max_r = ws.max_row + 3
add_narrative_block(ws, max_r, [
    ('DETECT (Step 1)', 'Zero NULLs on grain columns (TRANSACTION_DATE, SKU_ID, STORE_ID) and on ACTUAL_DEMAND_UNITS means the Morning Signal Pack will never have missing data gaps. The agent can scan the full portfolio with confidence.'),
    ('EXPLAIN (Step 2)', 'Zero NULLs on all driver_*_pp columns means the Attribution Waterfall always has values to display. SCENARIO_ID being 99.97% NULL is by design - only anomaly rows carry scenario tags, which is exactly what the agent needs to identify and explain events.'),
    ('PREDICT (Step 3)', 'Complete DAYS_OF_SUPPLY, ON_HAND_UNITS, and SAFETY_STOCK columns (0% NULL) mean the stockout prediction model has no missing inputs. Every store-SKU-day combination has a computable days-to-stockout value.'),
    ('ACT (Step 4)', 'PROMO_ID being 83% NULL is by design - only promoted rows carry a promo link. The agent uses this to identify which stores have active promotions for the localized promo-pause decision in Action 3.'),
    ('OVERALL', 'Production-grade data quality. The agent can trust all signals without imputation or fallback logic. This is a major strength for demo reliability.'),
])

print("Copying DQ Fails from V1...")
ws = copy_sheet(v1, 'DQ Fails', merged, 'DQ Fails')
max_r = ws.max_row + 3
add_narrative_block(ws, max_r, [
    ('EXPLAIN (Step 2) - Driver Identity', 'The #1 finding (driver sum != deviation for 99.7%) directly impacts the Attribution Waterfall in the storyboard. AGENT FIX: The agent prompt must state drivers are correlative magnitude signals, not additive percentages. Show rank and relative size, not exact sum.'),
    ('PREDICT (Step 3) - Overstock Flag', 'OVERSTOCK_FLAG never fires because max DOS=10 (well below GR-004 threshold of 45). This means the overstock scenario is not present in synthetic data. For demo: focus on the STOCKOUT story which is richly supported (20% of Fresh rows).'),
    ('ACT (Step 4) - Fresh Stockout Rate', 'GR-003 breaching 67% is critical for demo. If the agent triggers emergency replenishment on 2/3 of Fresh rows, it will flood David with actions. AGENT FIX: Triage severity - DOS<1.0 = CRITICAL (act now), 1.0-1.5 = WATCH (monitor). Only escalate CRITICAL to David.'),
    ('DEMO GUIDANCE', 'These DQ findings are NOT blockers - they are agent configuration items. The storyboard narrative handles them gracefully: Step 2 shows "94% explained" (not 100%), and Step 4 shows selective actions (9 stores, not all stores).'),
])

print("Copying Demand Profiling from V1...")
ws = copy_sheet(v1, 'Demand Profiling', merged, 'Demand Profiling')
max_r = ws.max_row + 3
add_narrative_block(ws, max_r, [
    ('DETECT (Step 1) - Morning Signal Pack', 'The demand distribution (avg 16.41, median 2.47, stddev 35.45) shows heavy right-skew typical of retail. This creates natural anomaly tails that the Morning Signal Pack detects. The 93% within +/-10% variance band matches the storyboard claim of "168 within normal variance."'),
    ('DETECT (Step 1) - Channel Segmentation', 'The channel breakdown (B&M Tier 1-3 + eCommerce) maps directly to Brightway Retails store network in the storyboard. Tier 1 Supercenters have highest demand volume; Express stores (Tier 3) have lowest - enabling differentiated allocation in Step 4.'),
    ('DETECT (Step 1) - Holiday Multipliers', 'Holiday demand multipliers provide the seasonality baseline the agent uses to distinguish "genuine in-season shift" from "normal calendar effect" in Sarahs Q2 follow-up (comparing to same-week-last-year).'),
    ('PREDICT (Step 3) - Stockout Rates', 'Fresh & Grocery stockout rate of 20% vs 7% for other departments validates the storyboard focus on Fresh as the highest-risk department. This is why Sarah is the lead persona and Fresh Produce is the primary anomaly.'),
    ('ACT (Step 4) - Tier-Based Actions', 'Different DOS by tier (1.8 Tier 1, 2.2 Tier 2, 3.2 Tier 3) means the agent must apply tier-specific replenishment logic. Tier 1 stores stock out faster and need expedite priority.'),
])

print("Copying Forecast & Accuracy from V1...")
ws = copy_sheet(v1, 'Forecast & Accuracy', merged, 'Forecast & Accuracy')
max_r = ws.max_row + 3
add_narrative_block(ws, max_r, [
    ('PREDICT (Step 3) - Baseline Trust', 'MAPE < 3% across all departments means the agent can trust the Blue Yonder baseline forecast. The storyboard explicitly says "the Predictive Agent adjusts the existing baseline" - it does not replace it. Low MAPE validates this design.'),
    ('PREDICT (Step 3) - Forward Projections', '13-week forward projection (40,950 rows, Jul 19 - Oct 11, 2026) provides the demand backbone for trajectory projection. The agent overlays driver adjustments on these forecasts to produce the 14-day trajectory chart.'),
    ('PREDICT (Step 3) - Department Variation', 'Seasonal & Home has highest MAPE (2.88%) due to weather volatility - exactly as the storyboard narratives. This explains why Emilys patio furniture drop is harder to predict than Sarahs produce spike.'),
    ('EXPLAIN (Step 2) - Bias Direction', 'Consumer Electronics has slight under-forecast bias (-0.35%) which means the viral speaker spike would be even larger relative to the conservative forecast. This amplifies the storyboard "85% above forecast" narrative.'),
    ('ACT (Step 4) - Agent Granularity Note', 'Forecasts are weekly x SKU x Region, but demand is daily x SKU x Store. The agent must aggregate daily demand to weekly for forecast comparison (noted in the storyboard as an explicit agent implication).'),
])

print("Copying Supply & Promos from V1...")
ws = copy_sheet(v1, 'Supply & Promos', merged, 'Supply & Promos')
max_r = ws.max_row + 3
add_narrative_block(ws, max_r, [
    ('PREDICT (Step 3) - Availability Model', 'The supplier scorecard directly feeds Davids Predictive Availability Model. Suppliers with OTIF 53-64% (bottom quartile) are the "rising delivery risk" suppliers the storyboard warns about. The 25-supplier dataset provides sufficient training data for the ML classifier.'),
    ('PREDICT (Step 3) - Supplier B (Berries)', 'The storyboard cites "Supplier B (berries) slipped from 94% to 81% OTIF." The lowest suppliers in data (53-64% OTIF) validate that supplier degradation patterns exist. The agent can detect trends in SUPPLIER_RELIABILITY_SCORE over time.'),
    ('ACT (Step 4) - Alternate Sourcing', 'Top performers (Prince-Gill, Perez Inc, Kim Burns at 96-98% fill rate) are the alternate suppliers the agent would route to when the primary supplier degrades. The 5-day lead time suppliers enable fastest expedite.'),
    ('ACT (Step 4) - Expedite Cost Proxy', 'FREIGHT_COST varies from $216K to $650K across suppliers. The ratio between same-product-different-transport-mode costs provides the expedite premium proxy (~$6K storyboard claim).'),
    ('EXPLAIN (Step 2) - Promo Signal', 'Promo lift averaging 35% with negative ROI (-0.35) and 8.5% cannibalization matches the storyboard "Summer Fresh BBQ promo running 2.1x plan." The agent uses these metrics for promo attribution instead of the broken driver_promo_pp.'),
    ('ACT (Step 4) - Post-Promo Dip', 'Post-promo dip firing 50% across all promo types is the basis for the prediction that Sarahs promo will create a dip after it ends. This feeds the "bounded runway" narrative in Step 3.'),
])

print("Copying Scenarios & Drivers from V1...")
ws = copy_sheet(v1, 'Scenarios & Drivers', merged, 'Scenarios & Drivers')
max_r = ws.max_row + 3
add_narrative_block(ws, max_r, [
    ('DETECT (Step 1) - Scenario Identification', 'The 5 scenarios map 1:1 to the storyboard personas: Sarah owns heatwave (+28%), bread dip (-15%), yogurt lift (+12%); Mark owns viral spike (+85%); Emily owns patio drop (-22%). The Morning Signal Pack surfaces these as "3 high-impact anomalies" for Sarah plus "cross-departmental awareness" for Mark and Emily.'),
    ('EXPLAIN (Step 2) - Driver Fingerprints', 'Each scenario has a distinct driver fingerprint enabling pattern matching. Heatwave = weather-dominant (12pp); Viral = digital-dominant (55pp); Bread dip = weather-negative (-6pp). The agent uses these fingerprints to explain WHY each anomaly occurred.'),
    ('PREDICT (Step 3) - Scenario Duration', 'Row counts indicate scenario duration: heatwave (1,792 rows ~ 5 days), viral (1,722 ~ 5 days), bread dip (162 ~ 1 day). This maps to the storyboard "spike holds for about five more days" trajectory narrative.'),
    ('ACT (Step 4) - Guardrail Breaches', 'GR-002 breaching 13% means the agent will flag promos exceeding 40% discount for VP approval - exactly the approval routing shown in Step 5. GR-003 at 67% needs the severity triage fix to prevent action flooding.'),
    ('COMMUNICATE (Step 5) - Enterprise Roll-Up', 'The 5 scenarios across 3 departments with quantified revenue impacts ($263K + $1.02M + $46.5K + $12.4K + $44K) are the raw inputs for Lisas Executive Briefing Pack showing "~$460K at stake across 5 high-impact anomalies."'),
])

print("Copying Dimensions from V1...")
ws = copy_sheet(v1, 'Dimensions', merged, 'Dimensions')
max_r = ws.max_row + 3
add_narrative_block(ws, max_r, [
    ('DETECT (Step 1) - Store Network', '40 B&M stores across 5 regions + 1 eCommerce FC matches the storyboard "Brightway Retail: 40 stores, 5 regions, 28% eCommerce." The region x format x tier structure enables the geographic concentration analysis Sarah requests in her Q1 follow-up.'),
    ('DETECT (Step 1) - Product Hierarchy', 'DIM_PRODUCT with 4-level category hierarchy (L1 > L2 > L3 > L4) enables the Sub-Category Heat Strip in Step 2. L3 = CATEGORY_L3 in FACT_DEMAND_DAILY is the primary aggregation level for the storyboard.'),
    ('PREDICT (Step 3) - Perishability', 'DIM_PRODUCT.shelf_life_days + perishable_flag identify Fresh items that need expedited action. This is why the storyboard prioritizes salads (short shelf life) over electronics (long shelf life) in the resource contention trade-off.'),
    ('ACT (Step 4) - Store Capacity', 'DIM_STORE.avg_sqft and avg_weekly_footfall indicate store capacity. Tier 1 Supercenters (115K-164K sqft) can absorb more rebalanced inventory than Express stores (11K-17K sqft). The agent must factor this into transfer recommendations.'),
    ('ACT (Step 4) - Lifecycle Stage', 'DIM_PRODUCT.product_lifecycle_stage identifies EOL items for GR-007 (markdown within 4 weeks of season end). This triggers Emilys patio furniture markdown decision in the storyboard.'),
    ('COMMUNICATE (Step 5) - Persona Mapping', 'Store regions map to planner territories. The 7 regions are assigned across the 3 demand planners, enabling persona-scoped views in the Morning Signal Pack and the Cross-Department Signal Strip.'),
])

# Now copy V2 tabs (AI Readiness, Analytics Readiness, VizMap, Gaps)
print("Copying AI Readiness from V2...")
copy_sheet(v2, 'AI Readiness', merged, 'AI Readiness')

print("Copying Analytics Readiness from V2...")
copy_sheet(v2, 'Analytics Readiness', merged, 'Analytics Readiness')

print("Copying Storyboard VizMap from V2...")
copy_sheet(v2, 'Storyboard VizMap', merged, 'Storyboard VizMap')

print("Copying Gaps & Investments from V2...")
copy_sheet(v2, 'Gaps & Investments', merged, 'Gaps & Investments')

# Save merged file
output_path = r'C:\Users\2000167629\Vibe-Analytics-Phase3\DemandSensing_AI_EDA_V2.xlsx'
merged.save(output_path)
print(f'\nSaved merged EDA V2: {output_path}')
print(f'Total tabs: {len(merged.sheetnames)}')
print(f'Sheet names: {merged.sheetnames}')
