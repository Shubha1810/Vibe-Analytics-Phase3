"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type {
  OrchestrationEvent,
  OrchestrationResult,
  OrchestrationGraph,
  AgentNetworkNode as GraphNode,
  OrchestrationEdge,
  ExecReport,
  ReportSection,
  RecommendedAction,
  KeyMetric,
  Anomaly,
  Driver,
  AnalyticsData,
  PersonaKey,
  MultiRunIds,
  MultiRunResults,
} from "@/lib/orchestration-types";
import { PERSONA_KEY_TO_TITLE, PERSONA_TITLE_TO_KEY } from "@/lib/orchestration-types";
import type { Persona } from "@/lib/constants";

import { StepHeader } from "@/components/autonomous/StepHeader";
import { AnomalyTable } from "@/components/autonomous/AnomalyTable";
import { DeviationHeatmap } from "@/components/autonomous/DeviationHeatmap";
import { VarianceHistogram } from "@/components/autonomous/VarianceHistogram";
import { DriverAttribution } from "@/components/autonomous/DriverAttribution";
import { RecoveryTimeline } from "@/components/autonomous/RecoveryTimeline";
import { BrightwayIntro } from "@/components/autonomous/BrightwayIntro";
import { PersonaBlurb } from "@/components/autonomous/PersonaBlurb";
import { PersonaHandoff } from "@/components/autonomous/PersonaHandoff";
import { CrossDeptSignalStrip } from "@/components/autonomous/CrossDeptSignalStrip";
import { StockoutRiskTable } from "@/components/autonomous/StockoutRiskTable";
import { RecommendationCards } from "@/components/autonomous/RecommendationCards";
import { ExecutiveBriefingPack } from "@/components/autonomous/ExecutiveBriefingPack";
import { ClosingTheLoop } from "@/components/autonomous/ClosingTheLoop";
import { ChartExplainer } from "@/components/autonomous/ChartExplainer";
import { HowToReadIt } from "@/components/autonomous/HowToReadIt";

// ── Constants ────────────────────────────────────────────────────────────────

const PERSONA_KEYS: PersonaKey[] = ["demand_planner", "supply_planner", "director"];

const PERSONA_TAB_LABELS: Record<PersonaKey, { label: string; steps: string }> = {
  demand_planner: { label: "Demand Planner", steps: "Steps 1–2" },
  supply_planner: { label: "Supply Planner", steps: "Steps 3–4" },
  director: { label: "Director", steps: "Step 5" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatUsd(v: number | null | undefined): string {
  if (v == null) return "—";
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

interface PerVizNarratives {
  anomaly_table: string;
  heatmap: string;
  variance: string;
  cross_dept: string;
  drivers: string;
  recovery: string;
  stockout: string;
  act: string;
  executive: string;
}

function buildPerVizNarratives(sections: ReportSection[], narrative?: string): PerVizNarratives {
  const result: PerVizNarratives = { anomaly_table: "", heatmap: "", variance: "", cross_dept: "", drivers: "", recovery: "", stockout: "", act: "", executive: "" };
  if (!sections.length && !narrative) return result;

  const allAnomalies = sections.flatMap((s) => s.anomalies || []);
  const allDrivers = sections.flatMap((s) => s.drivers || []);
  const allMetrics = sections.flatMap((s) => s.key_metrics || []);
  const allActions = sections.flatMap((s) => s.recommended_actions || []);
  const headlines = sections.map((s) => s.headline).filter(Boolean);
  const depts = [...new Set(sections.map((s) => s.department).filter(Boolean))];

  const topAnom = [...allAnomalies]
    .sort((a, b) => Math.abs(b.deviation_pct ?? 0) - Math.abs(a.deviation_pct ?? 0))
    .slice(0, 5);

  // ── Anomaly Table ──
  const anomParts: string[] = [];
  if (topAnom.length) {
    anomParts.push(`**${allAnomalies.length}** anomalies detected across the portfolio, ranked by revenue impact.`);
    const critical = allAnomalies.filter((a) => (a.severity ?? "").toLowerCase() === "critical");
    if (critical.length) anomParts.push(`**${critical.length}** CRITICAL-severity items require immediate attention.`);
    topAnom.forEach((a) => {
      const parts: string[] = [];
      if (a.anomaly) parts.push(`**${a.anomaly}**`);
      if (a.severity) parts.push(`${a.severity}`);
      if (a.deviation_pct != null) parts.push(`**${((a.deviation_pct ?? 0) * 100).toFixed(1)}%** deviation`);
      if ((a as any).value_at_risk_usd != null) parts.push(`**$${Number((a as any).value_at_risk_usd).toLocaleString()}** at risk`);
      if (parts.length) anomParts.push(parts.join(" — ") + ".");
    });
  }
  const anomImpl = ["Anomalies ranked by severity and revenue impact indicate where the portfolio is most stressed. CRITICAL items represent the highest financial exposure and shortest action windows."];
  if (topAnom.length) anomImpl.push(`The top **${topAnom.length}** anomalies account for the largest share of portfolio risk — addressing these first maximizes recovery potential.`);
  const anomAct = ["Prioritize CRITICAL items for same-day response — review replenishment needs and supplier capacity.", "Delegate HIGH-severity items for action within 2-3 business days.", "Monitor MEDIUM items through the next weekly review cycle."];
  result.anomaly_table = anomParts.join(" ") + ` |IMPLICATIONS| ${anomImpl.join(" ")} |ACTIONS| ${anomAct.join(" ")}`;

  // ── Heatmap (fallback — DeviationHeatmap computes its own dynamic insight) ──
  const heatParts: string[] = [];
  if (depts.length) heatParts.push(`Demand deviations span **${depts.length}** department(s): ${depts.join(", ")}.`);
  const regions = [...new Set(topAnom.flatMap((a) => a.regions || []).filter(Boolean))];
  if (regions.length) heatParts.push(`Hotspots concentrated in **${regions.join(", ")}**.`);
  const overCount = allAnomalies.filter((a) => (a.deviation_pct ?? 0) > 0).length;
  const underCount = allAnomalies.filter((a) => (a.deviation_pct ?? 0) < 0).length;
  if (overCount || underCount) heatParts.push(`**${overCount}** over-forecast (opportunity/stockout risk) and **${underCount}** under-forecast (markdown risk) items.`);
  result.heatmap = heatParts.join(" ") + ` |IMPLICATIONS| Geographic concentration of deviations suggests regional factors (weather, competitor activity) rather than portfolio-wide issues. |ACTIONS| Select departments above to drill into sub-category detail and identify the specific product lines driving each hotspot.`;

  // ── Variance ──
  const varParts: string[] = [];
  const extreme = allAnomalies.filter((a) => Math.abs(a.deviation_pct ?? 0) > 0.2);
  varParts.push(`Portfolio health: **${allAnomalies.length - extreme.length}** SKUs within normal ±10% variance band.`);
  if (extreme.length) varParts.push(`**${extreme.length}** SKUs show extreme deviation (>20%), signaling structural demand shifts rather than noise.`);
  const mapeMetric = allMetrics.find((m) => (m.metric ?? "").toLowerCase().includes("mape"));
  if (mapeMetric) varParts.push(`Forecast accuracy (MAPE): **${mapeMetric.value}**.`);
  const varImpl = ["A high proportion of extreme deviations (>20%) indicates the baseline forecast may need recalibration — this is a systemic issue, not just individual anomalies."];
  if (extreme.length > allAnomalies.length * 0.3) varImpl.push(`Over **${Math.round(extreme.length / Math.max(allAnomalies.length, 1) * 100)}%** of the portfolio shows extreme deviation — consider an emergency forecast review.`);
  const varAct = ["Flag departments with MAPE >20% for model recalibration with the demand science team.", "Use the distribution shape to determine if issues are broad (flat distribution) or concentrated (long tail)."];
  result.variance = varParts.join(" ") + ` |IMPLICATIONS| ${varImpl.join(" ")} |ACTIONS| ${varAct.join(" ")}`;

  // ── Cross-Dept ──
  const crossParts: string[] = [];
  if (depts.length > 1) {
    crossParts.push(`Cross-department signal convergence detected across **${depts.join("** and **")}**.`);
  }
  if (headlines.length) crossParts.push(headlines.join(". ") + ".");
  const crossImpl = depts.length > 1
    ? ["When multiple departments show simultaneous anomalies, they often share a common external driver (weather, macro events). Cross-department awareness prevents siloed responses and identifies resource contention early."]
    : ["Single-department focus — no cross-department signal interference detected this cycle."];
  const crossAct = ["Check if departments are competing for the same logistics or supplier capacity before approving interventions.", "Coordinate with peer planners to align on shared-resource priorities before escalating to leadership."];
  result.cross_dept = crossParts.join(" ") + ` |IMPLICATIONS| ${crossImpl.join(" ")} |ACTIONS| ${crossAct.join(" ")}`;

  // ── Drivers (fallback — DriverAttribution computes its own dynamic insight) ──
  const drvParts: string[] = [];
  if (allDrivers.length) {
    drvParts.push(`Root cause decomposition across **${allDrivers.length}** driver-anomaly combinations.`);
    const byName: Record<string, number[]> = {};
    allDrivers.forEach((d) => {
      const name = d.driver ?? "Unknown";
      if (!byName[name]) byName[name] = [];
      if (d.contribution_pct != null) byName[name].push(d.contribution_pct);
    });
    Object.entries(byName)
      .sort((a, b) => Math.abs(b[1].reduce((s, v) => s + v, 0) / b[1].length) - Math.abs(a[1].reduce((s, v) => s + v, 0) / a[1].length))
      .forEach(([name, vals]) => {
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
        drvParts.push(`**${name}**: average contribution **${avg > 0 ? "+" : ""}${avg.toFixed(2)}pp** across ${vals.length} observations.`);
      });
  }
  result.drivers = drvParts.join(" ") + ` |IMPLICATIONS| Understanding root cause drivers determines the correct response — weather-driven spikes need short-term replenishment, promo-driven lifts may be pulled-forward demand. |ACTIONS| Match your intervention to the dominant driver. Use the department filter to isolate department-specific patterns.`;

  // ── Recovery ──
  const recParts: string[] = [];
  const trajectories = sections.filter((s) => s.trajectory);
  if (trajectories.length) {
    trajectories.forEach((s) => {
      const t = s.trajectory!;
      if (t.peak_deviation_pct != null) recParts.push(`Peak deviation projected at **${(t.peak_deviation_pct * 100).toFixed(1)}%**.`);
      if (t.decay_to_baseline_day) recParts.push(`Expected decay to baseline by **${t.decay_to_baseline_day}**.`);
    });
  }
  if (allActions.length) {
    const totalProtected = allActions.reduce((s, a) => s + (a.impact_usd ?? 0), 0);
    const totalCost = allActions.reduce((s, a) => s + (a.cost_usd ?? 0), 0);
    if (totalProtected) recParts.push(`**$${totalProtected.toLocaleString()}** recoverable with timely intervention.`);
    if (totalCost) recParts.push(`Total intervention cost: **$${totalCost.toLocaleString()}**.`);
  }
  recParts.push("Every day of delay erodes the recoverable value — perishable categories face the shortest action windows.");
  result.recovery = recParts.join(" ") + ` |IMPLICATIONS| The recovery trajectory shows a decaying opportunity — the value you can capture shrinks daily. For perishable categories, the window may be as short as 3-5 days before the opportunity is fully forfeit. |ACTIONS| Act on perishable items today — these have the steepest erosion curves. For durable goods, you have more time but should stage orders within 48 hours. Hand off to Supply Planning for sized replenishment actions.`;

  // ── Stockout ──
  const stockParts: string[] = [];
  const highRisk = allAnomalies.filter((a) => (a.severity ?? "").toLowerCase() === "critical" || (a.severity ?? "").toLowerCase() === "high");
  stockParts.push(`**${highRisk.length}** high-risk items flagged for potential stockout or availability miss.`);
  if (allActions.length) {
    const escalated = allActions.filter((a) => a.approval_required);
    stockParts.push(`**${allActions.length}** recommended actions staged — **${escalated.length}** require escalation above planner authority.`);
  }
  const biasMetric = allMetrics.find((m) => (m.metric ?? "").toLowerCase().includes("bias"));
  if (biasMetric) stockParts.push(`Forecast bias: **${biasMetric.value}** — systematic under-forecasting compounds stockout risk.`);
  result.stockout = stockParts.join(" ") + ` |IMPLICATIONS| Stockout risk directly translates to lost revenue, customer churn, and degraded brand trust. Items approaching days-of-supply thresholds should be treated as time-critical. |ACTIONS| Approve replenishment orders for items within 2 days of stockout. Escalate cross-department capacity conflicts to the Director for resolution at S&OP.`;

  // ── ACT ──
  const actParts: string[] = [];
  if (allActions.length) {
    actParts.push(`**${allActions.length}** prescriptive actions recommended, each with cost-benefit analysis and authority-level tagging.`);
    const approved = allActions.filter((a) => !a.approval_required);
    const pending = allActions.filter((a) => a.approval_required);
    if (approved.length) actParts.push(`**${approved.length}** actions within planner authority — can be executed immediately.`);
    if (pending.length) actParts.push(`**${pending.length}** actions require escalation for approval.`);
    const totalImpact = allActions.reduce((s, a) => s + (a.impact_usd ?? 0), 0);
    const totalCost = allActions.reduce((s, a) => s + (a.cost_usd ?? 0), 0);
    if (totalImpact) actParts.push(`Total revenue protected: **$${totalImpact.toLocaleString()}**.`);
    if (totalCost) actParts.push(`Total intervention cost: **$${totalCost.toLocaleString()}**.`);
    if (totalImpact && totalCost) actParts.push(`Portfolio benefit-cost ratio: **${(totalImpact / Math.max(totalCost, 1)).toFixed(1)}x**.`);
  } else {
    actParts.push("No prescriptive actions generated for this run — anomalies may be within manageable thresholds.");
  }
  result.act = actParts.join(" ") + ` |IMPLICATIONS| Each action card represents a quantified trade-off: the cost of intervention vs. the revenue it protects. Actions within planner authority can be executed immediately; escalated items require leadership sign-off at S&OP. |ACTIONS| Review and approve actions within your authority threshold. Route escalated items to the Director with the benefit-cost ratio as justification. Execute time-sensitive actions (perishable categories) before end of day.`;

  // ── Executive ──
  const execParts: string[] = [];
  execParts.push(`Enterprise portfolio scan: **${allAnomalies.length}** anomalies across **${depts.length}** departments.`);
  const totalVar = allMetrics.find((m) => (m.metric ?? "").toLowerCase().includes("revenue_at_risk"));
  if (totalVar) execParts.push(`Total revenue at stake: **${totalVar.value}**.`);
  if (allActions.length) {
    const withinAuth = allActions.filter((a) => !a.approval_required).length;
    const needsApproval = allActions.filter((a) => a.approval_required).length;
    execParts.push(`**${withinAuth}** actions within planner authority; **${needsApproval}** pending leadership sign-off.`);
  }
  if (headlines.length) execParts.push(headlines.join(". ") + ".");
  result.executive = execParts.join(" ") + ` |IMPLICATIONS| The enterprise roll-up consolidates all departmental signals into one decision surface. Cross-department contentions and resource conflicts are surfaced here to prevent siloed decision-making. |ACTIONS| Approve or reallocate contested resources (expedited freight, DC capacity). Sign off on escalated actions. Use this briefing as the S&OP discussion anchor — all numbers trace back to specific product-region-driver combinations.`;

  return result;
}

// ── Dynamic DAG Layout ───────────────────────────────────────────────────────

const NW = 150;
const NH = 52;

interface LayoutNode {
  id: string;
  label: string;
  x: number;
  y: number;
  isControl: boolean;
}
interface LayoutEdge {
  id: string;
  from: string;
  to: string;
}

function formatNodeLabel(nodeName: string): string {
  return nodeName
    .replace(/_/g, " ")
    .replace(/\btask\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function layoutGraph(graph: OrchestrationGraph | null): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  retryEdges: LayoutEdge[];
  width: number;
  height: number;
} {
  if (!graph || !graph.nodes.length)
    return { nodes: [], edges: [], retryEdges: [], width: 860, height: 200 };

  const nodeMap = new Map<string, GraphNode>();
  for (const n of graph.nodes) nodeMap.set(n.node_name, n);

  // Build forward-only adjacency (exclude back-edges via wave_no)
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  for (const n of graph.nodes) {
    adj.set(n.node_name, []);
    inDeg.set(n.node_name, 0);
  }
  for (const e of graph.edges) {
    const src = nodeMap.get(e.source);
    const tgt = nodeMap.get(e.target);
    if (src && tgt && src.wave_no <= tgt.wave_no) {
      adj.get(e.source)!.push(e.target);
      inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
    }
  }

  // Longest-path BFS to assign depth
  const depth = new Map<string, number>();
  for (const n of graph.nodes) depth.set(n.node_name, 0);

  // Topological iteration (iterative)
  const queue: string[] = [];
  for (const n of graph.nodes) {
    if ((inDeg.get(n.node_name) || 0) === 0) queue.push(n.node_name);
  }
  const order: string[] = [];
  const inDegCopy = new Map(inDeg);
  while (queue.length) {
    const cur = queue.shift()!;
    order.push(cur);
    for (const nb of adj.get(cur) || []) {
      const d = (depth.get(cur) || 0) + 1;
      if (d > (depth.get(nb) || 0)) depth.set(nb, d);
      inDegCopy.set(nb, (inDegCopy.get(nb) || 1) - 1);
      if (inDegCopy.get(nb) === 0) queue.push(nb);
    }
  }

  // Group nodes into rows by depth
  const rows = new Map<number, string[]>();
  for (const n of graph.nodes) {
    const d = depth.get(n.node_name) || 0;
    if (!rows.has(d)) rows.set(d, []);
    rows.get(d)!.push(n.node_name);
  }

  const CANVAS_W = 860;
  const ROW_GAP_Y = 110;
  const COL_GAP = 30;
  const layoutNodes: LayoutNode[] = [];
  let maxRow = 0;

  for (const [d, ids] of rows) {
    if (d > maxRow) maxRow = d;
    const totalW = ids.length * NW + (ids.length - 1) * COL_GAP;
    const startX = Math.max(10, (CANVAS_W - totalW) / 2);
    ids.forEach((id, i) => {
      const gn = nodeMap.get(id)!;
      layoutNodes.push({
        id,
        label: formatNodeLabel(id),
        x: startX + i * (NW + COL_GAP),
        y: d * ROW_GAP_Y + 20,
        isControl: gn.kind === "control",
      });
    });
  }

  // Forward edges (follow the main flow)
  const layoutEdges: LayoutEdge[] = [];
  for (const e of graph.edges) {
    const src = nodeMap.get(e.source);
    const tgt = nodeMap.get(e.target);
    if (src && tgt && src.wave_no <= tgt.wave_no) {
      layoutEdges.push({ id: `${e.source}->${e.target}`, from: e.source, to: e.target });
    }
  }

  // Back-edges (retry flows) — included but marked
  const retryEdges: LayoutEdge[] = [];
  for (const e of graph.edges) {
    const src = nodeMap.get(e.source);
    const tgt = nodeMap.get(e.target);
    if (src && tgt && src.wave_no > tgt.wave_no) {
      retryEdges.push({ id: `retry-${e.source}->${e.target}`, from: e.source, to: e.target });
    }
  }

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    retryEdges,
    width: CANVAS_W,
    height: (maxRow + 1) * ROW_GAP_Y + 60,
  };
}

function buildEdgePath(
  fromId: string,
  toId: string,
  nodeMap: Map<string, LayoutNode>,
): string {
  const a = nodeMap.get(fromId);
  const b = nodeMap.get(toId);
  if (!a || !b) return "";
  const x1 = a.x + NW / 2;
  const y1 = a.y + NH;
  const x2 = b.x + NW / 2;
  const y2 = b.y;
  const cy1 = y1 + (y2 - y1) * 0.4;
  const cy2 = y1 + (y2 - y1) * 0.6;
  return `M${x1},${y1} C${x1},${cy1} ${x2},${cy2} ${x2},${y2}`;
}

function buildRetryEdgePath(
  fromId: string,
  toId: string,
  nodeMap: Map<string, LayoutNode>,
  canvasW: number,
): string {
  const a = nodeMap.get(fromId);
  const b = nodeMap.get(toId);
  if (!a || !b) return "";
  const x1 = a.x + NW;
  const y1 = a.y + NH / 2;
  const x2 = b.x + NW;
  const y2 = b.y + NH / 2;
  const loopX = Math.min(canvasW - 20, Math.max(x1, x2) + 60);
  return `M${x1},${y1} C${loopX},${y1} ${loopX},${y2} ${x2},${y2}`;
}

// ── AgentNetworkGraph ────────────────────────────────────────────────────────

function AgentNetworkGraph({
  eventMap,
  pipelineRunning,
  graphData,
}: {
  eventMap: Map<string, OrchestrationEvent>;
  pipelineRunning: boolean;
  graphData: OrchestrationGraph | null;
}) {
  const { nodes, edges, retryEdges, width, height } = layoutGraph(graphData);
  const nodeMapById = new Map<string, LayoutNode>();
  for (const n of nodes) nodeMapById.set(n.id, n);

  const completedCount = Array.from(eventMap.values()).filter(
    (e) => e.STATUS === "ok",
  ).length;
  const activeCount = Array.from(eventMap.values()).filter(
    (e) => e.STATUS === "RUNNING",
  ).length;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: "rgba(0,255,255,0.15)",
        background: "linear-gradient(135deg, #0a0e1a 0%, #0d1117 50%, #0a0f1e 100%)",
      }}
    >
      <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: "rgba(0,255,255,0.1)" }}>
        <div className="flex items-center gap-2">
          <span style={{ color: "#00e5ff", fontSize: "16px" }}>◈</span>
          <span className="text-sm font-bold" style={{ color: "#e0f7fa" }}>
            Live Agent Network
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: "#80cbc4" }}>
          {completedCount}/{nodes.length} complete · {activeCount} active
        </span>
      </div>
      <div className="overflow-x-auto p-4">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="mx-auto block"
        >
          <defs>
            <filter id="gcyan">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00e5ff" floodOpacity="0.6" />
            </filter>
            <filter id="ggreen">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.6" />
            </filter>
            <filter id="gred">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.6" />
            </filter>
            <marker id="arrowRetry" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="7" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 4 L 0 8 z" fill="#f59e0b" opacity="0.7" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e) => {
            const fromEv = eventMap.get(e.from);
            const toEv = eventMap.get(e.to);
            const fromDone = fromEv?.STATUS === "ok";
            const toDone = toEv?.STATUS === "ok";
            const toRunning = toEv?.STATUS === "RUNNING";
            const path = buildEdgePath(e.from, e.to, nodeMapById);

            if (fromDone && toDone) {
              return (
                <path key={e.id} d={path} fill="none" stroke="#10b981" strokeWidth={2} opacity={0.8} />
              );
            }
            if (toRunning) {
              return (
                <path
                  key={e.id}
                  d={path}
                  fill="none"
                  stroke="#00e5ff"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  opacity={0.9}
                >
                  <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.8s" repeatCount="indefinite" />
                </path>
              );
            }
            return (
              <g key={e.id}>
                <path d={path} fill="none" stroke="#334155" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.5} />
                <circle r="2" fill="#64748b" opacity={0.6}>
                  <animateMotion dur="3s" repeatCount="indefinite" path={path} />
                </circle>
              </g>
            );
          })}

          {/* Retry edges — styled as dashed amber curves looping right */}
          {retryEdges.map((e) => {
            const path = buildRetryEdgePath(e.from, e.to, nodeMapById, width);
            return (
              <g key={e.id}>
                <path
                  d={path}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  opacity={0.5}
                  markerEnd="url(#arrowRetry)"
                />
                <text dy={-6} fill="#f59e0b" fontSize={8} fontFamily="monospace" opacity={0.6}>
                  <textPath href={`#${e.id}-path`} startOffset="50%" textAnchor="middle">
                    retry on failure
                  </textPath>
                </text>
                <path id={`${e.id}-path`} d={path} fill="none" stroke="none" />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            const ev = eventMap.get(n.id);
            const st = ev?.STATUS;
            const isRunning = st === "RUNNING";
            const isDone = st === "ok";
            const isError = st === "error" || st === "timeout";

            let stroke = "#334155";
            let fill = "rgba(15,23,42,0.8)";
            let textColor = "#94a3b8";
            let filter: string | undefined;

            if (isRunning) {
              stroke = "#00e5ff";
              fill = "rgba(0,229,255,0.08)";
              textColor = "#e0f7fa";
              filter = "url(#gcyan)";
            } else if (isDone) {
              stroke = "#10b981";
              fill = "rgba(16,185,129,0.08)";
              textColor = "#a7f3d0";
              filter = "url(#ggreen)";
            } else if (isError) {
              stroke = "#ef4444";
              fill = "rgba(239,68,68,0.08)";
              textColor = "#fca5a5";
              filter = "url(#gred)";
            }

            const statusLine = isRunning
              ? "⚡ running…"
              : isDone
              ? `✓ ${formatDuration(ev?.DURATION_MS)}`
              : isError
              ? `✗ ${ev?.ERROR_MSG?.slice(0, 30) || st}`
              : "○ idle";

            return (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={NW}
                  height={NH}
                  rx={10}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isRunning || isDone ? 2 : 1}
                  filter={filter}
                >
                  {isRunning && (
                    <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
                  )}
                  {!isRunning && !isDone && !isError && (
                    <animate attributeName="stroke-opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite" />
                  )}
                </rect>
                <text
                  x={n.x + NW / 2}
                  y={n.y + 20}
                  textAnchor="middle"
                  fill={textColor}
                  fontSize={11}
                  fontWeight={600}
                  fontFamily="system-ui, sans-serif"
                >
                  {n.isControl ? `⊘ ${n.label}` : n.label}
                </text>
                <text
                  x={n.x + NW / 2}
                  y={n.y + 38}
                  textAnchor="middle"
                  fill={textColor}
                  fontSize={9}
                  fontFamily="monospace"
                  opacity={0.7}
                >
                  {statusLine}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function AutonomousPage() {
  const {
    persona,
    setPersona,
    runId,
    setRunId,
    runIds,
    setRunIds,
    orchestrationStatus,
    setOrchestrationStatus,
    nodeEvents,
    setNodeEvents,
    orchestrationResult,
    setOrchestrationResult,
    orchestrationResults,
    setOrchestrationResults,
    activePersonaKey,
    setActivePersonaKey,
    orchestrationError,
    setOrchestrationError,
    resetAutonomous,
  } = useApp();

  const [elapsed, setElapsed] = useState(0);
  const [analyticsCache, setAnalyticsCache] = useState<Partial<Record<PersonaKey, AnalyticsData>>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [graphData, setGraphData] = useState<OrchestrationGraph | null>(null);

  const eventsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Fetch graph topology on mount
  useEffect(() => {
    api.getOrchestrationGraph().then(setGraphData).catch(() => {});
  }, []);

  // Sync activePersonaKey ↔ global persona dropdown
  useEffect(() => {
    const expected = PERSONA_KEY_TO_TITLE[activePersonaKey] as Persona;
    if (persona !== expected) {
      setPersona(expected);
    }
  }, [activePersonaKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const key = PERSONA_TITLE_TO_KEY[persona];
    if (key && key !== activePersonaKey) {
      setActivePersonaKey(key);
    }
  }, [persona]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopPolling = useCallback(() => {
    if (eventsIntervalRef.current) { clearInterval(eventsIntervalRef.current); eventsIntervalRef.current = null; }
    if (resultIntervalRef.current) { clearInterval(resultIntervalRef.current); resultIntervalRef.current = null; }
    if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
  }, []);

  // Poll events from ALL run_ids and merge
  const pollAllEvents = useCallback(async () => {
    const ids = Object.values(runIds).filter(Boolean) as string[];
    if (!ids.length) return;
    try {
      const allEvents = await Promise.all(ids.map((rid) => api.getOrchestrationEvents(rid)));
      const merged = allEvents.flat();
      setNodeEvents(merged);
    } catch { /* transient */ }
  }, [runIds, setNodeEvents]);

  // Poll results for all 3 run_ids
  const pollAllResults = useCallback(async () => {
    const entries = Object.entries(runIds) as [PersonaKey, string | null][];
    const active = entries.filter(([, rid]) => rid != null) as [PersonaKey, string][];
    if (!active.length) return;

    try {
      const results = await Promise.all(
        active.map(async ([key, rid]) => {
          const r = await api.getOrchestrationResult(rid);
          return [key, r] as [PersonaKey, OrchestrationResult];
        }),
      );

      let allDone = true;
      let anyFailed = false;
      let failMsg = "";

      for (const [key, r] of results) {
        setOrchestrationResults((prev: MultiRunResults) => ({ ...prev, [key]: r }));
        if (r.status === "FAILED") {
          anyFailed = true;
          failMsg = r.error_message || "Pipeline failed";
        }
        if (r.status !== "COMPLETED" && r.status !== "FAILED") {
          allDone = false;
        }
      }

      if (anyFailed) {
        setOrchestrationStatus("failed");
        setOrchestrationError(failMsg);
        stopPolling();
      } else if (allDone) {
        setOrchestrationStatus("completed");
        stopPolling();
      }
    } catch { /* transient */ }
  }, [runIds, setOrchestrationResults, setOrchestrationStatus, setOrchestrationError, stopPolling]);

  // Start polling when running
  useEffect(() => {
    if (orchestrationStatus === "running") {
      startTimeRef.current = Date.now();
      setElapsed(0);
      elapsedIntervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000));
      }, 1000);
      eventsIntervalRef.current = setInterval(pollAllEvents, 2500);
      resultIntervalRef.current = setInterval(pollAllResults, 4000);
      pollAllEvents();
      pollAllResults();
    }
    return stopPolling;
  }, [orchestrationStatus, pollAllEvents, pollAllResults, stopPolling]);

  // Fetch analytics when completed
  useEffect(() => {
    if (orchestrationStatus !== "completed") return;
    if (analyticsCache[activePersonaKey]) return;

    setAnalyticsLoading(true);
    const personaTitle = PERSONA_KEY_TO_TITLE[activePersonaKey];
    api
      .getAutonomousAnalytics(personaTitle)
      .then((data) => {
        setAnalyticsCache((prev) => ({ ...prev, [activePersonaKey]: data }));
      })
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, [orchestrationStatus, activePersonaKey, analyticsCache]);

  // Submit handler
  async function handleSubmit() {
    setOrchestrationStatus("submitting");
    setOrchestrationError(null);
    try {
      const resp = await api.submitAllOrchestrations();
      setRunIds(resp.run_ids);
      setOrchestrationStatus("running");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start orchestration";
      setOrchestrationError(msg);
      setOrchestrationStatus("failed");
    }
  }

  function handleReset() {
    stopPolling();
    resetAutonomous();
    setElapsed(0);
    setAnalyticsCache({});
  }

  // Build event map: latest event per NODE_NAME by EVENT_AT timestamp
  const eventMap = new Map<string, OrchestrationEvent>();
  for (const e of nodeEvents) {
    const existing = eventMap.get(e.NODE_NAME);
    if (!existing || (e.EVENT_AT && (!existing.EVENT_AT || e.EVENT_AT > existing.EVENT_AT))) {
      eventMap.set(e.NODE_NAME, e);
    }
  }

  const isIdle = orchestrationStatus === "idle";
  const isRunning = orchestrationStatus === "running" || orchestrationStatus === "submitting";
  const isCompleted = orchestrationStatus === "completed";
  const isFailed = orchestrationStatus === "failed";

  // ── FAILED STATE ─────────────────────────────────────────────────────────────
  if (isFailed) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in pt-16">
        <div className="rounded-2xl border border-red-200 p-8 text-center" style={{ background: "rgba(239,68,68,0.04)" }}>
          <span className="material-icons-outlined text-red-500 mb-4 block" style={{ fontSize: "48px" }}>error_outline</span>
          <h3 className="text-lg font-semibold text-[var(--hex-text)] mb-2">Pipeline Failed</h3>
          <p className="text-sm text-[var(--hex-text-dim)] mb-6">
            {orchestrationError || "An error occurred — please retry."}
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium border-none cursor-pointer transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}
          >
            <span className="material-icons-outlined" style={{ fontSize: "16px" }}>refresh</span>
            Run New Analysis
          </button>
        </div>
      </div>
    );
  }

  // ── COMPLETED STATE — Per-Persona Report ──────────────────────────────────
  if (isCompleted) {
    const activeResult = orchestrationResults[activePersonaKey];
    const execReport = activeResult?.exec_report;
    const summary = execReport?.enterprise_summary;
    const sections = execReport?.sections || [];
    const analytics = analyticsCache[activePersonaKey];
    const kpis = analytics?.kpis;
    const narrative = activeResult?.result?.narrative as string | undefined;

    const vizNarr = buildPerVizNarratives(sections, narrative);

    const personaTitle = PERSONA_KEY_TO_TITLE[activePersonaKey];

    const isDataGap = sections.some((s) => s.headline?.startsWith("DATA GAP:"));

    function handleSwitchPersona(targetPersona: string) {
      const keyMap: Record<string, PersonaKey> = {
        "Demand Planner": "demand_planner",
        "Supply Planner": "supply_planner",
        "Director of Demand Planning": "director",
      };
      const k = keyMap[targetPersona];
      if (k) setActivePersonaKey(k);
    }

    return (
      <div className="max-w-6xl mx-auto animate-fade-in pt-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--hex-text)]">Autonomous Demand Sensing Report</h1>
            {execReport?.as_of && (
              <p className="text-xs text-[var(--hex-text-dim)] mt-1">As of {execReport.as_of}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-medium border-none cursor-pointer transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}
          >
            <span className="material-icons-outlined" style={{ fontSize: "16px" }}>refresh</span>
            Run New Analysis
          </button>
        </div>

        {/* Executive Summary Banner */}
        <div
          className="rounded-2xl p-6 mb-8 text-white"
          style={{ background: "linear-gradient(135deg, #1a237e 0%, #3C2CDA 50%, #6366F1 100%)" }}
        >
          <p className="text-sm leading-relaxed opacity-95">
            This report consolidates signals from POS data, weather feeds, competitor pricing, promotional
            calendars, and digital trends across Brightway Retail&apos;s $2.2B portfolio. The autonomous agent
            network scanned 40 stores across 5 regions and 3 departments to detect demand anomalies, explain
            their root causes, predict their trajectory, and recommend sized actions — condensing what would
            normally take 7–14 days of cross-team analysis into one automated run.
          </p>
        </div>

        {/* BrightwayIntro */}
        <BrightwayIntro timeContext={analytics?.timeContext ?? null} />

        {/* DATA GAP callout */}
        {isDataGap && (
          <div className="rounded-xl p-4 border border-amber-300 flex items-start gap-3 mb-6" style={{ background: "rgba(245,158,11,0.08)" }}>
            <span className="material-icons-outlined text-amber-500 mt-0.5" style={{ fontSize: "20px" }}>info</span>
            <div>
              <div className="text-xs font-bold text-amber-700 uppercase mb-1">Data Gap Detected</div>
              <p className="text-sm text-[var(--hex-text)]">
                {sections.find((s) => s.headline?.startsWith("DATA GAP:"))?.headline}
              </p>
            </div>
          </div>
        )}

        {/* Enterprise Summary KPI Banner */}
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <KPICard label="Total Anomalies" value={kpis.total_anomalies} icon="warning" subtitle="Category-region combinations with demand risk" />
                <KPICard label="High Impact" value={kpis.high_impact} icon="priority_high" color="#EF4444" subtitle="CRITICAL or HIGH severity risks" />
                <KPICard label="Departments" value={kpis.departments_affected} icon="business" subtitle="Departments with active anomalies" />
                <KPICard label="Revenue at Stake" value={formatUsd(kpis.revenue_at_stake)} icon="trending_down" color="#EF4444" subtitle="Deduplicated revenue exposure across portfolio" />
                <KPICard label="Avg Stockout Rate" value={`${Number(kpis.avg_stockout_rate).toFixed(1)}%`} icon="inventory" color="#F97316" subtitle="Weighted average out-of-stock rate" />
                <KPICard label="Units at Risk" value={Number(kpis.total_units_at_risk).toLocaleString()} icon="local_shipping" color="#8B5CF6" subtitle="Deduplicated units with demand shortfall" />
          </div>
        )}

        {/* PersonaBlurb */}
        <PersonaBlurb persona={personaTitle} />

        {/* Analytics loading indicator */}
        {analyticsLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[var(--hex-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-[var(--hex-text-dim)]">Loading analytics…</span>
          </div>
        )}

        {/* ── Demand Planner (Steps 1-2) ── */}
        {activePersonaKey === "demand_planner" && analytics && (
          <>
            <StepHeader stepNumber={1} title="Detect" subtitle="Multi-signal anomaly detection across all department portfolios — ranked by 11-day revenue impact." />
            <p className="text-sm text-[var(--hex-text-dim)] mb-6 -mt-2">
              The detection engine scans POS, weather, competitor, promotional, and digital signals
              to surface anomalies ranked by potential revenue impact over an 11-day horizon.
            </p>
            <div className="mb-10"><DeviationHeatmap data={analytics.heatmap} narrative={vizNarr.heatmap || narrative} vizNumber="1.1" /></div>
            <div className="mb-10"><VarianceHistogram data={analytics.variance} narrative={vizNarr.variance || narrative} vizNumber="1.2" /></div>
            <div className="mb-10"><AnomalyTable data={analytics.anomalies} narrative={vizNarr.anomaly_table || narrative} vizNumber="1.3" /></div>
            <div className="mb-10"><CrossDeptSignalStrip anomalies={analytics.anomalies} narrative={vizNarr.cross_dept || narrative} vizNumber="1.4" /></div>

            <StepHeader stepNumber={2} title="Explain" subtitle="Root cause attribution and recovery trajectory for each detected anomaly." />
            <p className="text-sm text-[var(--hex-text-dim)] mb-6 -mt-2">
              Each deviation is decomposed into its contributing drivers — weather, promotions,
              competitor actions, and digital signals — with confidence-weighted attribution.
            </p>
            <div className="mb-10"><DriverAttribution data={analytics.drivers} narrative={vizNarr.drivers || narrative} vizNumber="2.1" /></div>

            <PersonaHandoff persona="Demand Planner" onSwitchPersona={handleSwitchPersona} />
          </>
        )}

        {/* ── Supply Planner (Steps 3-4) ── */}
        {activePersonaKey === "supply_planner" && analytics && (
          <>
            <StepHeader stepNumber={3} title="Predict" subtitle="Forward-looking recovery projections and stockout risk across affected product lines." />
            <p className="text-sm text-[var(--hex-text-dim)] mb-6 -mt-2">
              Recovery value decay, daily erosion rates, and benefit-cost ratios quantify
              the urgency window for each category — enabling prioritized supply response.
            </p>
            <div className="mb-10"><RecoveryTimeline data={analytics.recovery} narrative={vizNarr.recovery || narrative} vizNumber="3.1" /></div>
            <div className="mb-10"><StockoutRiskTable data={analytics.stockout ?? []} narrative={vizNarr.stockout || narrative} vizNumber="3.2" /></div>

            <StepHeader stepNumber={4} title="Act" subtitle="Recommended replenishment and sourcing actions within guardrails." />
            <p className="text-sm text-[var(--hex-text-dim)] mb-6 -mt-2">
              Prescriptive recommendations with cost-benefit analysis, confidence scores,
              and category-region prioritization for rapid decision-making.
            </p>
            <div className="mb-10">
              <RecommendationCards data={analytics.recommendations ?? []} narrative={vizNarr.act || narrative} />
            </div>

            <PersonaHandoff persona="Supply Planner" onSwitchPersona={handleSwitchPersona} />
          </>
        )}

        {/* ── Director (Step 5) ── */}
        {activePersonaKey === "director" && (
          <>
            <StepHeader stepNumber={5} title="Communicate" subtitle="Enterprise-level executive briefing pack consolidating all departmental signals." />
            <p className="text-sm text-[var(--hex-text-dim)] mb-6 -mt-2">
              The consolidated briefing aggregates all anomalies, actions, and contentions
              across departments for S&amp;OP review and executive sign-off.
            </p>
            <div className="mb-10">
              <ExecutiveBriefingPack
                summary={summary ?? null}
                sections={sections}
                contentions={summary?.cross_department_contentions || []}
                pendingApprovals={execReport?.pending_approvals || []}
                recommendations={analytics?.recommendations ?? []}
                narrative={vizNarr.executive || narrative}
              />
            </div>
            <ClosingTheLoop stepsCompleted={5} />
          </>
        )}
      </div>
    );
  }

  // ── IDLE / RUNNING STATE ──────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto animate-fade-in pt-6">
      {/* Header banner — matches Interactive Module style */}
      <div className="rounded-2xl p-5 mb-6 text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a237e 0%, #3C2CDA 30%, #42a5f5 70%, #80d8ff 100%)",
          boxShadow: "0 4px 20px rgba(26,35,126,0.35)",
        }}>
        <div className="absolute top-0 left-12 w-24 h-full opacity-[0.14]"
          style={{ background: "repeating-linear-gradient(60deg, white 0px, white 2px, transparent 2px, transparent 14px)" }} />
        <div className="absolute -top-4 -left-4 w-20 h-20 opacity-[0.16]"
          style={{ background: "white", transform: "rotate(45deg)", borderRadius: "6px" }} />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <span className="material-icons-outlined text-white" style={{ fontSize: "22px" }}>
                precision_manufacturing
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold mb-0.5 tracking-tight">Autonomous Analysis</h2>
              <p className="text-white/60 text-[11px] m-0">
                {persona} · Multi-agent demand sensing pipeline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isRunning && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <span className="material-icons-outlined text-white/80" style={{ fontSize: "16px" }}>timer</span>
                <span className="text-sm font-mono font-semibold text-white">
                  {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")}
                </span>
              </div>
            )}
            {!isIdle && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-semibold cursor-pointer border-none hover:opacity-90 transition-all"
                style={{ background: "rgba(26,35,126,0.5)", border: "1px solid rgba(255,255,255,0.3)" }}
              >
                <span className="material-icons-outlined" style={{ fontSize: "14px" }}>refresh</span>
                Reset
              </button>
            )}
            {isIdle && (
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-semibold text-sm transition-all hover:shadow-lg active:scale-[0.98] border-none cursor-pointer"
                style={{ background: "rgba(26,35,126,0.6)", border: "1px solid rgba(255,255,255,0.3)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
              >
                <span className="material-icons-outlined" style={{ fontSize: "18px" }}>play_arrow</span>
                Run All Personas
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Submitting spinner overlay */}
      {orchestrationStatus === "submitting" && (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-[var(--hex-primary)] border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-[var(--hex-text-dim)]">Submitting orchestration…</span>
        </div>
      )}

      {/* DAG */}
      <AgentNetworkGraph eventMap={eventMap} pipelineRunning={isRunning} graphData={graphData} />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: number | string | null | undefined;
  icon: string;
  color?: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border p-5 flex flex-col justify-between" 
      style={{ background: "var(--hex-card-bg)", borderColor: "var(--hex-border, #e2e8f0)", minHeight: "120px" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--hex-text-dim)", letterSpacing: "0.1em" }}>{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" 
          style={{ background: `${color || "var(--hex-primary)"}15` }}>
          <span className="material-icons-outlined" style={{ fontSize: "18px", color: color || "var(--hex-primary)" }}>{icon}</span>
        </div>
      </div>
      <div className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--hex-text)", lineHeight: 1.1 }}>{value ?? "—"}</div>
      {subtitle && (
        <p className="text-[10px] mt-2 leading-snug" style={{ color: "var(--hex-text-dim)" }}>{subtitle}</p>
      )}
    </div>
  );
}

function ActionCard({ action }: { action: RecommendedAction }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] p-4 mb-3">
      <div className="flex items-start justify-between gap-4 mb-2">
        <p className="text-sm font-medium text-[var(--hex-text)] flex-1">{action.action}</p>
        <div className="flex items-center gap-2 shrink-0">
          {action.approval_required && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-100 text-orange-700">
              Approval Required
            </span>
          )}
          {action.authority && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
              {action.authority}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-[var(--hex-text-dim)]">
        {action.impact_usd != null && (
          <span>
            Impact: <span className="font-semibold text-green-600">{formatUsd(action.impact_usd)}</span>
          </span>
        )}
        {action.cost_usd != null && (
          <span>
            Cost: <span className="font-semibold text-[var(--hex-text)]">{formatUsd(action.cost_usd)}</span>
          </span>
        )}
        {action.confidence != null && (
          <div className="flex items-center gap-1.5">
            <span>Confidence:</span>
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${action.confidence * 100}%`, background: "var(--hex-primary)" }}
              />
            </div>
            <span className="font-mono">{(action.confidence * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
