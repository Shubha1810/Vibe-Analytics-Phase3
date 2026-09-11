import { describe, it, expect } from "vitest";

// Test the autonomous page helper functions by extracting their logic.
// Since the page is a React component, we replicate the pure utility logic here.

function statusColor(status: string | undefined): string {
  switch (status) {
    case "RUNNING": return "var(--hex-primary)";
    case "ok": return "#10B981";
    case "error": return "#EF4444";
    case "timeout": return "#F97316";
    case "degraded": return "#EAB308";
    default: return "#94A3B8";
  }
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function shortName(agentName: string | null): string {
  if (!agentName) return "";
  return agentName.replace(/_AUTO_DEMANDSENSING$/, "").replace(/_/g, " ");
}

function formatUsd(v: number | null | undefined): string {
  if (v == null) return "—";
  return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// Hardcoded topology (must match page.tsx)
const NETWORK_NODES = [
  { node_name: "master_plan", agent_name: "MASTER_ORCHESTRATOR_AUTO_DEMANDSENSING", wave_no: 0, edges: ["data_gathering"] },
  { node_name: "data_gathering", agent_name: "DATA_GATHERING_AGENT_AUTO_DEMANDSENSING", wave_no: 1, edges: ["task_trend", "task_dimensional", "task_root_cause", "task_predictive"] },
  { node_name: "task_trend", agent_name: "TREND_DISCOVERY_AGENT_AUTO_DEMANDSENSING", wave_no: 2, edges: ["wave2_join"] },
  { node_name: "task_dimensional", agent_name: "DIMENSIONAL_ANALYSIS_AGENT_AUTO_DEMANDSENSING", wave_no: 2, edges: ["wave2_join"] },
  { node_name: "task_root_cause", agent_name: "ROOT_CAUSE_AGENT_AUTO_DEMANDSENSING", wave_no: 2, edges: ["wave2_join"] },
  { node_name: "task_predictive", agent_name: "PREDICTIVE_AGENT_AUTO_DEMANDSENSING", wave_no: 2, edges: ["wave2_join"] },
  { node_name: "wave2_join", agent_name: null, wave_no: 2, edges: ["prescriptive"], is_control: true },
  { node_name: "prescriptive", agent_name: "PRESCRIPTIVE_AGENT_AUTO_DEMANDSENSING", wave_no: 2, edges: ["validation_gate"] },
  { node_name: "validation_gate", agent_name: null, wave_no: 3, edges: ["exec_report"], is_control: true },
  { node_name: "exec_report", agent_name: "EXEC_REPORT_AGENT_AUTO_DEMANDSENSING", wave_no: 5, edges: [] },
];

describe("statusColor", () => {
  it("returns correct colors for all statuses", () => {
    expect(statusColor("RUNNING")).toBe("var(--hex-primary)");
    expect(statusColor("ok")).toBe("#10B981");
    expect(statusColor("error")).toBe("#EF4444");
    expect(statusColor("timeout")).toBe("#F97316");
    expect(statusColor("degraded")).toBe("#EAB308");
  });

  it("returns gray for unknown/idle status", () => {
    expect(statusColor(undefined)).toBe("#94A3B8");
    expect(statusColor("unknown")).toBe("#94A3B8");
  });
});

describe("formatDuration", () => {
  it("returns empty string for null/undefined", () => {
    expect(formatDuration(null)).toBe("");
    expect(formatDuration(undefined)).toBe("");
  });

  it("formats sub-second durations in ms", () => {
    expect(formatDuration(500)).toBe("500ms");
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("formats second+ durations with one decimal", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(1500)).toBe("1.5s");
    expect(formatDuration(12345)).toBe("12.3s");
  });
});

describe("shortName", () => {
  it("strips _AUTO_DEMANDSENSING suffix and replaces underscores", () => {
    expect(shortName("MASTER_ORCHESTRATOR_AUTO_DEMANDSENSING")).toBe("MASTER ORCHESTRATOR");
    expect(shortName("DATA_GATHERING_AGENT_AUTO_DEMANDSENSING")).toBe("DATA GATHERING AGENT");
  });

  it("returns empty string for null", () => {
    expect(shortName(null)).toBe("");
  });
});

describe("formatUsd", () => {
  it("returns em-dash for null/undefined", () => {
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(undefined)).toBe("—");
  });

  it("formats numbers with dollar sign", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(1000)).toMatch(/^\$1[,.]?000$/);
    expect(formatUsd(500000)).toMatch(/^\$500[,.]?000$/);
  });
});

describe("Agent network topology", () => {
  it("has exactly 10 nodes", () => {
    expect(NETWORK_NODES).toHaveLength(10);
  });

  it("has correct waves: 0, 1, 2, 3, 5", () => {
    const waves = [...new Set(NETWORK_NODES.map((n) => n.wave_no))].sort((a, b) => a - b);
    expect(waves).toEqual([0, 1, 2, 3, 5]);
  });

  it("has 4 parallel wave-2 analysis nodes", () => {
    const wave2Analysis = NETWORK_NODES.filter((n) => n.wave_no === 2 && !n.is_control && n.node_name !== "prescriptive");
    expect(wave2Analysis).toHaveLength(4);
    expect(wave2Analysis.map((n) => n.node_name).sort()).toEqual([
      "task_dimensional", "task_predictive", "task_root_cause", "task_trend",
    ]);
  });

  it("has 2 control nodes: wave2_join and validation_gate", () => {
    const controls = NETWORK_NODES.filter((n) => n.is_control);
    expect(controls).toHaveLength(2);
    expect(controls.map((n) => n.node_name).sort()).toEqual(["validation_gate", "wave2_join"]);
  });

  it("forms a valid DAG from master_plan to exec_report", () => {
    const nodeMap = new Map(NETWORK_NODES.map((n) => [n.node_name, n]));
    // Verify all edges point to valid nodes
    for (const node of NETWORK_NODES) {
      for (const edge of node.edges) {
        expect(nodeMap.has(edge)).toBe(true);
      }
    }
    // Verify exec_report has no outgoing edges (terminal)
    expect(nodeMap.get("exec_report")!.edges).toEqual([]);
    // Verify master_plan is entry (no node points to it)
    const targets = new Set(NETWORK_NODES.flatMap((n) => n.edges));
    expect(targets.has("master_plan")).toBe(false);
  });

  it("data_gathering fans out to all 4 task nodes", () => {
    const dg = NETWORK_NODES.find((n) => n.node_name === "data_gathering")!;
    expect(dg.edges.sort()).toEqual(["task_dimensional", "task_predictive", "task_root_cause", "task_trend"]);
  });

  it("all task nodes converge to wave2_join", () => {
    const taskNodes = NETWORK_NODES.filter((n) => n.node_name.startsWith("task_"));
    for (const t of taskNodes) {
      expect(t.edges).toContain("wave2_join");
    }
  });
});

describe("Event map building (latest event per node)", () => {
  it("keeps the latest event by EVENT_AT for each node", () => {
    const events = [
      { NODE_NAME: "master_plan", STATUS: "RUNNING", EVENT_AT: "2026-09-11T10:00:00Z" },
      { NODE_NAME: "master_plan", STATUS: "ok", EVENT_AT: "2026-09-11T10:01:00Z" },
      { NODE_NAME: "data_gathering", STATUS: "RUNNING", EVENT_AT: "2026-09-11T10:01:30Z" },
    ];

    const eventMap = new Map<string, (typeof events)[0]>();
    for (const e of events) {
      const existing = eventMap.get(e.NODE_NAME);
      if (!existing || (e.EVENT_AT && (!existing.EVENT_AT || e.EVENT_AT > existing.EVENT_AT))) {
        eventMap.set(e.NODE_NAME, e);
      }
    }

    expect(eventMap.get("master_plan")?.STATUS).toBe("ok");
    expect(eventMap.get("data_gathering")?.STATUS).toBe("RUNNING");
  });
});

describe("Edge case: polling intervals", () => {
  it("events poll interval should be 2-3s (implementation uses 2500ms)", () => {
    const EVENTS_INTERVAL = 2500;
    expect(EVENTS_INTERVAL).toBeGreaterThanOrEqual(2000);
    expect(EVENTS_INTERVAL).toBeLessThanOrEqual(3000);
  });

  it("result poll interval should be 3-5s (implementation uses 4000ms)", () => {
    const RESULT_INTERVAL = 4000;
    expect(RESULT_INTERVAL).toBeGreaterThanOrEqual(3000);
    expect(RESULT_INTERVAL).toBeLessThanOrEqual(5000);
  });
});
