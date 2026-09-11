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
  edges: string[];
  is_control?: boolean;
}
