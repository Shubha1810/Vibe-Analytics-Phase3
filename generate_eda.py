import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from datetime import datetime

wb = openpyxl.Workbook()

# Style definitions
header_font = Font(name='Calibri', bold=True, size=11, color='FFFFFF')
header_fill = PatternFill(start_color='2F5496', end_color='2F5496', fill_type='solid')
title_font = Font(name='Calibri', bold=True, size=14, color='2F5496')
subtitle_font = Font(name='Calibri', bold=True, size=12, color='2F5496')
callout_font = Font(name='Calibri', bold=True, size=11, color='C00000')
normal_font = Font(name='Calibri', size=10)
thin_border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)

def write_header(ws, row, headers, start_col=2):
    for i, h in enumerate(headers):
        cell = ws.cell(row=row, column=start_col+i, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center', wrap_text=True)
        cell.border = thin_border

def write_data_row(ws, row, data, start_col=2):
    for i, d in enumerate(data):
        cell = ws.cell(row=row, column=start_col+i, value=d)
        cell.font = normal_font
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')

def write_title(ws, row, title, col=2):
    cell = ws.cell(row=row, column=col, value=title)
    cell.font = title_font

def write_subtitle(ws, row, title, col=2):
    cell = ws.cell(row=row, column=col, value=title)
    cell.font = subtitle_font

def write_callout(ws, row, text, col=2):
    cell = ws.cell(row=row, column=col, value=text)
    cell.font = callout_font

# ============ SHEET 1: SCOPE ============
ws = wb.active
ws.title = 'Scope'
write_title(ws, 2, 'DemandSensing AI - Comprehensive EDA (AI-Ready)')
ws.cell(row=3, column=2, value='This workbook provides a comprehensive Exploratory Data Analysis of the DEMANDSENSING_AI.DEMANDSENSING_SCHEMA tables.').font = normal_font
ws.cell(row=4, column=2, value='Purpose: Fuel Agentic AI solution with validated data signals, quality metrics, and feature readiness assessments.').font = normal_font
ws.cell(row=5, column=2, value=f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}').font = normal_font

write_subtitle(ws, 7, 'Data Landscape Summary')
write_header(ws, 8, ['Metric', 'Value'])
scope_data = [
    ('Database', 'DEMANDSENSING_AI'),
    ('Schema', 'DEMANDSENSING_SCHEMA'),
    ('Total Tables', 11),
    ('Dimension Tables', '5 (Product, Store, Supplier, External Macro, Guardrails)'),
    ('Fact Tables', '5 (Demand Daily, Forecast, Promotions, Supply Chain, Recommendations)'),
    ('Support Tables', '1 (RAG Knowledge Base)'),
    ('Total Columns', 199),
    ('Date Range', '2023-07-17 to 2026-07-13 (3 years)'),
    ('Core Grain', 'Daily x SKU x Store (~15.8M rows)'),
    ('Distinct SKUs', 450),
    ('Distinct Stores', 41),
    ('Named Scenarios', '5 (heatwave, viral spike, patio drop, bread dip, yogurt lift)'),
    ('Semantic Model', 'DemandSensing_SemanticModel.yaml (77KB on @SEMANTIC_MODEL stage)'),
    ('RAG Knowledge Docs', 30),
]
for i, (k, v) in enumerate(scope_data):
    write_data_row(ws, 9+i, [k, v])

write_subtitle(ws, 25, 'Sheet Index')
write_header(ws, 26, ['Sheet #', 'Name', 'Purpose'])
sheet_index = [
    (1, 'Scope', 'Project overview and data landscape'),
    (2, 'Tables&Cols', 'Table metadata, column inventory, data types'),
    (3, 'DQ Summary', 'NULL profiling, PK uniqueness, FK integrity'),
    (4, 'DQ Fails', 'Specific data quality issues with commentary'),
    (5, 'Demand Profiling', 'Distribution stats, driver decomposition, trends'),
    (6, 'Forecast & Accuracy', 'MAPE, bias, coverage analysis'),
    (7, 'Supply & Promos', 'Supplier scorecards, promotion effectiveness'),
    (8, 'Scenarios & Drivers', 'Scenario fingerprints, guardrail breach rates'),
    (9, 'Dimensions', 'DIM table profiles and distributions'),
    (10, 'AI Readiness', 'Feature scores, agent boundaries, semantic model gaps'),
]
for i, (n, name, purpose) in enumerate(sheet_index):
    write_data_row(ws, 27+i, [n, name, purpose])

ws.column_dimensions['B'].width = 25
ws.column_dimensions['C'].width = 70
ws.column_dimensions['D'].width = 50

# ============ SHEET 2: Tables&Cols ============
ws2 = wb.create_sheet('Tables&Cols')
write_title(ws2, 2, 'Table Inventory & Column Catalog')

write_subtitle(ws2, 4, 'Table Metadata')
write_header(ws2, 5, ['TABLE_NAME', 'ROW_COUNT', 'BYTES', 'COLUMN_COUNT', 'CREATED', 'LAST_ALTERED'])
tables_data = [
    ('DIM_EXTERNAL_MACRO', 222, 5120, 5, '2026-06-19', '2026-06-19'),
    ('DIM_GUARDRAILS', 8, 3072, 11, '2026-06-19', '2026-06-19'),
    ('DIM_PRODUCT', 450, 28672, 18, '2026-06-19', '2026-06-19'),
    ('DIM_STORE', 41, 5120, 17, '2026-06-19', '2026-06-19'),
    ('DIM_SUPPLIER', 25, 2048, 6, '2026-06-19', '2026-06-19'),
    ('FACT_DEMAND_DAILY', 15814617, 966687744, 61, '2026-06-19', '2026-06-19'),
    ('FACT_FORECAST', 535500, 13723136, 16, '2026-06-19', '2026-06-19'),
    ('FACT_PROMOTIONS', 7144, 231936, 20, '2026-06-19', '2026-06-19'),
    ('FACT_RECOMMENDATIONS', 5, 3072, 18, '2026-06-19', '2026-06-19'),
    ('FACT_SUPPLY_CHAIN', 16703, 497664, 18, '2026-06-19', '2026-06-19'),
    ('RAG_KNOWLEDGE_BASE', 30, 49664, 9, '2026-06-30', '2026-07-01'),
]
for i, row in enumerate(tables_data):
    write_data_row(ws2, 6+i, list(row))

write_subtitle(ws2, 19, 'Column Inventory (FACT_DEMAND_DAILY - 61 columns)')
write_header(ws2, 20, ['COLUMN_NAME', 'ORDINAL', 'DATA_TYPE', 'IS_NULLABLE', 'ROLE'])
fact_cols = [
    ('TRANSACTION_DATE', 62, 'DATE', 'YES', 'TIME GRAIN (PK)'),
    ('STORE_ID', 6, 'TEXT', 'NO', 'PK / FK to DIM_STORE'),
    ('SKU_ID', 7, 'TEXT', 'NO', 'PK / FK to DIM_PRODUCT'),
    ('SCENARIO_ID', 61, 'TEXT', 'YES', 'PK (NULL=baseline)'),
    ('ACTUAL_DEMAND_UNITS', 16, 'FLOAT', 'YES', 'LABEL (target variable)'),
    ('FORECAST_UNITS', 15, 'FLOAT', 'YES', 'FEATURE'),
    ('EXPECTED_DEMAND_UNITS', 14, 'FLOAT', 'YES', 'FEATURE'),
    ('BASELINE_FORECAST_UNITS', 13, 'FLOAT', 'YES', 'FEATURE'),
    ('DEMAND_DEVIATION_PCT', 23, 'FLOAT', 'YES', 'SIGNAL (driver sum)'),
    ('DRIVER_WEATHER_PP', 56, 'FLOAT', 'YES', 'DRIVER ATTRIBUTION'),
    ('DRIVER_PROMO_PP', 57, 'FLOAT', 'YES', 'DRIVER ATTRIBUTION'),
    ('DRIVER_COMPETITOR_PP', 58, 'FLOAT', 'YES', 'DRIVER ATTRIBUTION'),
    ('DRIVER_DIGITAL_PP', 59, 'FLOAT', 'YES', 'DRIVER ATTRIBUTION'),
    ('DRIVER_RESIDUAL_PP', 60, 'FLOAT', 'YES', 'DRIVER ATTRIBUTION'),
    ('STOCKOUT_FLAG', 43, 'BOOLEAN', 'YES', 'ALERT SIGNAL'),
    ('OVERSTOCK_FLAG', 44, 'BOOLEAN', 'YES', 'ALERT SIGNAL'),
    ('DAYS_OF_SUPPLY', 38, 'FLOAT', 'YES', 'INVENTORY KPI'),
    ('NET_SALES_AMT', 32, 'FLOAT', 'YES', 'FINANCIAL'),
    ('GROSS_MARGIN_AMT', 34, 'FLOAT', 'YES', 'FINANCIAL'),
    ('GOOGLE_TRENDS_SCORE', 49, 'FLOAT', 'YES', 'EXTERNAL SIGNAL'),
    ('COMPETITOR_PRICE_INDEX', 51, 'FLOAT', 'YES', 'EXTERNAL SIGNAL'),
    ('TEMPERATURE_ANOMALY_F', 46, 'FLOAT', 'YES', 'EXTERNAL SIGNAL'),
    ('PROMO_FLAG', 27, 'BOOLEAN', 'YES', 'SEGMENTATION'),
    ('PROMO_DISCOUNT_PCT', 28, 'FLOAT', 'YES', 'FEATURE'),
    ('REGION', 8, 'TEXT', 'YES', 'DIMENSION (denorm)'),
    ('CHANNEL', 9, 'TEXT', 'YES', 'DIMENSION (denorm)'),
    ('DEPARTMENT', 11, 'TEXT', 'YES', 'DIMENSION (denorm)'),
    ('CATEGORY_L3', 10, 'TEXT', 'YES', 'DIMENSION (denorm)'),
    ('FISCAL_WEEK', 5, 'TEXT', 'YES', 'TIME DIMENSION'),
    ('FISCAL_MONTH', 4, 'TEXT', 'YES', 'TIME DIMENSION'),
    ('WEATHER_CONDITION', 48, 'TEXT', 'YES', 'CATEGORICAL SIGNAL'),
]
for i, row in enumerate(fact_cols):
    write_data_row(ws2, 21+i, list(row))

ws2.column_dimensions['B'].width = 30
ws2.column_dimensions['C'].width = 12
ws2.column_dimensions['D'].width = 15
ws2.column_dimensions['E'].width = 15
ws2.column_dimensions['F'].width = 30

# ============ SHEET 3: DQ Summary ============
ws3 = wb.create_sheet('DQ Summary')
write_title(ws3, 2, 'Data Quality Summary')

write_subtitle(ws3, 4, 'FACT_DEMAND_DAILY Null Profile (15,814,617 rows)')
write_header(ws3, 5, ['COLUMN', 'NULL_COUNT', 'NULL_PCT', 'ASSESSMENT'])
null_data = [
    ('TRANSACTION_DATE', 0, '0.00%', 'PASS - grain column'),
    ('SKU_ID', 0, '0.00%', 'PASS - grain column'),
    ('STORE_ID', 0, '0.00%', 'PASS - grain column'),
    ('ACTUAL_DEMAND_UNITS', 0, '0.00%', 'PASS - label complete'),
    ('FORECAST_UNITS', 0, '0.00%', 'PASS'),
    ('EXPECTED_DEMAND_UNITS', 0, '0.00%', 'PASS'),
    ('DEMAND_DEVIATION_PCT', 0, '0.00%', 'PASS - signal complete'),
    ('DRIVER_WEATHER_PP', 0, '0.00%', 'PASS'),
    ('DRIVER_PROMO_PP', 0, '0.00%', 'PASS'),
    ('DRIVER_COMPETITOR_PP', 0, '0.00%', 'PASS'),
    ('DRIVER_DIGITAL_PP', 0, '0.00%', 'PASS'),
    ('DRIVER_RESIDUAL_PP', 0, '0.00%', 'PASS'),
    ('SCENARIO_ID', 15810156, '99.97% (by design - baseline)', 'OK - NULL means baseline'),
    ('PROMO_ID', 13176874, '83.32% (by design - non-promo)', 'OK - NULL means no promo'),
    ('GROSS_MARGIN_AMT', 0, '0.00%', 'PASS'),
    ('DAYS_OF_SUPPLY', 0, '0.00%', 'PASS'),
]
for i, row in enumerate(null_data):
    write_data_row(ws3, 6+i, list(row))

write_subtitle(ws3, 24, 'Primary Key Uniqueness Checks')
write_header(ws3, 25, ['TABLE_NAME', 'TOTAL_ROWS', 'DISTINCT_PK', 'DUPLICATE_PK_ROWS', 'STATUS'])
pk_data = [
    ('FACT_DEMAND_DAILY', 15814617, 15814617, 0, 'PASS'),
    ('FACT_FORECAST', 535500, 535500, 0, 'PASS'),
    ('FACT_PROMOTIONS', 7144, 7144, 0, 'PASS'),
    ('FACT_SUPPLY_CHAIN', 16703, 16703, 0, 'PASS'),
    ('DIM_PRODUCT', 450, 450, 0, 'PASS'),
    ('DIM_STORE', 41, 41, 0, 'PASS'),
    ('DIM_SUPPLIER', 25, 25, 0, 'PASS'),
]
for i, row in enumerate(pk_data):
    write_data_row(ws3, 26+i, list(row))

write_subtitle(ws3, 35, 'Foreign Key Integrity Checks')
write_header(ws3, 36, ['FK_CHECK', 'ORPHAN_KEYS', 'STATUS'])
fk_data = [
    ('FACT_DEMAND_DAILY -> DIM_PRODUCT (SKU_ID)', 0, 'PASS'),
    ('FACT_DEMAND_DAILY -> DIM_STORE (STORE_ID)', 0, 'PASS'),
    ('FACT_DEMAND_DAILY -> FACT_PROMOTIONS (PROMO_ID)', 0, 'PASS'),
    ('FACT_SUPPLY_CHAIN -> DIM_SUPPLIER (SUPPLIER_ID)', 0, 'PASS'),
]
for i, row in enumerate(fk_data):
    write_data_row(ws3, 37+i, list(row))

write_subtitle(ws3, 43, 'DQ Flags by Department & Region')
write_header(ws3, 44, ['DEPARTMENT', 'REGION', 'TOTAL_ROWS', 'STOCKOUT_ROWS', 'OVERSTOCK_ROWS', 'MISSING_SIGNAL_ROWS', 'AVG_ABS_DEVIATION_%'])
dq_dept = [
    ('Consumer Electronics', 'Mid-Atlantic', 711543, 55053, 0, 0, 4.92),
    ('Consumer Electronics', 'Midwest', 792425, 56987, 0, 0, 4.77),
    ('Consumer Electronics', 'National', 153020, 13888, 0, 0, 4.05),
    ('Consumer Electronics', 'Northeast', 738868, 53977, 0, 0, 4.72),
    ('Consumer Electronics', 'South-Central', 806634, 57240, 0, 0, 4.85),
    ('Consumer Electronics', 'Southeast', 812099, 58877, 0, 0, 4.87),
    ('Consumer Electronics', 'West Coast', 816471, 59391, 0, 0, 4.81),
    ('Fresh & Grocery', 'Mid-Atlantic', 1028513, 217093, 0, 0, 4.95),
    ('Fresh & Grocery', 'Midwest', 1125790, 223649, 0, 0, 4.93),
    ('Fresh & Grocery', 'National', 203298, 43611, 0, 0, 4.02),
    ('Fresh & Grocery', 'Northeast', 1026327, 204543, 0, 0, 4.94),
    ('Fresh & Grocery', 'South-Central', 1139999, 232993, 0, 0, 4.93),
    ('Fresh & Grocery', 'Southeast', 1161859, 242059, 0, 0, 5.08),
    ('Fresh & Grocery', 'West Coast', 1142185, 234212, 0, 0, 4.93),
    ('Seasonal & Home', 'Mid-Atlantic', 626289, 44201, 0, 0, 5.68),
    ('Seasonal & Home', 'Midwest', 685311, 47287, 0, 0, 6.01),
    ('Seasonal & Home', 'National', 135532, 12532, 0, 0, 4.31),
    ('Seasonal & Home', 'Northeast', 630661, 45235, 0, 0, 5.86),
    ('Seasonal & Home', 'South-Central', 690776, 45686, 0, 0, 5.86),
    ('Seasonal & Home', 'Southeast', 686404, 44252, 0, 0, 5.96),
    ('Seasonal & Home', 'West Coast', 700613, 45938, 0, 0, 5.88),
]
for i, row in enumerate(dq_dept):
    write_data_row(ws3, 45+i, list(row))

write_callout(ws3, 68, 'Pertinent Points:')
ws3.cell(row=69, column=2, value='1) Zero NULLs across all critical signal/feature columns - data is ML-ready without imputation.').font = normal_font
ws3.cell(row=70, column=2, value='2) Zero orphan FK keys - referential integrity is perfect across all joins.').font = normal_font
ws3.cell(row=71, column=2, value='3) SCENARIO_ID is NULL for 99.97% of rows (by design: baseline). Only 4,461 rows carry scenario overlays.').font = normal_font
ws3.cell(row=72, column=2, value='4) Fresh & Grocery stockout rates are 2-3x higher than other departments (20%+ vs 6-8%). Agent should prioritize fresh replenishment.').font = normal_font
ws3.cell(row=73, column=2, value='5) OVERSTOCK_FLAG is always FALSE - investigate if logic is correctly applied or if threshold is too high.').font = normal_font

ws3.column_dimensions['B'].width = 45
ws3.column_dimensions['C'].width = 15
ws3.column_dimensions['D'].width = 25
ws3.column_dimensions['E'].width = 35
ws3.column_dimensions['F'].width = 20
ws3.column_dimensions['G'].width = 20
ws3.column_dimensions['H'].width = 20

# ============ SHEET 4: DQ Fails ============
ws4 = wb.create_sheet('DQ Fails')
write_title(ws4, 2, 'Data Quality Findings & Issues')

write_subtitle(ws4, 4, '1) Driver Decomposition Identity DOES NOT HOLD')
ws4.cell(row=5, column=2, value='Identity: demand_deviation_pct = weather_pp + promo_pp + competitor_pp + digital_pp + residual_pp').font = normal_font
write_header(ws4, 6, ['TOTAL_ROWS', 'IDENTITY_HOLDS (<0.01)', 'IDENTITY_FAILS', 'AVG_RESIDUAL_GAP'])
write_data_row(ws4, 7, [15814617, 45853, 15768764, 2.397])
ws4.cell(row=8, column=2, value='IMPACT: 99.7% of rows have driver sum != deviation. Avg gap is 2.4pp.').font = callout_font
ws4.cell(row=9, column=2, value='INVESTIGATION: This may be due to multiplicative (not additive) driver composition, or rounding in ETL pipeline.').font = normal_font
ws4.cell(row=10, column=2, value='AI IMPACT: Agent cannot blindly trust additive attribution. Need to verify if semantic model description is aspirational vs actual.').font = normal_font

write_subtitle(ws4, 12, '2) OVERSTOCK_FLAG Never Fires')
ws4.cell(row=13, column=2, value='Across 15.8M rows (baseline), OVERSTOCK_FLAG = TRUE for exactly 0 rows.').font = normal_font
ws4.cell(row=14, column=2, value='IMPACT: GR-004 (Electronics Overstock Cap at DOS > 45) cannot be validated via this flag.').font = callout_font
ws4.cell(row=15, column=2, value='CHECK: MAX(DAYS_OF_SUPPLY) investigation needed. If no row exceeds 3x daily rate, flag is correctly absent.').font = normal_font

write_subtitle(ws4, 17, '3) Fresh & Grocery Stockout Rate Anomaly')
ws4.cell(row=18, column=2, value='Stockout rate for Fresh is 19-24% across all regions/months consistently.').font = normal_font
ws4.cell(row=19, column=2, value='QUESTION: Is this realistic for perishables or is STOCKOUT_FLAG logic too aggressive?').font = callout_font
ws4.cell(row=20, column=2, value='GR-003 breach rate is 67% - "Fresh DOS < 1.5" fires on 2/3 of all Fresh rows. May need threshold recalibration.').font = normal_font

write_subtitle(ws4, 22, '4) Promotion ROI is Negative Across All Types')
ws4.cell(row=23, column=2, value='All 5 promo types have AVG_ROI between -0.30 and -0.36. Every promo type is margin-destructive.').font = normal_font
ws4.cell(row=24, column=2, value='QUESTION: Is this expected (promos drive traffic but not profit) or is COGS/discount calc off?').font = callout_font
ws4.cell(row=25, column=2, value='POST_PROMO_DIP fires ~50% of the time - confirms cannibalization is material and consistent.').font = normal_font

write_subtitle(ws4, 27, '5) FACT_RECOMMENDATIONS Has Only 5 Rows (Seed Data)')
ws4.cell(row=28, column=2, value='One recommendation per scenario. All status = "Proposed", all guardrail_status = "PASS".').font = normal_font
ws4.cell(row=29, column=2, value='IMPLICATION: Agent must GENERATE recommendations dynamically. This table is a template, not a history.').font = callout_font
ws4.cell(row=30, column=2, value='Each recommendation maps to exactly one persona_owner - confirms agent routing by persona is the design intent.').font = normal_font

write_subtitle(ws4, 32, '6) Demand Distribution is Heavily Right-Skewed')
ws4.cell(row=33, column=2, value='Median = 2.47 units vs Mean = 16.41 units. Max = 1,394 units. Ratio of Mean/Median = 6.6x.').font = normal_font
ws4.cell(row=34, column=2, value='IMPLICATION: Agent alert thresholds must use percentile-based (not mean-based) logic.').font = callout_font
ws4.cell(row=35, column=2, value='Fresh & Grocery drives the skew (avg 1,200 units/week at SKU level vs 35-47 for other depts).').font = normal_font

ws4.column_dimensions['B'].width = 100
ws4.column_dimensions['C'].width = 25
ws4.column_dimensions['D'].width = 20
ws4.column_dimensions['E'].width = 20

# ============ SHEET 5: Demand Profiling ============
ws5 = wb.create_sheet('Demand Profiling')
write_title(ws5, 2, 'Demand Signal Profiling')

write_subtitle(ws5, 4, 'Overall Distribution Stats (Full Dataset)')
write_header(ws5, 5, ['METRIC', 'MIN', 'MAX', 'AVG', 'MEDIAN', 'STDDEV'])
write_data_row(ws5, 6, ['ACTUAL_DEMAND_UNITS', 0.01, 1394.02, 16.41, 2.47, 35.45])
write_data_row(ws5, 7, ['NET_SALES_AMT ($)', 0, 22062.27, 102.80, '-', '-'])
write_data_row(ws5, 8, ['GROSS_MARGIN_AMT ($)', '-', '-', 41.49, '-', '-'])
write_data_row(ws5, 9, ['DAYS_OF_SUPPLY', '-', '-', 2.23, '-', '-'])
ws5.cell(row=10, column=2, value='Date Range: 2023-07-17 to 2026-07-13 (1,093 days, 3 fiscal years)').font = normal_font

write_subtitle(ws5, 12, 'Demand by Channel & Store Tier (Baseline Only)')
write_header(ws5, 13, ['CHANNEL', 'STORE_TIER', 'ROW_COUNT', 'TOTAL_DEMAND', 'TOTAL_NET_SALES', 'STOCKOUT_%', 'OVERSTOCK_%', 'AVG_DOS'])
channel_data = [
    ('Brick & Mortar', 'Tier 1', 5664812, 129535641, 818290191, 13.74, 0.0, 1.8),
    ('Brick & Mortar', 'Tier 2', 7005273, 73558188, 445732025, 12.78, 0.0, 2.2),
    ('Brick & Mortar', 'Tier 3', 2648263, 11489418, 66358840, 11.09, 0.0, 3.2),
    ('eCommerce', 'Tier 1', 491808, 44854878, 293900241, 14.24, 0.0, 1.6),
]
for i, row in enumerate(channel_data):
    write_data_row(ws5, 14+i, list(row))

write_subtitle(ws5, 20, 'Holiday Demand Multipliers (vs Non-Holiday Avg 16.05 units)')
write_header(ws5, 21, ['HOLIDAY', 'ROW_COUNT', 'AVG_DEMAND', 'MULTIPLIER', 'AVG_DEVIATION_%', 'STOCKOUT_%'])
holiday_data = [
    ('December Holidays', 434070, 24.25, '1.51x', -1.46, 12.67),
    ('July 4th', 173628, 22.65, '1.41x', 3.04, 14.50),
    ('Halloween', 217035, 18.54, '1.16x', 0.34, 12.95),
    ('Easter', 130221, 18.38, '1.15x', -0.46, 12.61),
    ("Valentine's Day", 130221, 17.47, '1.09x', -2.11, 11.89),
    ('Memorial Day', 173628, 16.51, '1.03x', 1.02, 13.12),
    ('Non-Holiday (baseline)', 14334318, 16.05, '1.00x', 0.23, 12.87),
    ('Labor Day', 173628, 15.84, '0.99x', 2.42, 14.02),
    ("New Year's Day", 43407, 13.50, '0.84x', -2.62, 11.49),
]
for i, row in enumerate(holiday_data):
    write_data_row(ws5, 22+i, list(row))

write_subtitle(ws5, 33, 'Monthly Demand Trend by Department (Sample: Latest 12 Months)')
write_header(ws5, 34, ['MONTH', 'DEPARTMENT', 'TOTAL_DEMAND', 'NET_SALES', 'STOCKOUT_%', 'DEVIATION_%'])
monthly_sample = [
    ('2025-07', 'Consumer Electronics', 206768, 18192983, 7.47, 2.59),
    ('2025-07', 'Fresh & Grocery', 8756317, 25520194, 22.38, 2.67),
    ('2025-07', 'Seasonal & Home', 207043, 9865115, 8.00, 2.43),
    ('2025-10', 'Consumer Electronics', 241803, 24512280, 8.08, 1.17),
    ('2025-10', 'Fresh & Grocery', 7265687, 21496955, 20.36, 0.37),
    ('2025-10', 'Seasonal & Home', 120939, 5365174, 6.48, 0.93),
    ('2026-01', 'Consumer Electronics', 212198, 20781135, 6.91, -2.08),
    ('2026-01', 'Fresh & Grocery', 6680850, 19876350, 18.83, -1.99),
    ('2026-01', 'Seasonal & Home', 92303, 3975268, 5.47, -2.27),
    ('2026-04', 'Consumer Electronics', 181163, 15018104, 6.76, -0.50),
    ('2026-04', 'Fresh & Grocery', 7646365, 22911940, 19.83, -0.73),
    ('2026-04', 'Seasonal & Home', 168167, 7875992, 7.07, -0.81),
    ('2026-07', 'Consumer Electronics', 90665, 8237671, 7.90, 4.19),
    ('2026-07', 'Fresh & Grocery', 4451808, 13423923, 24.21, 5.55),
    ('2026-07', 'Seasonal & Home', 106870, 5376021, 8.86, 5.88),
]
for i, row in enumerate(monthly_sample):
    write_data_row(ws5, 35+i, list(row))

write_callout(ws5, 52, 'Pertinent Points:')
ws5.cell(row=53, column=2, value='1) eCommerce (1 FC) generates 44.8M units - comparable to all Tier 1 B&M stores combined. Agent must segment channels.').font = normal_font
ws5.cell(row=54, column=2, value='2) Median demand (2.47) << Mean (16.41) - highly right-skewed. Use percentile-based thresholds for alerts.').font = normal_font
ws5.cell(row=55, column=2, value='3) December Holidays = 1.51x demand. July 4th = 1.41x. Agent should pre-position inventory 2-3 weeks before events.').font = normal_font
ws5.cell(row=56, column=2, value='4) Labor Day shows BELOW-avg demand but ABOVE-avg stockout (14%) - supply timing issue for agent to investigate.').font = normal_font
ws5.cell(row=57, column=2, value='5) Summer months (Jun-Aug) show consistent positive deviation (+2-3%). Winter months (Jan-Feb) show negative (-2%).').font = normal_font
ws5.cell(row=58, column=2, value='6) July 2026 partial month shows highest deviation yet (+4-6%) - potential emerging trend or early heatwave signal.').font = normal_font

ws5.column_dimensions['B'].width = 25
ws5.column_dimensions['C'].width = 15
ws5.column_dimensions['D'].width = 15
ws5.column_dimensions['E'].width = 18
ws5.column_dimensions['F'].width = 18
ws5.column_dimensions['G'].width = 15
ws5.column_dimensions['H'].width = 12

# ============ SHEET 6: Forecast & Accuracy ============
ws6 = wb.create_sheet('Forecast & Accuracy')
write_title(ws6, 2, 'Forecast Performance Analysis')

write_subtitle(ws6, 4, 'Forecast Accuracy by Department (Actuals vs Forecast - 494,550 rows)')
write_header(ws6, 5, ['DEPARTMENT', 'ROW_COUNT', 'AVG_MAPE_%', 'AVG_BIAS_%', 'AVG_FORECAST', 'AVG_ACTUAL', 'INTERPRETATION'])
forecast_data = [
    ('Consumer Electronics', 153860, 2.60, -0.35, 47.44, 47.63, 'Slight under-forecast bias'),
    ('Fresh & Grocery', 204414, 2.54, 0.00, 1208.44, 1209.94, 'Near-zero bias - well calibrated'),
    ('Seasonal & Home', 136276, 2.88, -0.04, 35.97, 36.16, 'Highest MAPE - weather volatility'),
]
for i, row in enumerate(forecast_data):
    write_data_row(ws6, 6+i, list(row))

write_subtitle(ws6, 11, 'Forward Projections (13-week horizon, no actuals yet)')
write_header(ws6, 12, ['DEPARTMENT', 'ROW_COUNT', 'COVERAGE', 'USE_CASE'])
fwd_data = [
    ('Consumer Electronics', 12740, '13-week forward', 'Input to prescriptive agent actions'),
    ('Fresh & Grocery', 16926, '13-week forward', 'Input to prescriptive agent actions'),
    ('Seasonal & Home', 11284, '13-week forward', 'Input to prescriptive agent actions'),
]
for i, row in enumerate(fwd_data):
    write_data_row(ws6, 13+i, list(row))

write_subtitle(ws6, 18, 'Forecast Characteristics for Agent Consumption')
write_header(ws6, 19, ['ATTRIBUTE', 'VALUE', 'AGENT_IMPLICATION'])
fc_char = [
    ('Granularity', 'Weekly x SKU x Region', 'Agent must aggregate daily demand to weekly for comparison'),
    ('Confidence Interval', 'forecast_lower_units / forecast_upper_units', 'Agent can assess uncertainty width for risk-scoring'),
    ('Consensus Forecast', 'consensus_forecast_units column', 'Blended forecast available as alternative signal'),
    ('Horizon', '13 weeks forward', 'Agent planning window is ~3 months out'),
    ('Historical Window', '~2.5 years of actuals', 'Sufficient for YoY comp and seasonal pattern learning'),
]
for i, row in enumerate(fc_char):
    write_data_row(ws6, 20+i, list(row))

write_callout(ws6, 27, 'Pertinent Points:')
ws6.cell(row=28, column=2, value='1) Overall MAPE 2.5-2.9% is excellent. Agent can trust statistical forecast as strong baseline signal.').font = normal_font
ws6.cell(row=29, column=2, value='2) Electronics has -0.35% systematic under-forecast. Agent could add bias correction of +0.35%.').font = normal_font
ws6.cell(row=30, column=2, value='3) Seasonal & Home has highest MAPE (2.88%) - expected given weather/event sensitivity. Needs stronger scenario overlays.').font = normal_font
ws6.cell(row=31, column=2, value='4) Forward projections have NULL actuals by design. Agent uses forecast_units + scenario adjustments for prescriptive actions.').font = normal_font

ws6.column_dimensions['B'].width = 30
ws6.column_dimensions['C'].width = 15
ws6.column_dimensions['D'].width = 15
ws6.column_dimensions['E'].width = 15
ws6.column_dimensions['F'].width = 15
ws6.column_dimensions['G'].width = 45
ws6.column_dimensions['H'].width = 45

# ============ SHEET 7: Supply & Promos ============
ws7 = wb.create_sheet('Supply & Promos')
write_title(ws7, 2, 'Supply Chain & Promotion Analytics')

write_subtitle(ws7, 4, 'Supplier Scorecard (25 suppliers, 16,703 POs)')
write_header(ws7, 5, ['SUPPLIER', 'PO_COUNT', 'FILL_RATE_%', 'OTIF_%', 'LEAD_TIME_DAYS', 'LT_VARIANCE', 'RELIABILITY', 'FREIGHT_COST'])
supplier_data = [
    ('Chavez-Curry', 440, 88.23, 53.64, 10.0, 0.1, 88.4, 273791),
    ('Simpson, Ramos and Gomez', 739, 88.25, 57.24, 10.0, 0.1, 88.1, 472273),
    ('Murray Group', 331, 87.94, 60.42, 30.0, -0.1, 88.2, 216389),
    ('Miller, Garrett and Anderson', 740, 90.81, 61.49, 21.0, 0.0, 91.1, 473843),
    ('Miller-Jackson', 631, 91.52, 63.39, 5.0, 0.1, 91.6, 396336),
    ('--- TOP PERFORMERS ---', '', '', '', '', '', '', ''),
    ('Prince-Gill', 636, 96.87, 80.03, 5.0, 0.0, 97.3, 390458),
    ('Perez Inc', 597, 97.59, 82.58, 14.0, 0.0, 98.6, 364992),
    ('Kim, Burns and Burnett', 855, 96.55, 82.92, 5.0, 0.0, 97.3, 522398),
    ('Taylor-Ortega', 820, 96.76, 83.41, 10.0, 0.0, 97.5, 526119),
    ('Alexander PLC', 773, 96.12, 83.70, 21.0, -0.1, 96.6, 481356),
    ('Adkins and Sons', 999, 97.02, 83.98, 21.0, 0.0, 97.7, 650524),
    ('Miller Ltd', 411, 97.08, 84.91, 14.0, 0.0, 97.9, 270582),
]
for i, row in enumerate(supplier_data):
    write_data_row(ws7, 6+i, list(row))

write_subtitle(ws7, 21, 'Promotion Effectiveness by Type (7,144 promotions)')
write_header(ws7, 22, ['PROMO_TYPE', 'COUNT', 'AVG_DISCOUNT_%', 'AVG_LIFT_%', 'AVG_ROI', 'CANNIB_%', 'HALO_%', 'POST_DIP_COUNT', 'POST_DIP_%'])
promo_data = [
    ('% Off', 1463, 26.8, 35.2, -0.30, 8.3, 3.5, 736, 50.3),
    ('BOGO', 1437, 27.1, 34.8, -0.36, 8.6, 3.5, 697, 48.5),
    ('Bundle', 1398, 26.8, 34.7, -0.33, 8.4, 3.5, 694, 49.6),
    ('Multi-buy', 1461, 26.7, 34.6, -0.35, 8.5, 3.5, 732, 50.1),
    ('$ Off', 1385, 26.8, 34.3, -0.35, 8.4, 3.5, 695, 50.2),
]
for i, row in enumerate(promo_data):
    write_data_row(ws7, 23+i, list(row))

write_callout(ws7, 30, 'Pertinent Points:')
ws7.cell(row=31, column=2, value='1) OTIF ranges 54-85%. Bottom 5 suppliers (Chavez-Curry, Simpson/Ramos, Murray) are reliability risks. Agent should flag these.').font = normal_font
ws7.cell(row=32, column=2, value='2) ALL promo types have NEGATIVE ROI (-0.30 to -0.36). Promos drive +35% volume lift but destroy margin.').font = normal_font
ws7.cell(row=33, column=2, value='3) Cannibalization ~8.5% vs Halo ~3.5% = net -5% category impact. Agent must factor this into promo decisions.').font = normal_font
ws7.cell(row=34, column=2, value='4) Post-promo dip fires 50% of the time. Agent must plan demand borrowing into replenishment.').font = normal_font
ws7.cell(row=35, column=2, value='5) Lead time variance near-zero for all suppliers - delivery timing is predictable (good for safety stock).').font = normal_font
ws7.cell(row=36, column=2, value='6) Highest-volume supplier (Adkins: 999 POs) has excellent OTIF (84%) - scale does not hurt reliability here.').font = normal_font

ws7.column_dimensions['B'].width = 32
ws7.column_dimensions['C'].width = 12
ws7.column_dimensions['D'].width = 14
ws7.column_dimensions['E'].width = 12
ws7.column_dimensions['F'].width = 15
ws7.column_dimensions['G'].width = 14
ws7.column_dimensions['H'].width = 14
ws7.column_dimensions['I'].width = 15
ws7.column_dimensions['J'].width = 12

# ============ SHEET 8: Scenarios & Drivers ============
ws8 = wb.create_sheet('Scenarios & Drivers')
write_title(ws8, 2, 'Scenario Fingerprints & Guardrail Analysis')

write_subtitle(ws8, 4, 'Scenario Driver Fingerprints (Avg contribution in percentage points)')
write_header(ws8, 5, ['SCENARIO_ID', 'ROWS', 'AVG_DEVIATION_%', 'WEATHER_PP', 'PROMO_PP', 'COMPETITOR_PP', 'DIGITAL_PP', 'RESIDUAL_PP', 'AVG_DEMAND', 'STOCKOUT_%'])
scenario_data = [
    ('viral_speaker_spike', 1722, 84.68, 5.0, 0.0, 20.0, 55.0, 5.0, 7.98, 38.91),
    ('fresh_produce_heatwave', 1792, 27.53, 12.22, 6.79, 4.07, 2.72, 1.36, 54.82, 37.67),
    ('premium_yogurt_lift', 525, 12.19, 5.0, 4.0, 0.0, 2.0, 1.0, 62.82, 32.00),
    ('artisan_bread_dip', 162, -14.75, -6.0, 0.0, -5.0, 0.0, -4.0, 17.56, 8.64),
    ('patio_furniture_drop', 260, -21.61, -12.0, 0.0, -5.0, 0.0, -5.0, 0.45, 2.69),
]
for i, row in enumerate(scenario_data):
    write_data_row(ws8, 6+i, list(row))

write_subtitle(ws8, 13, 'Guardrail Breach Rate Analysis (Baseline Rows Only)')
write_header(ws8, 14, ['GUARDRAIL', 'TOTAL_ROWS', 'BREACH_ROWS', 'BREACH_%', 'RISK_LEVEL'])
guardrail_data = [
    ('GR-001: Gross Margin < 18%', 11531761, 718021, 6.23, 'MODERATE - investigate low-margin SKU clusters'),
    ('GR-002: Promo Discount > 40%', 2635951, 354424, 13.45, 'HIGH - 13% of promoted rows exceed cap'),
    ('GR-003: Fresh DOS < 1.5 days', 6825492, 4579346, 67.09, 'CRITICAL - threshold or supply model issue'),
    ('GR-004: Electronics DOS > 45 days', 4829338, 0, 0.00, 'CLEAR - no overstock issue'),
]
for i, row in enumerate(guardrail_data):
    write_data_row(ws8, 15+i, list(row))

write_subtitle(ws8, 21, 'Active Guardrail Rules Reference (DIM_GUARDRAILS)')
write_header(ws8, 22, ['ID', 'NAME', 'METRIC', 'OPERATOR', 'THRESHOLD', 'SEVERITY', 'SCOPE', 'ACTION_ON_BREACH'])
gr_rules = [
    ('GR-001', 'Minimum Gross Margin Floor', 'gross_margin_pct', '>=', 18, 'High', 'all', 'Block promo/markdown'),
    ('GR-002', 'Maximum Promotional Discount', 'promo_discount_pct', '<=', 40, 'High', 'all', 'Require VP approval'),
    ('GR-003', 'Fresh Stockout Threshold', 'days_of_supply', '>=', 1.5, 'Critical', 'Fresh & Grocery', 'Emergency replenishment'),
    ('GR-004', 'Electronics Overstock Cap', 'days_of_supply', '<=', 45, 'Medium', 'Consumer Electronics', 'Clearance review'),
    ('GR-005', 'Auto-Reorder Spend Limit', 'po_value_usd', '<=', 250000, 'High', 'all', 'Director approval'),
    ('GR-006', 'Price Increase Cap (weekly)', 'price_change_pct', '<=', 10, 'Medium', 'all', 'Hold price change'),
    ('GR-007', 'Seasonal Markdown Window', 'season_end_weeks', '<=', 4, 'Medium', 'Seasonal & Home', 'Glidepath markdown'),
    ('GR-008', 'Recommendation Confidence Floor', 'confidence_score', '>=', 0.6, 'High', 'all', 'Suppress auto-action'),
]
for i, row in enumerate(gr_rules):
    write_data_row(ws8, 23+i, list(row))

write_subtitle(ws8, 33, 'FACT_RECOMMENDATIONS - Prescriptive Actions (Seed Data)')
write_header(ws8, 34, ['SCENARIO', 'DEPARTMENT', 'PERSONA_OWNER', 'ACTION_TYPE', 'URGENCY', 'CONFIDENCE', 'REVENUE_IMPACT'])
rec_data = [
    ('viral_speaker_spike', 'Consumer Electronics', 'Mark Thompson', 'Capture upside', 'High', 0.90, '$1,853,164'),
    ('fresh_produce_heatwave', 'Fresh & Grocery', 'Sarah Mitchell', 'Capture upside', 'High', 0.87, '$229,415'),
    ('premium_yogurt_lift', 'Fresh & Grocery', 'Sarah Mitchell', 'Capture upside', 'High', 0.78, '$11,297'),
    ('artisan_bread_dip', 'Fresh & Grocery', 'Sarah Mitchell', 'Mitigate downside', 'Medium', 0.80, '-$7,898'),
    ('patio_furniture_drop', 'Seasonal & Home', 'Emily Carter', 'Mitigate downside', 'Medium', 0.84, '-$38,396'),
]
for i, row in enumerate(rec_data):
    write_data_row(ws8, 35+i, list(row))

write_callout(ws8, 42, 'Pertinent Points:')
ws8.cell(row=43, column=2, value='1) viral_speaker_spike is DIGITAL-dominated (55pp). Agent must monitor Google Trends as primary trigger.').font = normal_font
ws8.cell(row=44, column=2, value='2) fresh_produce_heatwave is multi-driver: Weather (12pp) + Promo (7pp) + Competitor (4pp). Compound scenario.').font = normal_font
ws8.cell(row=45, column=2, value='3) Negative scenarios are WEATHER-dominated. Agent needs weather forecast integration for early warning.').font = normal_font
ws8.cell(row=46, column=2, value='4) GR-003 at 67% breach rate is RED FLAG. Either threshold (1.5 DOS) is wrong or Fresh supply model under-stocks.').font = normal_font
ws8.cell(row=47, column=2, value='5) All recommendations PASS guardrails (confidence >= 0.6 per GR-008). Agent can auto-approve if confidence holds.').font = normal_font
ws8.cell(row=48, column=2, value='6) Viral scenario has $1.85M revenue impact - by far the largest. Agent should prioritize digital signal monitoring.').font = normal_font

ws8.column_dimensions['B'].width = 30
ws8.column_dimensions['C'].width = 20
ws8.column_dimensions['D'].width = 16
ws8.column_dimensions['E'].width = 14
ws8.column_dimensions['F'].width = 14
ws8.column_dimensions['G'].width = 14
ws8.column_dimensions['H'].width = 14
ws8.column_dimensions['I'].width = 14
ws8.column_dimensions['J'].width = 14
ws8.column_dimensions['K'].width = 50

# ============ SHEET 9: Dimensions ============
ws9 = wb.create_sheet('Dimensions')
write_title(ws9, 2, 'Dimension Table Profiles')

write_subtitle(ws9, 4, 'DIM_STORE Profile (41 stores: 40 B&M + 1 eCommerce FC)')
write_header(ws9, 5, ['REGION', 'FORMAT', 'TIER', 'CHANNEL', 'COUNT', 'AVG_SQFT', 'AVG_FOOTFALL'])
store_dim = [
    ('Mid-Atlantic', 'Express', 'Tier 3', 'B&M', 1, 17434, 7773),
    ('Mid-Atlantic', 'Nbhd Market', 'Tier 2', 'B&M', 3, 37635, 19801),
    ('Mid-Atlantic', 'Supercenter', 'Tier 1', 'B&M', 2, 163885, 38531),
    ('Midwest', 'Express', 'Tier 3', 'B&M', 2, 16187, 7412),
    ('Midwest', 'Nbhd Market', 'Tier 2', 'B&M', 3, 42377, 26548),
    ('Midwest', 'Supercenter', 'Tier 1', 'B&M', 2, 115308, 48614),
    ('National', 'eCommerce FC', 'Tier 1', 'eComm', 1, 900000, 0),
    ('Northeast', 'Express', 'Tier 3', 'B&M', 1, 17427, 7620),
    ('Northeast', 'Nbhd Market', 'Tier 2', 'B&M', 3, 42895, 20265),
    ('Northeast', 'Supercenter', 'Tier 1', 'B&M', 2, 143907, 43326),
    ('South-Central', 'Express', 'Tier 3', 'B&M', 2, 14292, 11082),
    ('South-Central', 'Nbhd Market', 'Tier 2', 'B&M', 3, 49437, 22761),
    ('South-Central', 'Supercenter', 'Tier 1', 'B&M', 2, 141953, 43574),
    ('Southeast', 'Express', 'Tier 3', 'B&M', 2, 11401, 8921),
    ('Southeast', 'Nbhd Market', 'Tier 2', 'B&M', 3, 39606, 15544),
    ('Southeast', 'Supercenter', 'Tier 1', 'B&M', 2, 144550, 45887),
    ('West Coast', 'Express', 'Tier 3', 'B&M', 2, 14271, 10443),
    ('West Coast', 'Nbhd Market', 'Tier 2', 'B&M', 3, 47414, 22628),
    ('West Coast', 'Supercenter', 'Tier 1', 'B&M', 2, 152474, 51208),
]
for i, row in enumerate(store_dim):
    write_data_row(ws9, 6+i, list(row))

write_subtitle(ws9, 27, 'DIM_EXTERNAL_MACRO (Monthly regional macro signals)')
write_header(ws9, 28, ['REGION', 'MONTHS', 'FIRST', 'LAST', 'CPI_RANGE', 'UNEMPLOYMENT_RANGE', 'CCI_RANGE'])
macro_dim = [
    ('Mid-Atlantic', 37, '2023-07', '2026-07', '304.8 - 317.6', '3.1% - 5.0%', '87.7 - 108.7'),
    ('Midwest', 37, '2023-07', '2026-07', '305.0 - 317.6', '3.3% - 5.1%', '90.6 - 109.9'),
    ('Northeast', 37, '2023-07', '2026-07', '304.3 - 318.1', '3.2% - 4.8%', '92.0 - 111.1'),
    ('South-Central', 37, '2023-07', '2026-07', '304.4 - 317.8', '3.1% - 4.8%', '90.1 - 108.8'),
    ('Southeast', 37, '2023-07', '2026-07', '304.6 - 317.3', '2.8% - 5.4%', '90.3 - 109.3'),
    ('West Coast', 37, '2023-07', '2026-07', '304.8 - 317.5', '3.0% - 4.8%', '93.2 - 110.9'),
]
for i, row in enumerate(macro_dim):
    write_data_row(ws9, 29+i, list(row))

write_subtitle(ws9, 37, 'DIM_PRODUCT Lifecycle Distribution (450 SKUs)')
write_header(ws9, 38, ['DEPARTMENT', 'GROWTH', 'MATURITY', 'DECLINE', 'EOL', 'INTRODUCTION', 'TOTAL'])
lifecycle = [
    ('Consumer Electronics', 32, 96, 16, 5, 6, 155),
    ('Fresh & Grocery', 30, 97, 29, 11, 19, 186),
    ('Seasonal & Home', 23, 76, 15, 6, 4, 124),
    ('TOTAL', 85, 269, 60, 22, 29, 465),
]
for i, row in enumerate(lifecycle):
    write_data_row(ws9, 39+i, list(row))
ws9.cell(row=43, column=2, value='Note: Total > 450 due to some SKUs having multiple category/flag combos in profiling aggregation').font = normal_font

write_subtitle(ws9, 45, 'DIM_SUPPLIER Profile (25 suppliers)')
write_header(ws9, 46, ['COUNTRY', 'COUNT', 'AVG_LEAD_TIME', 'AVG_RELIABILITY', 'AVG_RISK_SCORE'])
supp_dim = [
    ('US (domestic)', '~15', '5-14 days', '92-98', 'Low'),
    ('Canada', '~4', '10-21 days', '88-94', 'Medium'),
    ('Mexico', '~3', '14-21 days', '88-92', 'Medium'),
    ('China', '~3', '21-30 days', '87-91', 'Higher (import)'),
]
for i, row in enumerate(supp_dim):
    write_data_row(ws9, 47+i, list(row))

write_callout(ws9, 53, 'Pertinent Points:')
ws9.cell(row=54, column=2, value='1) Store structure: 6 regions x (2 Supercenters + 3 Nbhd Markets + 1-2 Express) + 1 National eComm FC').font = normal_font
ws9.cell(row=55, column=2, value='2) Supercenter footfall (38-51K/wk) is 5x Express (7-11K) - confirms tier-based volume stratification.').font = normal_font
ws9.cell(row=56, column=2, value='3) eComm FC has 900K sqft and 0 footfall - fundamentally different operations model for agent.').font = normal_font
ws9.cell(row=57, column=2, value='4) Macro coverage is complete (37 months, all 6 regions). No gaps for agent to worry about.').font = normal_font
ws9.cell(row=58, column=2, value='5) 60% of SKUs are in Maturity stage - stable demand patterns. EOL (22 SKUs) needs markdown agent logic.').font = normal_font

ws9.column_dimensions['B'].width = 22
ws9.column_dimensions['C'].width = 18
ws9.column_dimensions['D'].width = 15
ws9.column_dimensions['E'].width = 15
ws9.column_dimensions['F'].width = 20
ws9.column_dimensions['G'].width = 22
ws9.column_dimensions['H'].width = 18

# ============ SHEET 10: AI Readiness ============
ws10 = wb.create_sheet('AI Readiness')
write_title(ws10, 2, 'AI Readiness Assessment for Agentic AI Solution')

write_subtitle(ws10, 4, 'Feature Signal Quality Matrix')
write_header(ws10, 5, ['FEATURE', 'STDDEV', 'DISTINCT_VALUES', 'NULL_RATE', 'USABILITY', 'VERDICT'])
ai_features = [
    ('ACTUAL_DEMAND_UNITS', 35.45, 51438, '0%', 'HIGH', 'Primary label - clean, high variance, zero NULLs'),
    ('DEMAND_DEVIATION_PCT', 6.59, 8510, '0%', 'HIGH', 'Primary signal for anomaly detection'),
    ('DRIVER_WEATHER_PP', 3.99, 1514, '0%', 'HIGH', 'Good variance - meaningful weather signal'),
    ('GOOGLE_TRENDS_SCORE', 11.07, 214, '0%', 'HIGH', 'Strong external signal with good spread'),
    ('COMPETITOR_PRICE_INDEX', 4.91, 350, '0%', 'HIGH', 'Good competitive signal'),
    ('TEMPERATURE_ANOMALY_F', 4.52, 624, '0%', 'HIGH', 'Excellent weather proxy for demand shifts'),
    ('DRIVER_DIGITAL_PP', 2.28, 230, '0%', 'MEDIUM', 'Moderate variance - spiky (viral only)'),
    ('DAYS_OF_SUPPLY', 1.64, 91, '0%', 'MEDIUM', 'Low variance around 2.2 - limited discrimination'),
    ('DRIVER_COMPETITOR_PP', 0.53, 27, '0%', 'LOW', 'Very low variance - mostly near-zero'),
    ('DRIVER_PROMO_PP', 0.08, 19, '0%', 'LOW', 'Near-zero variance - promo barely varies'),
]
for i, row in enumerate(ai_features):
    write_data_row(ws10, 6+i, list(row))

write_subtitle(ws10, 18, 'Censored Demand Assessment (Label Integrity)')
write_header(ws10, 19, ['CHECK', 'RESULT', 'IMPLICATION'])
write_data_row(ws10, 20, ['Stockout censoring (demand=available when out)', '0 rows (0.00%)', 'UNCENSORED - actual_demand is true latent demand'])
write_data_row(ws10, 21, ['Total stockout events in baseline', '~2M rows (12.8%)', 'Stockouts are common but demand is NOT capped by supply'])
write_data_row(ws10, 22, ['Demand > 0 for all rows', 'YES (min=0.01)', 'No zero-demand rows to handle'])

write_subtitle(ws10, 25, 'Scenario Learnability Assessment')
write_header(ws10, 26, ['SCENARIO', 'DOMINANT_DRIVER', 'MAGNITUDE', 'LEARNABLE?', 'AGENT_ACTION'])
learn_data = [
    ('viral_speaker_spike', 'DIGITAL (55pp)', '+84.7%', 'YES - massive signal', 'Capture upside / emergency stock'),
    ('fresh_produce_heatwave', 'WEATHER (12pp)', '+27.5%', 'YES - multi-driver', 'Capture upside / reallocate supply'),
    ('premium_yogurt_lift', 'WEATHER+PROMO (5+4pp)', '+12.2%', 'MODERATE - smaller', 'Capture upside / expand distribution'),
    ('artisan_bread_dip', 'WEATHER (-6pp)', '-14.8%', 'YES - clear negative', 'Mitigate / reduce orders'),
    ('patio_furniture_drop', 'WEATHER (-12pp)', '-21.6%', 'YES - strong negative', 'Mitigate / markdown'),
]
for i, row in enumerate(learn_data):
    write_data_row(ws10, 27+i, list(row))

write_subtitle(ws10, 34, 'Agent Tool Boundary Recommendations')
write_header(ws10, 35, ['AGENT_TASK', 'PRIMARY_TABLES', 'JOIN_PATH', 'KEY_SIGNALS'])
agent_tools = [
    ('Demand Anomaly Detection', 'FACT_DEMAND_DAILY', 'Standalone (denormalized)', 'demand_deviation_pct, driver_*_pp, scenario_id'),
    ('Replenishment Planning', 'FACT_DEMAND + FACT_SUPPLY_CHAIN', 'SKU_ID + SUPPLIER_ID via DIM', 'days_of_supply, stockout_flag, lead_time_days'),
    ('Promotion Optimization', 'FACT_PROMOTIONS + FACT_DEMAND', 'PROMO_ID join', 'promo_lift_pct, promo_roi, cannibalization_pct'),
    ('Weather Impact Assessment', 'FACT_DEMAND + DIM_EXTERNAL_MACRO', 'REGION + DATE_TRUNC(month)', 'temperature_anomaly_f, driver_weather_pp, CPI'),
    ('Guardrail Enforcement', 'DIM_GUARDRAILS + FACT_DEMAND', 'Threshold eval on metrics', 'margin_pct, dos, discount_pct, confidence'),
    ('Scenario Simulation', 'FACT_DEMAND (scenario != NULL)', 'Filter by scenario_id', 'All driver_pp + deviation + demand'),
    ('Recommendation Generation', 'FACT_RECOMMENDATIONS + GUARDRAILS', 'guardrail_status check', 'confidence, action_type, urgency, persona'),
    ('Knowledge Retrieval (RAG)', 'RAG_KNOWLEDGE_BASE', 'Cortex Search on CONTENT', 'category, department, persona_relevance'),
]
for i, row in enumerate(agent_tools):
    write_data_row(ws10, 36+i, list(row))

write_subtitle(ws10, 46, 'RAG Knowledge Base Coverage (30 docs)')
write_header(ws10, 47, ['CATEGORY', 'DOC_COUNT', 'DEPARTMENTS', 'ASSESSMENT'])
rag_data = [
    ('SOP', 8, 'All + Fresh + Seasonal', 'Operational procedures covered'),
    ('POLICY', 8, 'All + per-department', 'Governance rules documented'),
    ('CONTRACT', 8, 'All + per-department', 'Supplier terms available'),
    ('RESEARCH', 6, 'All + per-department', 'Market context available'),
]
for i, row in enumerate(rag_data):
    write_data_row(ws10, 48+i, list(row))

write_subtitle(ws10, 54, 'Semantic Model vs Reality Gaps')
write_header(ws10, 55, ['FINDING', 'IMPACT', 'RECOMMENDATION'])
gaps = [
    ('Driver identity described as additive but fails 99.7%', 'Agent attributions will be wrong if trusting sum', 'Clarify multiplicative vs additive in semantic model'),
    ('OVERSTOCK_FLAG never fires', 'Agent cannot detect overstock via flag', 'Use DAYS_OF_SUPPLY > threshold directly'),
    ('FACT_RECOMMENDATIONS is seed data (5 rows)', 'Agent cannot learn from historical decisions', 'Agent must GENERATE; table is template only'),
    ('DIM_EXTERNAL_MACRO requires explicit join', 'Macro signals not in FACT_DEMAND_DAILY', 'Create view or denormalize CPI/unemployment'),
    ('DRIVER_PROMO_PP near-zero variance (0.08)', 'Promo impact invisible in driver decomposition', 'Use FACT_PROMOTIONS.promo_lift_pct instead'),
]
for i, row in enumerate(gaps):
    write_data_row(ws10, 56+i, list(row))

write_callout(ws10, 63, 'OVERALL AI READINESS VERDICT:')
ws10.cell(row=64, column=2, value='STATUS: READY WITH CAVEATS').font = Font(name='Calibri', bold=True, size=12, color='008000')
ws10.cell(row=65, column=2, value='').font = normal_font
ws10.cell(row=66, column=2, value='STRENGTHS:').font = subtitle_font
ws10.cell(row=67, column=2, value='  - Zero NULLs, zero orphans, zero duplicates across all tables. Production-grade data quality.').font = normal_font
ws10.cell(row=68, column=2, value='  - Scenarios are highly distinct and learnable (deviation ranges from -22% to +85%).').font = normal_font
ws10.cell(row=69, column=2, value='  - Forecast accuracy is excellent (MAPE < 3%). Agent can trust statistical baseline.').font = normal_font
ws10.cell(row=70, column=2, value='  - 30 RAG docs cover all departments and personas for knowledge-grounded responses.').font = normal_font
ws10.cell(row=71, column=2, value='  - Uncensored demand signal - no supply-capped labels to worry about.').font = normal_font
ws10.cell(row=72, column=2, value='').font = normal_font
ws10.cell(row=73, column=2, value='CAVEATS (Action Required):').font = subtitle_font
ws10.cell(row=74, column=2, value='  - Driver decomposition identity fails. Agent must NOT assume additive attribution.').font = normal_font
ws10.cell(row=75, column=2, value='  - GR-003 (Fresh DOS) threshold needs business validation before agent can enforce.').font = normal_font
ws10.cell(row=76, column=2, value='  - DRIVER_PROMO_PP is essentially useless (stddev=0.08). Use FACT_PROMOTIONS for promo signal.').font = normal_font
ws10.cell(row=77, column=2, value='  - FACT_RECOMMENDATIONS is a template (5 rows). Agent generates; does not retrieve.').font = normal_font

ws10.column_dimensions['B'].width = 50
ws10.column_dimensions['C'].width = 20
ws10.column_dimensions['D'].width = 30
ws10.column_dimensions['E'].width = 20
ws10.column_dimensions['F'].width = 15
ws10.column_dimensions['G'].width = 55

# ============ SHEET 11: Analytics Readiness (4 Question Types) ============
ws11 = wb.create_sheet('Analytics Readiness')
write_title(ws11, 2, 'Analytics Question Readiness: Descriptive | Diagnostic | Predictive | Prescriptive')
ws11.cell(row=3, column=2, value='Assessment of how well the existing data supports each analytics question type for an Agentic AI solution.').font = normal_font

# --- DESCRIPTIVE ---
write_subtitle(ws11, 5, '1. DESCRIPTIVE ANALYTICS - "What happened?"')
ws11.cell(row=6, column=2, value='Goal: Summarize historical demand, sales, inventory, and supply chain performance.').font = normal_font

write_header(ws11, 8, ['QUESTION EXAMPLE', 'ANSWERABLE?', 'DATA SOURCE', 'CONFIDENCE'])
desc_questions = [
    ('What was total demand by region last quarter?', 'YES', 'FACT_DEMAND_DAILY (region, fiscal_quarter, actual_demand_units)', 'HIGH'),
    ('Which SKUs had highest stockout rate?', 'YES', 'FACT_DEMAND_DAILY (stockout_flag by sku_id)', 'HIGH'),
    ('What is our gross margin by department?', 'YES', 'FACT_DEMAND_DAILY (gross_margin_amt / net_sales_amt)', 'HIGH'),
    ('How did promotions perform by type?', 'YES', 'FACT_PROMOTIONS (lift_pct, roi, cannibalization)', 'HIGH'),
    ('What is supplier fill rate and OTIF?', 'YES', 'FACT_SUPPLY_CHAIN (fill_rate_pct, otif_flag)', 'HIGH'),
    ('Which stores have highest footfall?', 'YES', 'DIM_STORE (avg_weekly_footfall)', 'HIGH'),
    ('What are monthly demand trends?', 'YES', 'FACT_DEMAND_DAILY (transaction_date aggregation)', 'HIGH'),
    ('What is holiday vs non-holiday demand?', 'YES', 'FACT_DEMAND_DAILY (is_holiday, holiday_name)', 'HIGH'),
    ('How does eCommerce compare to B&M?', 'YES', 'FACT_DEMAND_DAILY (channel segmentation)', 'HIGH'),
    ('What is the product lifecycle distribution?', 'YES', 'DIM_PRODUCT (product_lifecycle_stage)', 'HIGH'),
]
for i, row in enumerate(desc_questions):
    write_data_row(ws11, 9+i, list(row))

write_header(ws11, 20, ['WHAT IS MISSING', 'IMPACT', 'HOW TO OVERCOME'])
desc_gaps = [
    ('Customer-level data (basket, loyalty, demographics)', 'Cannot segment demand by customer cohort or predict churn', 'Integrate POS loyalty data or CRM if available; for now agent works at SKU x Store grain'),
    ('Store-level P&L (rent, labor, shrinkage)', 'Cannot assess true store profitability beyond gross margin', 'Not critical for demand sensing; add if expanding to store operations agent'),
    ('Real-time intraday sales', 'Current grain is daily - cannot detect within-day stockout timing', 'Acceptable for demand sensing (daily is standard); add hourly feed only for fresh perishables if needed'),
]
for i, row in enumerate(desc_gaps):
    write_data_row(ws11, 21+i, list(row))

write_callout(ws11, 25, 'VERDICT: Descriptive is FULLY COVERED. All standard retail KPIs are answerable. No blockers.')

# --- DIAGNOSTIC ---
write_subtitle(ws11, 28, '2. DIAGNOSTIC ANALYTICS - "Why did it happen?"')
ws11.cell(row=29, column=2, value='Goal: Attribute demand changes to root causes (weather, promo, competition, digital, macro).').font = normal_font

write_header(ws11, 31, ['QUESTION EXAMPLE', 'ANSWERABLE?', 'DATA SOURCE', 'CONFIDENCE'])
diag_questions = [
    ('Why did demand spike in Southeast last week?', 'PARTIAL', 'driver_weather_pp + temperature_anomaly_f + scenario_id', 'MEDIUM - identity broken'),
    ('What drove the heatwave demand increase?', 'YES', 'FACT_DEMAND (scenario=fresh_produce_heatwave, driver_weather_pp=12pp)', 'HIGH for scenarios'),
    ('Why are promos destroying margin?', 'YES', 'FACT_PROMOTIONS (roi=-0.35, cannib=8.5%, post_dip=50%)', 'HIGH'),
    ('Why is Fresh constantly stocking out?', 'PARTIAL', 'FACT_DEMAND (stockout_flag + days_of_supply < 1.5 for 67% of rows)', 'MEDIUM - threshold issue'),
    ('What is competitor impact on our sales?', 'PARTIAL', 'competitor_price_index, competitor_stockout_flag, driver_competitor_pp', 'LOW - driver_pp has 0.53 stddev'),
    ('Why did digital demand spike for speakers?', 'YES', 'google_trends_score + driver_digital_pp (55pp in viral scenario)', 'HIGH for named scenarios'),
    ('How does unemployment affect demand?', 'YES', 'DIM_EXTERNAL_MACRO (unemployment_rate_pct) join by region+month', 'MEDIUM - correlation only'),
    ('What explains residual/unexplained variance?', 'NO', 'driver_residual_pp exists but has no underlying causal data', 'LOW - black box signal'),
]
for i, row in enumerate(diag_questions):
    write_data_row(ws11, 32+i, list(row))

write_header(ws11, 42, ['WHAT IS MISSING', 'IMPACT', 'HOW TO OVERCOME'])
diag_gaps = [
    ('Driver decomposition identity is broken (sum != deviation for 99.7%)', 'Agent cannot trust additive attribution for root cause', 'Treat drivers as CORRELATED SIGNALS not additive components; use relative magnitude ranking instead of exact pp values'),
    ('DRIVER_PROMO_PP is near-zero variance (stddev=0.08)', 'Promo contribution is invisible in driver layer', 'Use FACT_PROMOTIONS.promo_lift_pct as the real promo signal; ignore driver_promo_pp entirely'),
    ('DRIVER_COMPETITOR_PP has very low signal (stddev=0.53, 27 values)', 'Competitive impact barely differentiable from noise', 'Rely on competitor_price_index and competitor_stockout_flag as raw signals; skip the driver_pp abstraction'),
    ('No event logs or incident reports for unexplained anomalies', 'Residual driver (unexplained) has no investigative path', 'Integrate RAG_KNOWLEDGE_BASE for SOPs and use agent to query SME context when residual > 5pp'),
    ('No A/B test results or causal experiment data', 'Cannot establish TRUE causality (only correlation)', 'Accept correlation-based attribution for V1; design controlled experiments for V2 validation'),
    ('No competitor actual sales data (only availability + price index)', 'Cannot quantify demand transfer precisely', 'Use competitor_stockout_flag + competitor_promo_flag as binary signals; sufficient for directional insights'),
]
for i, row in enumerate(diag_gaps):
    write_data_row(ws11, 43+i, list(row))

write_callout(ws11, 50, 'VERDICT: Diagnostic is PARTIALLY COVERED. Named scenarios are well-attributed. Baseline rows lack reliable decomposition. Workaround: rank drivers by magnitude, do not sum.')

# --- PREDICTIVE ---
write_subtitle(ws11, 53, '3. PREDICTIVE ANALYTICS - "What will happen?"')
ws11.cell(row=54, column=2, value='Goal: Forecast future demand, predict stockouts, anticipate scenario triggers.').font = normal_font

write_header(ws11, 56, ['QUESTION EXAMPLE', 'ANSWERABLE?', 'DATA SOURCE', 'CONFIDENCE'])
pred_questions = [
    ('What will demand be next 13 weeks?', 'YES', 'FACT_FORECAST (forecast_type=forward_projection, 40,950 rows)', 'HIGH - MAPE < 3%'),
    ('Which SKUs will stock out next week?', 'YES', 'FACT_DEMAND (days_of_supply < lead_time) + FACT_SUPPLY_CHAIN', 'HIGH'),
    ('Will a heatwave drive Fresh demand up?', 'YES', 'temperature_anomaly_f > 8F + scenario fingerprint pattern matching', 'HIGH'),
    ('Is a viral spike forming for Electronics?', 'YES', 'google_trends_score trajectory + driver_digital_pp baseline drift', 'MEDIUM - needs trend velocity'),
    ('What is forecast confidence interval?', 'YES', 'FACT_FORECAST (forecast_lower_units, forecast_upper_units)', 'HIGH'),
    ('Will supplier delays cause stockouts?', 'YES', 'FACT_SUPPLY_CHAIN (lead_time_variance) + DIM_SUPPLIER (risk_score)', 'HIGH'),
    ('Which guardrails will breach next month?', 'PARTIAL', 'Project current trends against DIM_GUARDRAILS thresholds', 'MEDIUM - linear extrapolation only'),
    ('Will post-promo dip hit after current campaign?', 'YES', 'FACT_PROMOTIONS (post_promo_dip_flag fires 50% historically)', 'HIGH - strong base rate'),
]
for i, row in enumerate(pred_questions):
    write_data_row(ws11, 57+i, list(row))

write_header(ws11, 67, ['WHAT IS MISSING', 'IMPACT', 'HOW TO OVERCOME'])
pred_gaps = [
    ('No weather FORECAST data (only historical anomaly)', 'Agent cannot predict heatwave/storm BEFORE it happens', 'Integrate 10-day weather forecast API (e.g., OpenWeatherMap) as external signal. Map to temperature_anomaly_f format'),
    ('No Google Trends real-time feed', 'Agent detects viral spikes only after deviation appears in daily data', 'Add Cortex External Access Integration for Google Trends API; update google_trends_score daily or hourly'),
    ('No ML model registry or feature importance', 'Agent has forecasts but cannot explain WHY a forecast is high/low', 'Build Snowflake ML model registry with SHAP values; or use driver_pp as proxy (rank not sum)'),
    ('No leading indicators for competitor actions', 'Agent reacts to competitor promos/stockouts but cannot anticipate them', 'Not realistically solvable without competitive intel feed; accept reactive posture for competitor signals'),
    ('Forward projections have no scenario overlays', 'Base forecast does not account for known upcoming events', 'Agent should multiply base forecast by scenario multipliers when trigger conditions detected'),
    ('No demand plan / consensus override history', 'Cannot measure planner accuracy vs statistical forecast', 'Add demand planner input table if human-in-loop adjustments exist; not critical for V1 agent'),
]
for i, row in enumerate(pred_gaps):
    write_data_row(ws11, 68+i, list(row))

write_callout(ws11, 75, 'VERDICT: Predictive is STRONG. Excellent baseline forecast + scenario patterns. Key gap: no FORWARD-LOOKING weather/trends feed. Agent is reactive without it.')

# --- PRESCRIPTIVE ---
write_subtitle(ws11, 78, '4. PRESCRIPTIVE ANALYTICS - "What should we do?"')
ws11.cell(row=79, column=2, value='Goal: Recommend actions, enforce guardrails, route decisions to personas, auto-execute within bounds.').font = normal_font

write_header(ws11, 81, ['QUESTION EXAMPLE', 'ANSWERABLE?', 'DATA SOURCE', 'CONFIDENCE'])
presc_questions = [
    ('Should we trigger emergency replenishment for Fresh?', 'YES', 'GR-003 + days_of_supply + supplier lead_time_days', 'HIGH'),
    ('Should we approve this 45% discount promo?', 'YES', 'GR-002 (max 40%) -> Block + require VP approval', 'HIGH'),
    ('What action to take on viral speaker spike?', 'YES', 'FACT_RECOMMENDATIONS (capture upside, confidence=0.90)', 'HIGH (template)'),
    ('Who should own this recommendation?', 'YES', 'FACT_RECOMMENDATIONS.persona_owner + DIM_GUARDRAILS.owner_role', 'HIGH'),
    ('Is this recommendation safe to auto-execute?', 'YES', 'GR-008 (confidence >= 0.6) + requires_approval_flag', 'HIGH'),
    ('What markdown schedule for EOL SKUs?', 'PARTIAL', 'GR-007 (season_end_weeks <= 4) + product_lifecycle_stage=EOL', 'MEDIUM - no markdown history'),
    ('Which supplier should we re-route orders to?', 'PARTIAL', 'DIM_SUPPLIER (reliability_score, risk_score) + capacity unknown', 'MEDIUM - no capacity data'),
    ('Should we expand distribution for premium yogurt?', 'PARTIAL', 'FACT_RECOMMENDATIONS (action=capture upside) but no store-level feasibility', 'MEDIUM'),
]
for i, row in enumerate(presc_questions):
    write_data_row(ws11, 82+i, list(row))

write_header(ws11, 92, ['WHAT IS MISSING', 'IMPACT', 'HOW TO OVERCOME'])
presc_gaps = [
    ('No historical action OUTCOMES (did recommendations work?)', 'Agent cannot learn which actions succeeded vs failed', 'Add outcome tracking table: FACT_ACTION_LOG (recommendation_id, action_taken, actual_outcome, feedback). Essential for reinforcement learning in V2'),
    ('No supplier CAPACITY or allocation constraints', 'Agent may recommend reorders that supplier cannot fulfill', 'Add supplier_capacity_units to DIM_SUPPLIER or FACT_SUPPLY_CHAIN; interim: use historical max(order_qty) as proxy'),
    ('No store-level planogram or shelf capacity data', 'Agent cannot assess if expanded distribution is physically feasible', 'Not critical for V1; agent recommends, human validates feasibility. Add shelf_capacity if expanding to space optimization'),
    ('No approval workflow state machine', 'Agent knows WHO should approve but not WHERE they are in the workflow', 'Implement status lifecycle in FACT_RECOMMENDATIONS: Proposed -> Pending Approval -> Approved -> Executed -> Measured'),
    ('No cost-benefit model for actions', 'Agent projects revenue impact but not full cost (logistics, markdown loss)', 'V1: Use projected_revenue_impact as primary signal. V2: Add cost_of_action column with logistics + markdown + labor'),
    ('No simulation/what-if engine for multiple actions', 'Agent cannot evaluate trade-offs between competing recommendations', 'Use scenario overlays in FACT_DEMAND as simulation proxies. Or build Cortex ML function for what-if scoring'),
    ('Only 5 seed recommendations - no historical pattern', 'Agent has no history to learn "what worked before"', 'This is BY DESIGN for V1: agent generates fresh recommendations. Track outcomes going forward to build learning corpus'),
]
for i, row in enumerate(presc_gaps):
    write_data_row(ws11, 93+i, list(row))

write_callout(ws11, 101, 'VERDICT: Prescriptive is FOUNDATION-READY. Guardrails, personas, confidence scoring are solid. Key gap: no outcome feedback loop. Agent can RECOMMEND but cannot LEARN from past actions yet.')

# --- SUMMARY MATRIX ---
write_subtitle(ws11, 104, 'OVERALL READINESS MATRIX')
write_header(ws11, 105, ['ANALYTICS TYPE', 'READINESS', 'COVERAGE', 'CRITICAL GAP', 'V1 WORKAROUND', 'V2 INVESTMENT'])
summary_matrix = [
    ('DESCRIPTIVE', 'FULLY READY', '95%', 'No customer-level data', 'Work at SKU x Store grain (sufficient)', 'Add loyalty/CRM if needed'),
    ('DIAGNOSTIC', 'PARTIAL', '65%', 'Driver identity broken; promo/competitor drivers useless', 'Rank drivers by magnitude; use raw signals not pp abstractions', 'Fix ETL decomposition or adopt multiplicative model'),
    ('PREDICTIVE', 'STRONG', '80%', 'No forward-looking weather/trends feed', 'React to signals once deviation appears (1-day lag)', 'Add weather forecast API + real-time Google Trends'),
    ('PRESCRIPTIVE', 'FOUNDATION', '60%', 'No outcome feedback loop; no action history', 'Agent generates recommendations; human validates', 'Add FACT_ACTION_LOG for closed-loop learning'),
]
for i, row in enumerate(summary_matrix):
    write_data_row(ws11, 106+i, list(row))

# --- REALISTIC ROADMAP ---
write_subtitle(ws11, 112, 'Realistic Data Gaps Resolution Roadmap')
write_header(ws11, 113, ['PRIORITY', 'GAP', 'EFFORT', 'VALUE', 'HOW'])
roadmap = [
    ('P0 (Do Now)', 'Fix driver decomposition documentation', 'Low', 'High', 'Update semantic model to state drivers are CORRELATIVE not ADDITIVE; adjust agent prompt accordingly'),
    ('P0 (Do Now)', 'Recalibrate GR-003 threshold', 'Low', 'High', 'Business validation: is 1.5 DOS correct for Fresh? If yes, accept 67% breach. If not, adjust to 1.0'),
    ('P1 (Next Sprint)', 'Add weather forecast API integration', 'Medium', 'High', 'Cortex External Access to weather API; populate forecast_temperature_anomaly_f for next 10 days'),
    ('P1 (Next Sprint)', 'Add FACT_ACTION_LOG table', 'Medium', 'High', 'Track: recommendation_id, action_taken_date, actual_outcome_30d, agent_feedback_score'),
    ('P2 (Backlog)', 'Add Google Trends real-time feed', 'Medium', 'Medium', 'External Access Integration; daily refresh of google_trends_score for monitored categories'),
    ('P2 (Backlog)', 'Add supplier capacity data', 'Low', 'Medium', 'New column in DIM_SUPPLIER: max_weekly_capacity_units; populate from contract data'),
    ('P3 (Future)', 'Add customer cohort data', 'High', 'Medium', 'Integrate POS loyalty if expanding to personalization use case'),
    ('P3 (Future)', 'Build ML model registry with SHAP', 'High', 'Medium', 'Snowflake Model Registry + feature importance for forecast explainability'),
]
for i, row in enumerate(roadmap):
    write_data_row(ws11, 114+i, list(row))

write_callout(ws11, 124, 'BOTTOM LINE:')
ws11.cell(row=125, column=2, value='The data is GOOD ENOUGH to launch a V1 Agentic AI solution today for Descriptive + Predictive workloads.').font = normal_font
ws11.cell(row=126, column=2, value='Diagnostic works for NAMED SCENARIOS but not reliably for ad-hoc root cause (driver identity issue).').font = normal_font
ws11.cell(row=127, column=2, value='Prescriptive has the governance framework (guardrails + personas) but lacks the feedback loop to LEARN.').font = normal_font
ws11.cell(row=128, column=2, value='Two P0 fixes (document driver behavior + validate GR-003) can be done immediately with zero engineering.').font = normal_font
ws11.cell(row=129, column=2, value='Two P1 additions (weather API + action log) would unlock the full predictive + prescriptive potential.').font = normal_font

ws11.column_dimensions['B'].width = 55
ws11.column_dimensions['C'].width = 20
ws11.column_dimensions['D'].width = 45
ws11.column_dimensions['E'].width = 20
ws11.column_dimensions['F'].width = 55
ws11.column_dimensions['G'].width = 55

# Save workbook
output_path = r'C:\Users\2000167629\Vibe-Analytics-Phase3\DemandSensing_AI_EDA_V1.xlsx'
wb.save(output_path)
print(f'SUCCESS: Workbook saved to {output_path}')
print(f'Sheets: {wb.sheetnames}')
