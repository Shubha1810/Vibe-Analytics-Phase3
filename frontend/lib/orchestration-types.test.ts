import { describe, it, expect } from "vitest";
import type {
  OrchestrationEvent,
  OrchestrationResult,
  ExecReport,
  ReportSection,
  EnterpriseSummary,
  AgentNetworkNode,
  ValidationSummary,
  KeyMetric,
  Anomaly,
  Driver,
  RecommendedAction,
  Trajectory,
} from "@/lib/orchestration-types";

describe("OrchestrationEvent type", () => {
  it("accepts a valid event with all fields", () => {
    const event: OrchestrationEvent = {
      NODE_NAME: "master_plan",
      AGENT_NAME: "MASTER_ORCHESTRATOR_AUTO_DEMANDSENSING",
      WAVE_NO: 0,
      ATTEMPT_NO: 1,
      STATUS: "ok",
      DURATION_MS: 12345,
      ERROR_MSG: null,
      DETAIL: "completed successfully",
      EVENT_AT: "2026-09-11T10:00:00Z",
    };
    expect(event.NODE_NAME).toBe("master_plan");
    expect(event.STATUS).toBe("ok");
  });

  it("accepts all valid STATUS values", () => {
    const statuses: OrchestrationEvent["STATUS"][] = ["RUNNING", "ok", "error", "timeout", "degraded"];
    for (const s of statuses) {
      const e: OrchestrationEvent = {
        NODE_NAME: "test",
        AGENT_NAME: null,
        WAVE_NO: null,
        ATTEMPT_NO: null,
        STATUS: s,
        DURATION_MS: null,
        ERROR_MSG: null,
        DETAIL: null,
        EVENT_AT: null,
      };
      expect(e.STATUS).toBe(s);
    }
  });
});

describe("OrchestrationResult type", () => {
  it("accepts a minimal completed result", () => {
    const result: OrchestrationResult = {
      run_id: "run-abc123",
      status: "COMPLETED",
      exec_report: null,
      result: null,
    };
    expect(result.status).toBe("COMPLETED");
    expect(result.exec_report).toBeNull();
  });

  it("accepts a result with narrative fallback (no exec_report)", () => {
    const result: OrchestrationResult = {
      run_id: "run-abc123",
      status: "COMPLETED",
      exec_report: null,
      result: { narrative: "Summary text here" },
    };
    expect(result.result?.narrative).toBe("Summary text here");
  });

  it("accepts a FAILED result with error message", () => {
    const result: OrchestrationResult = {
      run_id: "run-fail",
      status: "FAILED",
      error_message: "Timeout on data_gathering node",
    };
    expect(result.status).toBe("FAILED");
    expect(result.error_message).toBe("Timeout on data_gathering node");
  });
});

describe("ExecReport type", () => {
  it("accepts a full exec report shape", () => {
    const report: ExecReport = {
      as_of: "2026-09-11T10:00:00Z",
      enterprise_summary: {
        anomalies_total: 5,
        anomalies_high_impact: 2,
        departments_affected: 3,
        net_revenue_at_stake_usd: 500000,
        protected_recovered_usd: 200000,
        total_action_cost_usd: 50000,
        decisions_within_authority: 4,
        decisions_pending_approval: 1,
        cross_department_contentions: [],
      },
      sections: [
        {
          persona: "Director of Demand Planning",
          department: "Demand Planning",
          headline: "DATA GAP: Insufficient regional data",
          key_metrics: [{ metric: "Revenue Impact", value: 100000, delta: -5, unit: "USD" }],
          anomalies: [{ anomaly: "Spike in returns", severity: "high", regions: ["US-West"], deviation_pct: 15 }],
          drivers: [{ driver: "Seasonal shift", contribution_pct: 40, confidence: 0.85 }],
          risks: ["Supply chain disruption"],
          recommended_actions: [{
            action: "Increase safety stock",
            impact_usd: 50000,
            cost_usd: 10000,
            confidence: 0.9,
            approval_required: true,
            authority: "VP Supply Chain",
          }],
          trajectory: { peak_day: "2026-09-15", decay_to_baseline_day: "2026-10-01", peak_deviation_pct: 20, day7_deviation_pct: 5 },
          caveats: ["Data limited to 30-day window"],
        },
      ],
      pending_approvals: [],
      validation_summary: { verdict: "CLEARED", caveats: ["No major issues found"] },
    };

    expect(report.sections).toHaveLength(1);
    expect(report.sections![0].headline).toContain("DATA GAP");
    expect(report.enterprise_summary?.anomalies_total).toBe(5);
    expect(report.validation_summary?.verdict).toBe("CLEARED");
  });

  it("accepts a report with all optional fields undefined", () => {
    const report: ExecReport = {};
    expect(report.sections).toBeUndefined();
    expect(report.enterprise_summary).toBeUndefined();
  });
});

describe("AgentNetworkNode type", () => {
  it("represents the hardcoded topology correctly", () => {
    const node: AgentNetworkNode = {
      node_name: "validation_gate",
      agent_name: null,
      wave_no: 3,
      edges: ["exec_report"],
      is_control: true,
    };
    expect(node.is_control).toBe(true);
    expect(node.agent_name).toBeNull();
  });
});

describe("Edge case: DATA GAP headline", () => {
  it("can be detected by checking headline prefix", () => {
    const section: ReportSection = {
      persona: "Director of Demand Planning",
      headline: "DATA GAP: No data for APAC region",
    };
    const isDataGap = section.headline?.startsWith("DATA GAP:");
    expect(isDataGap).toBe(true);
  });
});
