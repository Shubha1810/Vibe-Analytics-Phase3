-- ====================================================================
-- Vibe Analytics :: Demand Sensing :: Snowflake Horizon DDL (CORRECTED)
-- Retailer: Brightway Retail   Scale: full
-- Account  : HEXCOCO
-- Database : DEMANDSENSING_AI          (pre-provisioned)
-- Schema   : DEMANDSENSING_SCHEMA      (pre-provisioned)
-- Stage    : DEMANDSENSING_STAGE       (pre-provisioned)
-- Warehouse: COCO_HOL_WH              (pre-provisioned)
-- Auto-generated; column types inferred from produced Parquet schemas.
-- ====================================================================
-- CORRECTIONS APPLIED:
--   1. DIM_EXTERNAL_MACRO.month_start changed from DATE to NUMBER(38,0)
--      (parquet stores epoch integers, not DATE values).
--   2. FACT_DEMAND_DAILY.transaction_date changed from DATE to NUMBER(38,0)
--      (parquet stores epoch integers, not DATE values).
--   3. FACT_FORECAST.week_start_date changed from DATE to NUMBER(38,0)
--      (parquet stores epoch integers, not DATE values).
--   4. FACT_DEMAND_DAILY COPY INTO path fixed: files are at stage root
--      as part-STR-*.parquet, NOT in a FACT_DEMAND_DAILY/ subfolder.
--   5. Post-load STEP 5B added to convert epoch NUMBER columns to proper
--      DATE columns after data is loaded.
-- ====================================================================

-- =====================================================================
-- STEP 0 — Set context (run this first in any Snowflake SQL worksheet)
-- =====================================================================
USE WAREHOUSE COCO_HOL_WH;
USE DATABASE DEMANDSENSING_AI;
USE SCHEMA DEMANDSENSING_AI.DEMANDSENSING_SCHEMA;

-- =====================================================================
-- STEP 1 — File formats (safe to re-run; already-provisioned stage
--          is left untouched — we reference @DEMANDSENSING_STAGE)
-- =====================================================================
CREATE FILE FORMAT IF NOT EXISTS FF_PARQUET
    TYPE = PARQUET
    SNAPPY_COMPRESSION = TRUE;

CREATE FILE FORMAT IF NOT EXISTS FF_CSV_GZ
    TYPE = CSV
    FIELD_OPTIONALLY_ENCLOSED_BY = '"'
    SKIP_HEADER = 1
    COMPRESSION = GZIP
    NULL_IF = ('', 'NULL');

-- =====================================================================
-- STEP 2 — Tables  (CREATE OR REPLACE is safe for first load;
--          change to CREATE TABLE IF NOT EXISTS for idempotent re-runs)
-- =====================================================================

-- Product master (450 SKUs).
CREATE OR REPLACE TABLE DIM_PRODUCT (
    sku_id                           VARCHAR NOT NULL COMMENT 'Stock-keeping unit identifier (FK to DIM_PRODUCT).',
    product_name                     VARCHAR COMMENT 'Marketing product name.',
    upc_code                         VARCHAR COMMENT '12-digit UPC barcode.',
    brand                            VARCHAR COMMENT 'Brand name.',
    category_l1                      VARCHAR COMMENT 'Department-level category (level 1).',
    category_l2                      VARCHAR COMMENT 'Category group (level 2).',
    category_l3                      VARCHAR COMMENT 'Sub-category / segment (level 3).',
    category_l4                      VARCHAR COMMENT 'Detailed category (level 4).',
    private_label_flag               BOOLEAN COMMENT 'True if a private-label / store brand product.',
    pack_size                        NUMBER(18,0) COMMENT 'Selling pack size.',
    unit_of_measure                  VARCHAR COMMENT 'Unit of measure (each, lb, etc.).',
    weight_kg                        FLOAT COMMENT 'Unit weight in kilograms.',
    shelf_life_days                  NUMBER(18,0) COMMENT 'Shelf life in days (0 = non-perishable).',
    perishable_flag                  BOOLEAN COMMENT 'True if the product is perishable.',
    product_lifecycle_stage          VARCHAR COMMENT 'Lifecycle stage (Launch, Growth, Mature, Decline).',
    first_sale_date                  DATE COMMENT 'Date the SKU was first sellable.',
    discontinuation_date             DATE COMMENT 'Date the SKU was discontinued (if any).',
    substitution_sku_id              VARCHAR COMMENT 'Recommended substitute SKU (if any).',
    CONSTRAINT PK_DIM_PRODUCT PRIMARY KEY (sku_id)
) COMMENT = 'Product master (450 SKUs).';

-- Store / node master (40 B&M + 1 eComm).
CREATE OR REPLACE TABLE DIM_STORE (
    store_id                         VARCHAR NOT NULL COMMENT 'Store / node identifier (FK to DIM_STORE).',
    store_name                       VARCHAR COMMENT 'Store display name.',
    store_format                     VARCHAR COMMENT 'Store format (Supercenter, Supermarket, Neighborhood, eComm).',
    store_tier                       VARCHAR COMMENT 'Performance / volume tier of the store.',
    region                           VARCHAR COMMENT 'Sales region (6 B&M regions + National for eComm).',
    state                            VARCHAR COMMENT 'US state.',
    city                             VARCHAR COMMENT 'City.',
    zip_code                         VARCHAR COMMENT 'Postal code.',
    latitude                         FLOAT COMMENT 'Store latitude.',
    longitude                        FLOAT COMMENT 'Store longitude.',
    total_sqft                       NUMBER(18,0) COMMENT 'Total store square footage.',
    selling_sqft                     NUMBER(18,0) COMMENT 'Selling-floor square footage.',
    store_open_date                  DATE COMMENT 'Date the store opened.',
    store_cluster_id                 VARCHAR COMMENT 'Analytic store cluster assignment.',
    channel                          VARCHAR COMMENT 'Sales channel (Store or eCommerce).',
    dc_id                            VARCHAR COMMENT 'Distribution centre serving the store.',
    avg_weekly_footfall              NUMBER(18,0) COMMENT 'Average weekly customer footfall.',
    CONSTRAINT PK_DIM_STORE PRIMARY KEY (store_id)
) COMMENT = 'Store / node master (40 B&M + 1 eComm).';

-- Supplier master.
CREATE OR REPLACE TABLE DIM_SUPPLIER (
    supplier_id                      VARCHAR NOT NULL COMMENT 'Supplier identifier (FK to DIM_SUPPLIER).',
    supplier_name                    VARCHAR COMMENT 'Supplier name.',
    supplier_lead_time_days          NUMBER(18,0) COMMENT 'Nominal supplier lead time in days.',
    supplier_reliability_score       FLOAT COMMENT 'Supplier reliability score (0-100).',
    supplier_country                 VARCHAR COMMENT 'Supplier country of origin.',
    supply_risk_score                NUMBER(18,0) COMMENT 'Composite supply risk score.',
    CONSTRAINT PK_DIM_SUPPLIER PRIMARY KEY (supplier_id)
) COMMENT = 'Supplier master.';

-- Region-month macro-economic signals.
-- NOTE: month_start is loaded as NUMBER (epoch days) from parquet;
--       converted to DATE in STEP 5B below.
CREATE OR REPLACE TABLE DIM_EXTERNAL_MACRO (
    region                           VARCHAR NOT NULL COMMENT 'Sales region (6 B&M regions + National for eComm).',
    month_start                      NUMBER(38,0) NOT NULL COMMENT 'First calendar day of the macro month (epoch days — converted to DATE in STEP 5B).',
    cpi_index                        FLOAT COMMENT 'Consumer price index for the region-month.',
    unemployment_rate_pct            FLOAT COMMENT 'Unemployment rate (percent).',
    consumer_confidence_index        FLOAT COMMENT 'Consumer confidence index.',
    CONSTRAINT PK_DIM_EXTERNAL_MACRO PRIMARY KEY (region, month_start)
) COMMENT = 'Region-month macro-economic signals.';

-- Governance guardrail rules.
CREATE OR REPLACE TABLE DIM_GUARDRAILS (
    guardrail_id                     VARCHAR NOT NULL COMMENT 'Governance guardrail identifier.',
    guardrail_name                   VARCHAR COMMENT 'Guardrail rule name.',
    scope_department                 VARCHAR COMMENT 'Department scope of the rule.',
    metric                           VARCHAR COMMENT 'Metric the guardrail evaluates.',
    operator                         VARCHAR COMMENT 'Comparison operator.',
    threshold_value                  FLOAT COMMENT 'Threshold value for the rule.',
    action_on_breach                 VARCHAR COMMENT 'Action taken when the rule is breached.',
    severity                         VARCHAR COMMENT 'Severity level.',
    owner_role                       VARCHAR COMMENT 'Owning role / team.',
    description                      VARCHAR COMMENT 'Human-readable rule description.',
    active_flag                      BOOLEAN COMMENT 'True if the rule is active.',
    CONSTRAINT PK_DIM_GUARDRAILS PRIMARY KEY (guardrail_id)
) COMMENT = 'Governance guardrail rules.';

-- Master one-big-table: daily SKU x store demand, sales, inventory, drivers, forecast and scenario attribution.
-- NOTE: transaction_date is loaded as NUMBER (epoch days) from parquet;
--       converted to DATE in STEP 5B below.
CREATE OR REPLACE TABLE FACT_DEMAND_DAILY (
    transaction_date                 NUMBER(38,0) NOT NULL COMMENT 'Calendar day of the demand record — epoch days (converted to DATE in STEP 5B).',
    fiscal_year                      NUMBER(18,0) COMMENT 'NRF 4-4-5 fiscal year.',
    fiscal_quarter                   VARCHAR COMMENT 'Fiscal quarter label (FQ{yyyy}Q{n}).',
    fiscal_month                     VARCHAR COMMENT 'Fiscal month label (FM{yyyy}{mm}).',
    fiscal_week                      VARCHAR COMMENT 'Fiscal week label (FW{yyyy}{ww}) under the 4-4-5 calendar.',
    store_id                         VARCHAR NOT NULL COMMENT 'Store / node identifier (FK to DIM_STORE).',
    sku_id                           VARCHAR NOT NULL COMMENT 'Stock-keeping unit identifier (FK to DIM_PRODUCT).',
    region                           VARCHAR COMMENT 'Sales region (6 B&M regions + National for eComm).',
    channel                          VARCHAR COMMENT 'Sales channel (Store or eCommerce).',
    category_l3                      VARCHAR COMMENT 'Sub-category / segment (level 3).',
    department                       VARCHAR COMMENT 'Department the record applies to.',
    brand                            VARCHAR COMMENT 'Brand name.',
    baseline_forecast_units          FLOAT COMMENT 'Structural baseline demand before drivers/scenarios.',
    expected_demand_units            FLOAT COMMENT 'Model expected demand after all multiplicative drivers.',
    forecast_units                   FLOAT COMMENT 'Operational statistical forecast (with bias/noise).',
    actual_demand_units              FLOAT COMMENT 'Latent true demand (pre-stockout censoring).',
    units_sold                       NUMBER(18,0) COMMENT 'Units actually sold (censored by availability).',
    units_sold_reg                   NUMBER(18,0) COMMENT 'Units sold at regular price.',
    units_sold_promo                 NUMBER(18,0) COMMENT 'Units sold on promotion.',
    returns_units                    NUMBER(18,0) COMMENT 'Units returned.',
    net_units                        NUMBER(18,0) COMMENT 'Net units (units_sold - returns_units).',
    lost_sales_units_est             NUMBER(18,0) COMMENT 'Estimated lost sales from stockouts.',
    demand_deviation_pct             FLOAT COMMENT 'Percent deviation of actual vs expected demand.',
    forecast_error_units             FLOAT COMMENT 'Forecast minus actual demand (units).',
    regular_price                    FLOAT COMMENT 'Regular (non-promo) list price.',
    avg_selling_price                FLOAT COMMENT 'Average realized selling price.',
    promo_flag                       BOOLEAN COMMENT 'True if the SKU-store-day was on promotion.',
    promo_discount_pct               FLOAT COMMENT 'Promotional discount percent.',
    promo_id                         VARCHAR COMMENT 'Promotion identifier (FK to FACT_PROMOTIONS).',
    gross_sales_amt                  FLOAT COMMENT 'Gross sales amount (units_sold x price).',
    returns_amt                      FLOAT COMMENT 'Returns amount.',
    net_sales_amt                    FLOAT COMMENT 'Net sales (gross - returns).',
    cogs_amt                         FLOAT COMMENT 'Cost of goods sold.',
    gross_margin_amt                 FLOAT COMMENT 'Gross margin (net sales - COGS).',
    on_hand_units                    NUMBER(18,0) COMMENT 'Beginning on-hand inventory units.',
    ending_on_hand_units             NUMBER(18,0) COMMENT 'Ending on-hand inventory units.',
    available_to_sell_units          NUMBER(18,0) COMMENT 'Units available to sell (capacity).',
    days_of_supply                   FLOAT COMMENT 'Days of supply at current run rate.',
    safety_stock_units               NUMBER(18,0) COMMENT 'Safety stock target units.',
    reorder_point_units              NUMBER(18,0) COMMENT 'Reorder point units.',
    on_order_units                   NUMBER(18,0) COMMENT 'Units currently on order.',
    in_transit_units                 NUMBER(18,0) COMMENT 'Units in transit.',
    stockout_flag                    BOOLEAN COMMENT 'True if the SKU-store-day was stocked out.',
    overstock_flag                   BOOLEAN COMMENT 'True if inventory exceeds the overstock threshold.',
    temperature_high_f               FLOAT COMMENT 'Daily high temperature (F).',
    temperature_anomaly_f            FLOAT COMMENT 'Temperature anomaly vs seasonal norm (F).',
    precipitation_inches             FLOAT COMMENT 'Daily precipitation (inches).',
    weather_condition                VARCHAR COMMENT 'Categorical weather condition.',
    google_trends_score              FLOAT COMMENT 'Regional Google Trends interest score.',
    competitor_availability_pct      FLOAT COMMENT 'Competitor in-stock availability percent.',
    competitor_price_index           FLOAT COMMENT 'Competitor price index (100 = parity).',
    competitor_stockout_flag         BOOLEAN COMMENT 'True if a key competitor was stocked out.',
    competitor_promo_flag            BOOLEAN COMMENT 'True if a key competitor was running a promotion.',
    is_holiday                       BOOLEAN COMMENT 'True if the day is a tracked retail holiday.',
    holiday_name                     VARCHAR COMMENT 'Name of the retail event / holiday (if any).',
    driver_weather_pp                FLOAT COMMENT 'Weather contribution to deviation (percentage points).',
    driver_promo_pp                  FLOAT COMMENT 'Promo contribution to deviation (percentage points).',
    driver_competitor_pp             FLOAT COMMENT 'Competitor contribution to deviation (pp).',
    driver_digital_pp                FLOAT COMMENT 'Digital/social contribution to deviation (pp).',
    driver_residual_pp               FLOAT COMMENT 'Unexplained residual contribution to deviation (pp).',
    scenario_id                      VARCHAR COMMENT 'Scenario overlay tag (NULL for baseline rows).',
    CONSTRAINT PK_FACT_DEMAND_DAILY PRIMARY KEY (transaction_date, store_id, sku_id),
    CONSTRAINT FK_FACT_DEMAND_DAILY_PRODUCT FOREIGN KEY (sku_id) REFERENCES DIM_PRODUCT (sku_id),
    CONSTRAINT FK_FACT_DEMAND_DAILY_STORE FOREIGN KEY (store_id) REFERENCES DIM_STORE (store_id)
) COMMENT = 'Master OBT: daily SKU x store demand, sales, inventory, drivers, forecast and scenario attribution.'
  CLUSTER BY (transaction_date, store_id);

-- Weekly forecast vs actual (history) + 13-week forward projection.
-- NOTE: week_start_date is loaded as NUMBER (epoch days) from parquet;
--       converted to DATE in STEP 5B below.
CREATE OR REPLACE TABLE FACT_FORECAST (
    sku_id                           VARCHAR NOT NULL COMMENT 'Stock-keeping unit identifier (FK to DIM_PRODUCT).',
    region                           VARCHAR NOT NULL COMMENT 'Sales region (6 B&M regions + National for eComm).',
    fiscal_year                      NUMBER(18,0) NOT NULL COMMENT 'NRF 4-4-5 fiscal year.',
    fiscal_week                      VARCHAR NOT NULL COMMENT 'Fiscal week label (FW{yyyy}{ww}) under the 4-4-5 calendar.',
    expected_units                   FLOAT COMMENT 'Weekly aggregated expected demand units.',
    forecast_units                   FLOAT COMMENT 'Operational statistical forecast (with bias/noise).',
    actual_units                     FLOAT COMMENT 'Weekly aggregated actual demand units.',
    units_sold                       FLOAT COMMENT 'Units actually sold (censored by availability).',
    week_start_date                  NUMBER(38,0) COMMENT 'Sunday week-start date — epoch days (converted to DATE in STEP 5B).',
    forecast_bias_pct                FLOAT COMMENT 'Forecast bias percent (forecast vs actual).',
    abs_pct_error                    FLOAT COMMENT 'Absolute percent error (MAPE component).',
    consensus_forecast_units         FLOAT COMMENT 'Consensus (blended) forecast units.',
    forecast_lower_units             FLOAT COMMENT 'Lower forecast bound (P10).',
    forecast_upper_units             FLOAT COMMENT 'Upper forecast bound (P90).',
    forecast_type                    VARCHAR NOT NULL COMMENT 'actuals_vs_forecast (history) or forward_projection.',
    horizon_week                     FLOAT COMMENT 'Forward horizon week index (1..13) for projections.',
    CONSTRAINT PK_FACT_FORECAST PRIMARY KEY (sku_id, region, fiscal_year, fiscal_week, forecast_type),
    CONSTRAINT FK_FACT_FORECAST_PRODUCT FOREIGN KEY (sku_id) REFERENCES DIM_PRODUCT (sku_id)
) COMMENT = 'Weekly forecast vs actual (history) + 13-week forward projection.';

-- Promotion master + analytic post-promo metrics.
CREATE OR REPLACE TABLE FACT_PROMOTIONS (
    promo_id                         VARCHAR NOT NULL COMMENT 'Promotion identifier (FK to FACT_PROMOTIONS).',
    promo_name                       VARCHAR COMMENT 'Promotion display name.',
    promo_type                       VARCHAR COMMENT 'Promotion mechanic type.',
    promo_start_date                 DATE COMMENT 'Promotion start date.',
    promo_end_date                   DATE COMMENT 'Promotion end date.',
    promo_duration_days              NUMBER(18,0) COMMENT 'Promotion duration in days.',
    sku_id                           VARCHAR COMMENT 'Stock-keeping unit identifier (FK to DIM_PRODUCT).',
    store_id                         VARCHAR COMMENT 'Store / node identifier (FK to DIM_STORE).',
    promo_discount_pct               FLOAT COMMENT 'Promotional discount percent.',
    promo_price                      FLOAT COMMENT 'Promotional price.',
    ad_vehicle                       VARCHAR COMMENT 'Advertising vehicle.',
    display_type                     VARCHAR COMMENT 'In-store display type.',
    vendor_funded_flag               BOOLEAN COMMENT 'True if vendor-funded.',
    vendor_funding_amt               FLOAT COMMENT 'Vendor funding amount.',
    promo_lift_pct                   FLOAT COMMENT 'Measured promotional lift percent.',
    promo_units_incremental          NUMBER(18,0) COMMENT 'Incremental units attributed to the promo.',
    promo_roi                        FLOAT COMMENT 'Promotion return on investment.',
    cannibalization_pct              FLOAT COMMENT 'Cannibalization of related SKUs (percent).',
    halo_effect_pct                  FLOAT COMMENT 'Halo lift on related SKUs (percent).',
    post_promo_dip_flag              BOOLEAN COMMENT 'True if a post-promo demand dip was observed.',
    CONSTRAINT PK_FACT_PROMOTIONS PRIMARY KEY (promo_id),
    CONSTRAINT FK_FACT_PROMOTIONS_PRODUCT FOREIGN KEY (sku_id) REFERENCES DIM_PRODUCT (sku_id)
) COMMENT = 'Promotion master + analytic post-promo metrics.';

-- Purchase orders, lead time, fill rate, OTIF.
CREATE OR REPLACE TABLE FACT_SUPPLY_CHAIN (
    po_id                            VARCHAR NOT NULL COMMENT 'Purchase order identifier.',
    supplier_id                      VARCHAR COMMENT 'Supplier identifier (FK to DIM_SUPPLIER).',
    sku_id                           VARCHAR COMMENT 'Stock-keeping unit identifier (FK to DIM_PRODUCT).',
    dc_id                            VARCHAR COMMENT 'Distribution centre serving the order.',
    order_date                       DATE COMMENT 'PO order date.',
    expected_delivery_date           DATE COMMENT 'Expected PO delivery date.',
    actual_delivery_date             DATE COMMENT 'Actual PO delivery date.',
    order_qty                        NUMBER(18,0) COMMENT 'Ordered quantity.',
    received_qty                     NUMBER(18,0) COMMENT 'Received quantity.',
    unit_cost                        FLOAT COMMENT 'Unit cost.',
    lead_time_days                   NUMBER(18,0) COMMENT 'Realized lead time in days.',
    lead_time_variance_days          NUMBER(18,0) COMMENT 'Lead-time variance vs nominal (days).',
    fill_rate_pct                    FLOAT COMMENT 'Order fill rate percent.',
    otif_flag                        BOOLEAN COMMENT 'On-time-in-full delivery flag.',
    supplier_reliability_score       FLOAT COMMENT 'Supplier reliability score (0-100).',
    transport_mode                   VARCHAR COMMENT 'Transport mode.',
    freight_cost                     FLOAT COMMENT 'Freight cost for the PO.',
    po_status                        VARCHAR COMMENT 'PO status (Received, In Transit).',
    CONSTRAINT PK_FACT_SUPPLY_CHAIN PRIMARY KEY (po_id),
    CONSTRAINT FK_FACT_SUPPLY_CHAIN_PRODUCT FOREIGN KEY (sku_id) REFERENCES DIM_PRODUCT (sku_id),
    CONSTRAINT FK_FACT_SUPPLY_CHAIN_SUPPLIER FOREIGN KEY (supplier_id) REFERENCES DIM_SUPPLIER (supplier_id)
) COMMENT = 'Purchase orders, lead time, fill rate, OTIF.';

-- Prescriptive AI recommendations per scenario.
CREATE OR REPLACE TABLE FACT_RECOMMENDATIONS (
    recommendation_id                VARCHAR NOT NULL COMMENT 'Prescriptive recommendation identifier.',
    scenario_id                      VARCHAR COMMENT 'Scenario overlay tag (NULL for baseline rows).',
    as_of_date                       DATE COMMENT 'As-of date for the recommendation.',
    department                       VARCHAR COMMENT 'Department the record applies to.',
    region                           VARCHAR COMMENT 'Sales region (6 B&M regions + National for eComm).',
    persona_owner                    VARCHAR COMMENT 'Persona / role that owns the action.',
    category_l3                      VARCHAR COMMENT 'Sub-category / segment (level 3).',
    issue_summary                    VARCHAR COMMENT 'Summary of the detected issue.',
    measured_deviation_pct           FLOAT COMMENT 'Measured demand deviation percent.',
    recommended_action               VARCHAR COMMENT 'Recommended prescriptive action.',
    action_type                      VARCHAR COMMENT 'Category of the recommended action.',
    projected_revenue_impact_usd     FLOAT COMMENT 'Projected revenue impact (USD).',
    projected_units_uplift           FLOAT COMMENT 'Projected unit uplift.',
    confidence_score                 FLOAT COMMENT 'Confidence score (0-1).',
    urgency                          VARCHAR COMMENT 'Urgency level.',
    guardrail_status                 VARCHAR COMMENT 'Guardrail compliance status of the action.',
    requires_approval_flag           BOOLEAN COMMENT 'True if human approval is required.',
    status                           VARCHAR COMMENT 'Workflow status of the recommendation.',
    CONSTRAINT PK_FACT_RECOMMENDATIONS PRIMARY KEY (recommendation_id)
) COMMENT = 'Prescriptive AI recommendations per scenario.';


-- =====================================================================
-- STEP 3 — Upload files to the stage
--
-- You MUST run these PUT commands from SnowSQL on your local machine
-- AFTER downloading the Parquet files from this Repl.
-- Run from the folder containing the demand_sensing/output/ directory:
--
--   $ snowsql -a HEXCOCO -u <your_user>
--
--   snowsql> USE WAREHOUSE COCO_HOL_WH;
--   snowsql> USE DATABASE DEMANDSENSING_AI;
--   snowsql> USE SCHEMA DEMANDSENSING_AI.DEMANDSENSING_SCHEMA;
--
--   -- Dimension tables (small — upload individually)
--   snowsql> PUT file://demand_sensing/output/DIM_PRODUCT.parquet          @DEMANDSENSING_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
--   snowsql> PUT file://demand_sensing/output/DIM_STORE.parquet            @DEMANDSENSING_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
--   snowsql> PUT file://demand_sensing/output/DIM_SUPPLIER.parquet         @DEMANDSENSING_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
--   snowsql> PUT file://demand_sensing/output/DIM_EXTERNAL_MACRO.parquet   @DEMANDSENSING_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
--   snowsql> PUT file://demand_sensing/output/DIM_GUARDRAILS.parquet       @DEMANDSENSING_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
--
--   -- Fact satellites (medium)
--   snowsql> PUT file://demand_sensing/output/FACT_FORECAST.parquet        @DEMANDSENSING_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
--   snowsql> PUT file://demand_sensing/output/FACT_PROMOTIONS.parquet      @DEMANDSENSING_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
--   snowsql> PUT file://demand_sensing/output/FACT_SUPPLY_CHAIN.parquet    @DEMANDSENSING_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
--   snowsql> PUT file://demand_sensing/output/FACT_RECOMMENDATIONS.parquet @DEMANDSENSING_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
--
--   -- Master fact (partitioned — upload all 41 part files at stage root)
--   snowsql> PUT file://demand_sensing/output/FACT_DEMAND_DAILY/part-*.parquet @DEMANDSENSING_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
--
-- ALTERNATIVE — Snowflake Web UI (Snowsight) Stage Browser:
--   Navigate to Data > Databases > DEMANDSENSING_AI > DEMANDSENSING_SCHEMA > Stages > DEMANDSENSING_STAGE
--   Click "Upload" and drag-and-drop files.
-- =====================================================================


-- =====================================================================
-- STEP 4 — COPY INTO  (run in Snowflake SQL worksheet AFTER PUT above)
-- =====================================================================

-- Dimensions first (no FK dependencies on facts)
COPY INTO DIM_PRODUCT
    FROM @DEMANDSENSING_STAGE/DIM_PRODUCT.parquet
    FILE_FORMAT = (FORMAT_NAME = FF_PARQUET)
    MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
    ON_ERROR = ABORT_STATEMENT;

COPY INTO DIM_STORE
    FROM @DEMANDSENSING_STAGE/DIM_STORE.parquet
    FILE_FORMAT = (FORMAT_NAME = FF_PARQUET)
    MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
    ON_ERROR = ABORT_STATEMENT;

COPY INTO DIM_SUPPLIER
    FROM @DEMANDSENSING_STAGE/DIM_SUPPLIER.parquet
    FILE_FORMAT = (FORMAT_NAME = FF_PARQUET)
    MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
    ON_ERROR = ABORT_STATEMENT;

COPY INTO DIM_EXTERNAL_MACRO
    FROM @DEMANDSENSING_STAGE/DIM_EXTERNAL_MACRO.parquet
    FILE_FORMAT = (FORMAT_NAME = FF_PARQUET)
    MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
    ON_ERROR = ABORT_STATEMENT;

COPY INTO DIM_GUARDRAILS
    FROM @DEMANDSENSING_STAGE/DIM_GUARDRAILS.parquet
    FILE_FORMAT = (FORMAT_NAME = FF_PARQUET)
    MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
    ON_ERROR = ABORT_STATEMENT;

-- Master fact (partitioned — loads all 41 part-STR files from stage root)
-- CORRECTED: files are at stage root, not in a FACT_DEMAND_DAILY/ subfolder.
COPY INTO FACT_DEMAND_DAILY
    FROM @DEMANDSENSING_STAGE/
    PATTERN = '.*part-STR-.*[.]parquet'
    FILE_FORMAT = (FORMAT_NAME = FF_PARQUET)
    MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
    ON_ERROR = ABORT_STATEMENT;

-- Fact satellites
COPY INTO FACT_FORECAST
    FROM @DEMANDSENSING_STAGE/FACT_FORECAST.parquet
    FILE_FORMAT = (FORMAT_NAME = FF_PARQUET)
    MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
    ON_ERROR = ABORT_STATEMENT;

COPY INTO FACT_PROMOTIONS
    FROM @DEMANDSENSING_STAGE/FACT_PROMOTIONS.parquet
    FILE_FORMAT = (FORMAT_NAME = FF_PARQUET)
    MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
    ON_ERROR = ABORT_STATEMENT;

COPY INTO FACT_SUPPLY_CHAIN
    FROM @DEMANDSENSING_STAGE/FACT_SUPPLY_CHAIN.parquet
    FILE_FORMAT = (FORMAT_NAME = FF_PARQUET)
    MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
    ON_ERROR = ABORT_STATEMENT;

COPY INTO FACT_RECOMMENDATIONS
    FROM @DEMANDSENSING_STAGE/FACT_RECOMMENDATIONS.parquet
    FILE_FORMAT = (FORMAT_NAME = FF_PARQUET)
    MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
    ON_ERROR = ABORT_STATEMENT;


-- =====================================================================
-- STEP 5A — Quick validation row counts (run after COPY INTO)
-- =====================================================================
SELECT 'DIM_PRODUCT'         AS table_name, COUNT(*) AS row_count FROM DIM_PRODUCT         UNION ALL
SELECT 'DIM_STORE',                          COUNT(*)             FROM DIM_STORE             UNION ALL
SELECT 'DIM_SUPPLIER',                       COUNT(*)             FROM DIM_SUPPLIER           UNION ALL
SELECT 'DIM_EXTERNAL_MACRO',                 COUNT(*)             FROM DIM_EXTERNAL_MACRO     UNION ALL
SELECT 'DIM_GUARDRAILS',                     COUNT(*)             FROM DIM_GUARDRAILS         UNION ALL
SELECT 'FACT_DEMAND_DAILY',                  COUNT(*)             FROM FACT_DEMAND_DAILY       UNION ALL
SELECT 'FACT_FORECAST',                      COUNT(*)             FROM FACT_FORECAST           UNION ALL
SELECT 'FACT_PROMOTIONS',                    COUNT(*)             FROM FACT_PROMOTIONS         UNION ALL
SELECT 'FACT_SUPPLY_CHAIN',                  COUNT(*)             FROM FACT_SUPPLY_CHAIN       UNION ALL
SELECT 'FACT_RECOMMENDATIONS',               COUNT(*)             FROM FACT_RECOMMENDATIONS
ORDER BY 1;

-- Expected counts:
--   DIM_PRODUCT            450
--   DIM_STORE               41
--   DIM_SUPPLIER            25
--   DIM_EXTERNAL_MACRO     222
--   DIM_GUARDRAILS           8
--   FACT_DEMAND_DAILY  ~15,800,000
--   FACT_FORECAST         535,500
--   FACT_PROMOTIONS         7,144
--   FACT_SUPPLY_CHAIN     ~18,500
--   FACT_RECOMMENDATIONS        5


-- =====================================================================
-- STEP 5B — Convert epoch-microsecond NUMBER columns to proper DATE columns
--
-- The parquet files store date values as integer epoch MICROSECONDS
-- (microseconds since 1970-01-01). Now that data is loaded, we convert
-- those columns to native DATE type for proper query semantics.
-- =====================================================================

-- 1. DIM_EXTERNAL_MACRO.month_start: NUMBER -> DATE
ALTER TABLE DIM_EXTERNAL_MACRO ADD COLUMN month_start_date DATE
    COMMENT 'First calendar day of the macro month.';
UPDATE DIM_EXTERNAL_MACRO
    SET month_start_date = TO_TIMESTAMP(month_start / 1000000)::DATE;
ALTER TABLE DIM_EXTERNAL_MACRO DROP CONSTRAINT PK_DIM_EXTERNAL_MACRO;
ALTER TABLE DIM_EXTERNAL_MACRO DROP COLUMN month_start;
ALTER TABLE DIM_EXTERNAL_MACRO RENAME COLUMN month_start_date TO month_start;
ALTER TABLE DIM_EXTERNAL_MACRO ADD CONSTRAINT PK_DIM_EXTERNAL_MACRO PRIMARY KEY (region, month_start);

-- 2. FACT_DEMAND_DAILY.transaction_date: NUMBER -> DATE
ALTER TABLE FACT_DEMAND_DAILY ADD COLUMN transaction_date_conv DATE
    COMMENT 'Calendar day of the demand record (grain).';
UPDATE FACT_DEMAND_DAILY
    SET transaction_date_conv = TO_TIMESTAMP(transaction_date / 1000000)::DATE;
ALTER TABLE FACT_DEMAND_DAILY DROP CONSTRAINT PK_FACT_DEMAND_DAILY;
ALTER TABLE FACT_DEMAND_DAILY DROP COLUMN transaction_date;
ALTER TABLE FACT_DEMAND_DAILY RENAME COLUMN transaction_date_conv TO transaction_date;
ALTER TABLE FACT_DEMAND_DAILY ADD CONSTRAINT PK_FACT_DEMAND_DAILY PRIMARY KEY (transaction_date, store_id, sku_id);

-- 3. FACT_FORECAST.week_start_date: NUMBER -> DATE
ALTER TABLE FACT_FORECAST ADD COLUMN week_start_date_conv DATE
    COMMENT 'Sunday week-start date for the fiscal week.';
UPDATE FACT_FORECAST
    SET week_start_date_conv = TO_TIMESTAMP(week_start_date / 1000000)::DATE;
ALTER TABLE FACT_FORECAST DROP COLUMN week_start_date;
ALTER TABLE FACT_FORECAST RENAME COLUMN week_start_date_conv TO week_start_date;

-- =====================================================================
-- STEP 5C — Re-apply clustering after column conversion
-- =====================================================================
ALTER TABLE FACT_DEMAND_DAILY CLUSTER BY (transaction_date, store_id);

-- =====================================================================
-- STEP 6 — Final sanity check: verify DATE conversions look correct
-- =====================================================================
SELECT 'DIM_EXTERNAL_MACRO' AS source, MIN(month_start) AS min_date, MAX(month_start) AS max_date FROM DIM_EXTERNAL_MACRO
UNION ALL
SELECT 'FACT_DEMAND_DAILY', MIN(transaction_date), MAX(transaction_date) FROM FACT_DEMAND_DAILY
UNION ALL
SELECT 'FACT_FORECAST', MIN(week_start_date), MAX(week_start_date) FROM FACT_FORECAST;
