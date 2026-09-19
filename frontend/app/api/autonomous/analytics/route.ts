import { NextRequest, NextResponse } from "next/server";
import { executeStatement, parseRows } from "@/lib/snowflake-api";
import type {
  AnalyticsData,
  PortfolioKPIs,
  AnomalyRow,
  HeatmapCell,
  VarianceBucket,
  DriverRow,
  RecoveryPoint,
} from "@/lib/orchestration-types";

const SCHEMA = "DEMANDSENSING_AI.DEMANDSENSING_SCHEMA";

function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function bool(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "boolean") return v;
  const s = String(v).toUpperCase();
  return s === "TRUE" || s === "1";
}

async function resolvePersonaDepartment(persona: string): Promise<string | null> {
  const sql = `SELECT DEPARTMENT_FILTER FROM ${SCHEMA}.DIM_PERSONA WHERE PERSONA_NAME = '${persona.replace(/'/g, "''")}'`;
  const res = await executeStatement(sql);
  const rows = parseRows(res);
  if (rows.length === 0) return null;
  const filter = rows[0].DEPARTMENT_FILTER as string | null;
  if (!filter || filter === "All" || filter === "ALL") return null;
  return filter;
}

function deptWhere(dept: string | null, alias?: string): string {
  if (!dept) return "";
  const col = alias ? `${alias}.DEPARTMENT` : "DEPARTMENT";
  const departments = dept.split(",").map((d) => `'${d.trim().replace(/'/g, "''")}'`);
  return ` AND ${col} IN (${departments.join(",")})`;
}

async function fetchKPIs(dept: string | null): Promise<PortfolioKPIs> {
  const sql = `SELECT COUNT(DISTINCT RISK_ID) as TOTAL_ANOMALIES,
    COUNT(DISTINCT CASE WHEN RISK_SEVERITY IN ('CRITICAL','HIGH') THEN RISK_ID END) as HIGH_IMPACT,
    COUNT(DISTINCT DEPARTMENT) as DEPARTMENTS_AFFECTED,
    SUM(VALUE_AT_RISK_USD) as REVENUE_AT_STAKE,
    AVG(STOCKOUT_RATE_PCT) as AVG_STOCKOUT_RATE,
    SUM(UNITS_AT_RISK) as TOTAL_UNITS_AT_RISK
  FROM ${SCHEMA}.FACT_DEMAND_RISK WHERE IS_CURRENT_WEEK = TRUE${deptWhere(dept)}`;
  const rows = parseRows(await executeStatement(sql));
  const r = rows[0] || {};
  return {
    total_anomalies: num(r.TOTAL_ANOMALIES),
    high_impact: num(r.HIGH_IMPACT),
    departments_affected: num(r.DEPARTMENTS_AFFECTED),
    revenue_at_stake: num(r.REVENUE_AT_STAKE),
    avg_stockout_rate: num(r.AVG_STOCKOUT_RATE),
    total_units_at_risk: num(r.TOTAL_UNITS_AT_RISK),
  };
}

async function fetchAnomalies(dept: string | null): Promise<AnomalyRow[]> {
  const sql = `SELECT CATEGORY_L3, REGION, RISK_TYPE, RISK_SEVERITY, DEMAND_DEVIATION_PCT,
    VALUE_AT_RISK_USD, UNITS_AT_RISK, DAYS_TO_IMPACT, PRIMARY_DRIVER,
    DETECTION_CONFIDENCE, PERSONA_OWNER, RECOMMENDED_POSTURE
  FROM ${SCHEMA}.FACT_DEMAND_RISK WHERE IS_CURRENT_WEEK = TRUE${deptWhere(dept)}
  ORDER BY VALUE_AT_RISK_USD DESC LIMIT 15`;
  const rows = parseRows(await executeStatement(sql));
  return rows.map((r) => ({
    category: str(r.CATEGORY_L3),
    region: str(r.REGION),
    risk_type: str(r.RISK_TYPE),
    severity: str(r.RISK_SEVERITY),
    deviation_pct: num(r.DEMAND_DEVIATION_PCT),
    value_at_risk: num(r.VALUE_AT_RISK_USD),
    units_at_risk: num(r.UNITS_AT_RISK),
    days_to_impact: num(r.DAYS_TO_IMPACT),
    primary_driver: str(r.PRIMARY_DRIVER),
    confidence: num(r.DETECTION_CONFIDENCE),
    persona_owner: str(r.PERSONA_OWNER),
    recommended_posture: str(r.RECOMMENDED_POSTURE),
  }));
}

async function fetchHeatmap(dept: string | null): Promise<HeatmapCell[]> {
  const sql = `SELECT w.REGION, w.DEPARTMENT AS CATEGORY_L1, p.CATEGORY_L2, w.CATEGORY_L3,
    AVG(w.WTD_DEMAND_DEVIATION_PCT) as DEVIATION_PCT,
    SUM(w.LOST_SALES_UNITS_EST) as LOST_SALES, SUM(w.STOCKOUT_ROWS) as STOCKOUT_COUNT
  FROM ${SCHEMA}.DT_DEMAND_WEEKLY w
  JOIN ${SCHEMA}.DIM_PRODUCT p ON w.CATEGORY_L3 = p.CATEGORY_L3
  WHERE w.FISCAL_WEEK = (SELECT MAX(FISCAL_WEEK) FROM ${SCHEMA}.DT_DEMAND_WEEKLY)
    AND w.SCENARIO_ID IS NULL${deptWhere(dept, "w")}
  GROUP BY w.REGION, w.DEPARTMENT, p.CATEGORY_L2, w.CATEGORY_L3
  ORDER BY w.REGION, w.DEPARTMENT, p.CATEGORY_L2, w.CATEGORY_L3`;
  const rows = parseRows(await executeStatement(sql));
  return rows.map((r) => ({
    region: str(r.REGION),
    category: str(r.CATEGORY_L3),
    category_l1: str(r.CATEGORY_L1),
    category_l2: str(r.CATEGORY_L2),
    deviation_pct: num(r.DEVIATION_PCT),
    lost_sales: num(r.LOST_SALES),
    stockout_count: num(r.STOCKOUT_COUNT),
  }));
}

async function fetchVariance(dept: string | null): Promise<VarianceBucket[]> {
  const sql = `SELECT FLOOR(WTD_DEMAND_DEVIATION_PCT / 5) * 5 as DEVIATION_BUCKET,
    COUNT(*) as SKU_COUNT
  FROM ${SCHEMA}.DT_DEMAND_WEEKLY
  WHERE FISCAL_WEEK = (SELECT MAX(FISCAL_WEEK) FROM ${SCHEMA}.DT_DEMAND_WEEKLY)
    AND SCENARIO_ID IS NULL${deptWhere(dept)}
  GROUP BY DEVIATION_BUCKET ORDER BY DEVIATION_BUCKET`;
  const rows = parseRows(await executeStatement(sql));
  return rows.map((r) => ({
    deviation_bucket: num(r.DEVIATION_BUCKET),
    sku_count: num(r.SKU_COUNT),
  }));
}

async function fetchDrivers(dept: string | null): Promise<DriverRow[]> {
  const sql = `SELECT DEPARTMENT, CATEGORY_L3, DRIVER_NAME, CONTRIBUTION_PP, CONFIDENCE_SCORE,
    IS_SIGNIFICANT, MULTICOLLINEARITY_FLAG, TOTAL_DEVIATION_PP
  FROM ${SCHEMA}.FACT_DRIVER_ATTRIBUTION
  WHERE SCOPE_ID = 'baseline'${deptWhere(dept)}
  ORDER BY DEPARTMENT, ABS(CONTRIBUTION_PP) DESC`;
  const rows = parseRows(await executeStatement(sql));
  return rows.map((r) => ({
    department: str(r.DEPARTMENT),
    category: str(r.CATEGORY_L3),
    driver_name: str(r.DRIVER_NAME),
    contribution_pp: num(r.CONTRIBUTION_PP),
    confidence_score: num(r.CONFIDENCE_SCORE),
    is_significant: bool(r.IS_SIGNIFICANT),
    multicollinearity_flag: bool(r.MULTICOLLINEARITY_FLAG),
    total_deviation_pp: num(r.TOTAL_DEVIATION_PP),
  }));
}

async function fetchRecovery(dept: string | null): Promise<RecoveryPoint[]> {
  const deptFilter = dept
    ? ` AND r.DEPARTMENT IN (${dept.split(",").map((d) => `'${d.trim().replace(/'/g, "''")}'`).join(",")})`
    : "";
  const sql = `SELECT r.DEPARTMENT, r.CATEGORY_L3, r.RISK_TYPE, r.RISK_SEVERITY, r.PERSONA_OWNER,
    c.DAYS_FROM_NOW, c.RECOVERABLE_VALUE_USD, c.DAILY_EROSION_USD,
    c.INTERVENTION_COST_USD, c.BENEFIT_COST_RATIO, c.WINDOW_STATUS,
    c.TOTAL_VALUE_AT_RISK_USD
  FROM ${SCHEMA}.FACT_RISK_RECOVERY_CURVE c
  JOIN ${SCHEMA}.FACT_DEMAND_RISK r ON c.RISK_ID = r.RISK_ID
  WHERE r.IS_CURRENT_WEEK = TRUE AND c.DAYS_FROM_NOW <= 14
    AND r.RISK_SEVERITY IN ('CRITICAL','HIGH')${deptFilter}
  ORDER BY c.TOTAL_VALUE_AT_RISK_USD DESC, c.DAYS_FROM_NOW
  LIMIT 100`;
  const rows = parseRows(await executeStatement(sql));
  return rows.map((r) => ({
    department: str(r.DEPARTMENT),
    category: str(r.CATEGORY_L3),
    risk_type: str(r.RISK_TYPE),
    severity: str(r.RISK_SEVERITY),
    persona_owner: str(r.PERSONA_OWNER),
    days_from_now: num(r.DAYS_FROM_NOW),
    recoverable_value: num(r.RECOVERABLE_VALUE_USD),
    daily_erosion: num(r.DAILY_EROSION_USD),
    intervention_cost: num(r.INTERVENTION_COST_USD),
    benefit_cost_ratio: num(r.BENEFIT_COST_RATIO),
    window_status: str(r.WINDOW_STATUS),
    total_value_at_risk: num(r.TOTAL_VALUE_AT_RISK_USD),
  }));
}

export async function GET(req: NextRequest) {
  try {
    const persona = req.nextUrl.searchParams.get("persona") ?? "";
    const dept = persona ? await resolvePersonaDepartment(persona) : null;

    const [kpis, anomalies, heatmap, variance, drivers, recovery] =
      await Promise.all([
        fetchKPIs(dept),
        fetchAnomalies(dept),
        fetchHeatmap(dept),
        fetchVariance(dept),
        fetchDrivers(dept),
        fetchRecovery(dept),
      ]);

    const data: AnalyticsData = { kpis, anomalies, heatmap, variance, drivers, recovery };
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch analytics";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
