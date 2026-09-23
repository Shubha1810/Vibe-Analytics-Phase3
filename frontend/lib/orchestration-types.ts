// Types derived from the real orchestration payload (run-899c53188864)

export type OrchestrationStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
export type NodeStatus = "RUNNING" | "ok" | "error" | "timeout" | "degraded";

export interface OrchestrationEvent {
  NODE_NAME: string;
  AGENT_NAME: string | null;
  WAVE_NO: number | null;
  ATTEMPT_NO: number | null;
  STATUS: NodeStatus;
  DURATION_MS: number | null;
  ERROR_MSG: string | null;
  DETAIL: string | null;
  EVENT_AT: string | null;
}

export interface KeyMetric {
  metric?: string;
  value?: number | string | null;
  delta?: number | string | null;
  unit?: string | null;
}

export interface Anomaly {
  anomaly?: string;
  severity?: string | null;
  regions?: string[];
  deviation_pct?: number | null;
}

export interface Driver {
  driver?: string;
  contribution_pct?: number | null;
  confidence?: number | null;
}

export interface RecommendedAction {
  action?: string;
  impact_usd?: number | null;
  cost_usd?: number | null;
  confidence?: number | null;
  approval_required?: boolean | null;
  authority?: string | null;
}

export interface Trajectory {
  peak_day?: string | null;
  decay_to_baseline_day?: string | null;
  peak_deviation_pct?: number | null;
  day7_deviation_pct?: number | null;
}

export interface ReportSection {
  persona?: string;
  department?: string;
  headline?: string;
  key_metrics?: KeyMetric[];
  anomalies?: Anomaly[];
  drivers?: Driver[];
  risks?: string[];
  recommended_actions?: RecommendedAction[];
  trajectory?: Trajectory | null;
  caveats?: string[];
}

export interface EnterpriseSummary {
  anomalies_total?: number | null;
  anomalies_high_impact?: number | null;
  departments_affected?: number | null;
  net_revenue_at_stake_usd?: number | null;
  protected_recovered_usd?: number | null;
  total_action_cost_usd?: number | null;
  decisions_within_authority?: number | null;
  decisions_pending_approval?: number | null;
  cross_department_contentions?: unknown[];
}

export interface ValidationSummary {
  verdict?: string | null;
  caveats?: string[];
}

export interface ExecReport {
  as_of?: string | null;
  enterprise_summary?: EnterpriseSummary | null;
  sections?: ReportSection[];
  pending_approvals?: unknown[];
  validation_summary?: ValidationSummary | null;
}

export interface OrchestrationResult {
  run_id?: string | null;
  module?: string | null;
  status?: OrchestrationStatus | null;
  question?: string | null;
  personas?: string | null;
  requested_by?: string | null;
  submitted_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
  result?: { narrative?: string; [key: string]: unknown } | null;
  exec_report?: ExecReport | null;
  error_message?: string | null;
}

export interface AgentNetworkNode {
  node_name: string;
  agent_name: string | null;
  wave_no: number;
  kind: "agent" | "control";
}

export interface OrchestrationEdge {
  source: string;
  target: string;
  conditional: boolean;
}

export interface OrchestrationGraph {
  module: string;
  topology: string;
  terminal_node: string;
  allow_retry: boolean;
  nodes: AgentNetworkNode[];
  edges: OrchestrationEdge[];
}

// ── Autonomous Analytics Types ──────────────────────────────────────────────

export interface PortfolioKPIs {
  total_anomalies: number;
  high_impact: number;
  departments_affected: number;
  revenue_at_stake: number;
  avg_stockout_rate: number;
  total_units_at_risk: number;
}

export interface AnomalyRow {
  category: string;
  category_l2: string;
  department: string;
  region: string;
  risk_type: string;
  severity: string;
  deviation_pct: number;
  value_at_risk: number;
  units_at_risk: number;
  days_to_impact: number;
  primary_driver: string;
  confidence: number;
  persona_owner: string;
  recommended_posture: string;
}

export interface HeatmapCell {
  region: string;
  category: string;
  category_l1: string;
  category_l2: string;
  deviation_pct: number;
  lost_sales: number;
  stockout_count: number;
}

export interface VarianceBucket {
  deviation_bucket: number;
  sku_count: number;
}

export interface DriverRow {
  department: string;
  category: string;
  category_l2: string;
  driver_name: string;
  contribution_pp: number;
  confidence_score: number;
  is_significant: boolean;
  multicollinearity_flag: boolean;
  total_deviation_pp: number;
}

export interface RecoveryPoint {
  department: string;
  category: string;
  category_l2: string;
  region: string;
  risk_type: string;
  severity: string;
  persona_owner: string;
  days_from_now: number;
  recoverable_value: number;
  daily_erosion: number;
  intervention_cost: number;
  benefit_cost_ratio: number;
  window_status: string;
  total_value_at_risk: number;
}

export interface StockoutRow {
  risk_id: string;
  category_l2: string;
  category: string;
  region: string;
  stockout_rate: number;
  severity: string;
  units_at_risk: number;
  value_at_risk: number;
  days_to_impact: number;
  primary_driver: string;
  confidence: number;
}

export interface RecommendationCard {
  category_l2: string;
  region: string;
  severity: string;
  primary_driver: string;
  posture: string;
  impact_usd: number;
  cost_usd: number;
  benefit_cost_ratio: number;
  recoverable_usd: number;
  confidence: number;
  days_to_impact: number;
  risk_count: number;
}

export interface AnalyticsData {
  kpis: PortfolioKPIs;
  anomalies: AnomalyRow[];
  heatmap: HeatmapCell[];
  variance: VarianceBucket[];
  drivers: DriverRow[];
  recovery: RecoveryPoint[];
  stockout: StockoutRow[];
  recommendations: RecommendationCard[];
  timeContext: { currentWeek: string; earliestWeek: string; totalWeeks: number };
}

// ── Multi-Run (All-Persona) Types ───────────────────────────────────────────

export type PersonaKey = "demand_planner" | "supply_planner" | "director";

export const PERSONA_KEY_TO_TITLE: Record<PersonaKey, string> = {
  demand_planner: "Demand Planner",
  supply_planner: "Supply Planner",
  director: "Director of Demand Planning",
};

export const PERSONA_TITLE_TO_KEY: Record<string, PersonaKey> = {
  "Demand Planner": "demand_planner",
  "Supply Planner": "supply_planner",
  "Director of Demand Planning": "director",
};

export type MultiRunIds = Record<PersonaKey, string | null>;

export type MultiRunResults = Record<PersonaKey, OrchestrationResult | null>;
