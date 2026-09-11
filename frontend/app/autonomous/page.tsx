"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { PERSONAS } from "@/lib/constants";
import { useApp } from "@/context/AppContext";
import type {
  OrchestrationEvent,
  OrchestrationResult,
  AgentNetworkNode,
  ExecReport,
  ReportSection,
  RecommendedAction,
  KeyMetric,
  Anomaly,
  Driver,
} from "@/lib/orchestration-types";

// ── Hardcoded Agent Network Topology ──────────────────────────────────────────

const NETWORK_NODES: AgentNetworkNode[] = [
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

function statusBg(status: string | undefined): string {
  switch (status) {
    case "RUNNING": return "rgba(60,44,218,0.1)";
    case "ok": return "rgba(16,185,129,0.1)";
    case "error": return "rgba(239,68,68,0.1)";
    case "timeout": return "rgba(249,115,22,0.1)";
    case "degraded": return "rgba(234,179,8,0.1)";
    default: return "rgba(148,163,184,0.08)";
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function AutonomousPage() {
  const {
    runId, setRunId,
    orchestrationStatus, setOrchestrationStatus,
    nodeEvents, setNodeEvents,
    orchestrationResult, setOrchestrationResult,
    selectedPersonas, setSelectedPersonas,
    orchestrationError, setOrchestrationError,
    resetAutonomous,
  } = useApp();

  const [elapsed, setElapsed] = useState(0);
  const eventsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resultIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (eventsIntervalRef.current) { clearInterval(eventsIntervalRef.current); eventsIntervalRef.current = null; }
    if (resultIntervalRef.current) { clearInterval(resultIntervalRef.current); resultIntervalRef.current = null; }
    if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
  }, []);

  // Poll events
  const pollEvents = useCallback(async (rid: string) => {
    try {
      const events = await api.getOrchestrationEvents(rid);
      setNodeEvents(events);
    } catch { /* ignore transient failures */ }
  }, [setNodeEvents]);

  // Poll result
  const pollResult = useCallback(async (rid: string) => {
    try {
      const result = await api.getOrchestrationResult(rid);
      setOrchestrationResult(result);
      if (result.status === "COMPLETED") {
        setOrchestrationStatus("completed");
        stopPolling();
      } else if (result.status === "FAILED") {
        setOrchestrationStatus("failed");
        setOrchestrationError(result.error_message || "Pipeline failed");
        console.error("Orchestration failed:", result.error_message);
        stopPolling();
      }
    } catch { /* ignore transient */ }
  }, [setOrchestrationResult, setOrchestrationStatus, setOrchestrationError, stopPolling]);

  // Start polling when running
  useEffect(() => {
    if (orchestrationStatus === "running" && runId) {
      startTimeRef.current = Date.now();
      setElapsed(0);
      elapsedIntervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000));
      }, 1000);
      eventsIntervalRef.current = setInterval(() => pollEvents(runId), 2500);
      resultIntervalRef.current = setInterval(() => pollResult(runId), 4000);
      // initial fetch
      pollEvents(runId);
      pollResult(runId);
    }
    return stopPolling;
  }, [orchestrationStatus, runId, pollEvents, pollResult, stopPolling]);

  // Submit handler
  async function handleSubmit() {
    if (selectedPersonas.length === 0) return;
    setOrchestrationStatus("submitting");
    setOrchestrationError(null);
    try {
      const { run_id } = await api.submitOrchestration(selectedPersonas);
      setRunId(run_id);
      setOrchestrationStatus("running");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start orchestration";
      setOrchestrationError(msg);
      setOrchestrationStatus("failed");
    }
  }

  function togglePersona(p: string) {
    setSelectedPersonas((prev: string[]) =>
      prev.includes(p) ? prev.filter((x: string) => x !== p) : [...prev, p]
    );
  }

  function handleReset() {
    stopPolling();
    resetAutonomous();
    setElapsed(0);
  }

  // Build event map for quick lookup
  const eventMap = new Map<string, OrchestrationEvent>();
  for (const e of nodeEvents) {
    const existing = eventMap.get(e.NODE_NAME);
    if (!existing || (e.EVENT_AT && (!existing.EVENT_AT || e.EVENT_AT > existing.EVENT_AT))) {
      eventMap.set(e.NODE_NAME, e);
    }
  }

  // ── IDLE STATE ──────────────────────────────────────────────────────────────
  if (orchestrationStatus === "idle") {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in pt-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))", boxShadow: "0 4px 16px rgba(60,44,218,0.25)" }}>
            <span className="material-icons-outlined text-white" style={{ fontSize: "32px" }}>precision_manufacturing</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--hex-text)] mb-2">Autonomous Analysis</h1>
          <p className="text-sm text-[var(--hex-text-dim)]">
            Multi-agent demand sensing pipeline — select personas and run the autonomous analysis
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] p-6 mb-6"
          style={{ background: "var(--hex-card-bg)" }}>
          <h3 className="text-sm font-semibold text-[var(--hex-text)] mb-4">Select Personas</h3>
          <div className="space-y-3">
            {PERSONAS.map((p) => (
              <label key={p} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-colors hover:bg-[var(--hex-primary)]/5">
                <input
                  type="checkbox"
                  checked={selectedPersonas.includes(p)}
                  onChange={() => togglePersona(p)}
                  className="w-5 h-5 rounded accent-[var(--hex-primary)]"
                />
                <span className="text-sm font-medium text-[var(--hex-text)]">{p}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedPersonas.length === 0}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer"
            style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}
          >
            <span className="material-icons-outlined" style={{ fontSize: "20px" }}>play_arrow</span>
            Run Pipeline
          </button>
        </div>
      </div>
    );
  }

  // ── SUBMITTING STATE ────────────────────────────────────────────────────────
  if (orchestrationStatus === "submitting") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-pulse">
          <div className="w-10 h-10 border-4 border-[var(--hex-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--hex-text-dim)] text-sm font-medium">Submitting orchestration...</p>
        </div>
      </div>
    );
  }

  // ── FAILED STATE ────────────────────────────────────────────────────────────
  if (orchestrationStatus === "failed") {
    return (
      <div className="max-w-lg mx-auto animate-fade-in pt-16">
        <div className="rounded-2xl border border-red-200 p-8 text-center" style={{ background: "rgba(239,68,68,0.04)" }}>
          <span className="material-icons-outlined text-red-500 mb-4 block" style={{ fontSize: "48px" }}>error_outline</span>
          <h3 className="text-lg font-semibold text-[var(--hex-text)] mb-2">Pipeline Failed</h3>
          <p className="text-sm text-[var(--hex-text-dim)] mb-6">
            {orchestrationError || "An error occurred — please retry."}
          </p>
          <button type="button" onClick={handleReset}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium border-none cursor-pointer transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}>
            <span className="material-icons-outlined" style={{ fontSize: "16px" }}>refresh</span>
            Run New Analysis
          </button>
        </div>
      </div>
    );
  }

  // ── RUNNING STATE — Agent Network Visualization ─────────────────────────────
  if (orchestrationStatus === "running") {
    const waves = [0, 1, 2, 3, 5];
    const waveLabels: Record<number, string> = { 0: "Plan", 1: "Gather", 2: "Analyze", 3: "Validate", 5: "Report" };

    return (
      <div className="max-w-6xl mx-auto animate-fade-in pt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[var(--hex-text)]">Agent Network</h1>
            <p className="text-xs text-[var(--hex-text-dim)] mt-1">Orchestration in progress — run ID: {runId}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-color)]" style={{ background: "var(--hex-card-bg)" }}>
              <span className="material-icons-outlined text-[var(--hex-primary)]" style={{ fontSize: "18px" }}>timer</span>
              <span className="text-sm font-mono font-semibold text-[var(--hex-text)]">
                {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {waves.map((waveNo) => {
            const waveNodes = NETWORK_NODES.filter((n) => n.wave_no === waveNo && n.node_name !== "wave2_join");
            return (
              <div key={waveNo} className="flex flex-col gap-3 min-w-[180px]">
                <div className="text-xs font-semibold text-[var(--hex-text-dim)] uppercase tracking-wider text-center mb-1">
                  Wave {waveNo} — {waveLabels[waveNo]}
                </div>
                {waveNodes.map((node) => {
                  const event = eventMap.get(node.node_name);
                  const st = event?.STATUS;
                  const isRunning = st === "RUNNING";
                  return (
                    <div key={node.node_name}
                      className="rounded-xl border-2 p-4 transition-all"
                      style={{
                        borderColor: statusColor(st),
                        background: statusBg(st),
                        animation: isRunning ? "pulse 2s ease-in-out infinite" : undefined,
                      }}>
                      {node.is_control ? (
                        <div className="flex items-center gap-2">
                          <span className="material-icons-outlined" style={{ fontSize: "20px", color: statusColor(st) }}>
                            {node.node_name === "validation_gate" ? "verified_user" : "call_merge"}
                          </span>
                          <span className="text-xs font-semibold text-[var(--hex-text)]">
                            {node.node_name === "validation_gate" ? "Validation Gate" : node.node_name}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="text-xs font-bold text-[var(--hex-text)] mb-1 truncate" title={node.agent_name || ""}>
                            {shortName(node.agent_name)}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[var(--hex-text-dim)]">
                            <span className="uppercase font-semibold" style={{ color: statusColor(st) }}>
                              {st || "idle"}
                            </span>
                            {event?.DURATION_MS != null && (
                              <span className="font-mono">{formatDuration(event.DURATION_MS)}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Status legend */}
        <div className="flex gap-4 justify-center mt-6 text-[10px] text-[var(--hex-text-dim)]">
          {[["idle", "#94A3B8"], ["running", "var(--hex-primary)"], ["ok", "#10B981"], ["error", "#EF4444"], ["timeout", "#F97316"], ["degraded", "#EAB308"]].map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="uppercase font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── COMPLETED STATE — Executive Briefing Report ─────────────────────────────
  const result = orchestrationResult;
  const execReport = result?.exec_report;

  // Fallback: no exec_report but completed => show narrative
  if (!execReport && result?.status === "COMPLETED") {
    const narrative = result?.result?.narrative;
    return (
      <div className="max-w-4xl mx-auto animate-fade-in pt-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--hex-text)]">Analysis Complete</h1>
        </div>
        {narrative ? (
          <div className="rounded-2xl border border-[var(--border-color)] p-6" style={{ background: "var(--hex-card-bg)" }}>
            <p className="text-sm text-[var(--hex-text)] whitespace-pre-wrap leading-relaxed">{narrative}</p>
          </div>
        ) : (
          <p className="text-sm text-[var(--hex-text-dim)] text-center">No report data available.</p>
        )}
        <div className="flex justify-center mt-8">
          <button type="button" onClick={handleReset}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium border-none cursor-pointer"
            style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}>
            <span className="material-icons-outlined" style={{ fontSize: "16px" }}>refresh</span>
            Run New Analysis
          </button>
        </div>
      </div>
    );
  }

  const summary = execReport?.enterprise_summary;
  const sections = execReport?.sections || [];
  const pendingApprovals = execReport?.pending_approvals || [];
  const validation = execReport?.validation_summary;
  const contentions = summary?.cross_department_contentions || [];

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pt-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--hex-text)]">Executive Briefing</h1>
          {execReport?.as_of && (
            <p className="text-xs text-[var(--hex-text-dim)] mt-1">As of {execReport.as_of}</p>
          )}
        </div>
        <button type="button" onClick={handleReset}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-medium border-none cursor-pointer transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}>
          <span className="material-icons-outlined" style={{ fontSize: "16px" }}>refresh</span>
          Run New Analysis
        </button>
      </div>

      {/* Enterprise Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KPICard label="Total Anomalies" value={summary.anomalies_total} icon="warning" />
          <KPICard label="High Impact" value={summary.anomalies_high_impact} icon="priority_high" color="#EF4444" />
          <KPICard label="Departments" value={summary.departments_affected} icon="business" />
          <KPICard label="Revenue at Stake" value={formatUsd(summary.net_revenue_at_stake_usd)} icon="trending_down" color="#EF4444" />
          <KPICard label="Protected/Recovered" value={formatUsd(summary.protected_recovered_usd)} icon="shield" color="#10B981" />
          <KPICard label="Action Cost" value={formatUsd(summary.total_action_cost_usd)} icon="payments" />
          <KPICard label="Within Authority" value={summary.decisions_within_authority} icon="check_circle" color="#10B981" />
          <KPICard label="Pending Approval" value={summary.decisions_pending_approval} icon="pending" color="#F97316" />
        </div>
      )}

      {/* Cross-Department Contentions */}
      {contentions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--hex-text)] mb-3 flex items-center gap-2">
            <span className="material-icons-outlined text-amber-500" style={{ fontSize: "18px" }}>gavel</span>
            Cross-Department Contentions
          </h2>
          <div className="space-y-2">
            {contentions.map((c, i) => (
              <div key={i} className="rounded-xl border border-amber-200 p-4 text-sm text-[var(--hex-text)]"
                style={{ background: "rgba(245,158,11,0.05)" }}>
                {typeof c === "string" ? c : JSON.stringify(c)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Persona Sections */}
      {sections.map((section, idx) => (
        <PersonaSection key={idx} section={section} />
      ))}

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--hex-text)] mb-3 flex items-center gap-2">
            <span className="material-icons-outlined text-orange-500" style={{ fontSize: "18px" }}>approval</span>
            Pending Approvals
          </h2>
          <div className="space-y-2">
            {pendingApprovals.map((a, i) => (
              <div key={i} className="rounded-xl border border-orange-200 p-4 text-sm text-[var(--hex-text)]"
                style={{ background: "rgba(249,115,22,0.05)" }}>
                {typeof a === "string" ? a : JSON.stringify(a)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Summary */}
      {validation && (
        <div className="rounded-2xl border border-[var(--border-color)] p-6" style={{ background: "var(--hex-card-bg)" }}>
          <h2 className="text-sm font-semibold text-[var(--hex-text)] mb-3 flex items-center gap-2">
            <span className="material-icons-outlined text-[var(--hex-primary)]" style={{ fontSize: "18px" }}>verified</span>
            Validation Summary
          </h2>
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-white"
              style={{ background: validation.verdict === "CLEARED" ? "#10B981" : validation.verdict === "CONDITIONAL" ? "#F97316" : "var(--hex-primary)" }}>
              {validation.verdict || "UNKNOWN"}
            </span>
          </div>
          {validation.caveats && validation.caveats.length > 0 && (
            <div className="rounded-xl p-4 border border-amber-200 mt-3" style={{ background: "rgba(245,158,11,0.05)" }}>
              <div className="text-xs font-semibold text-amber-700 mb-2">Caveats</div>
              <ul className="space-y-1">
                {validation.caveats.map((c, i) => (
                  <li key={i} className="text-xs text-[var(--hex-text-dim)] flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPICard({ label, value, icon, color }: { label: string; value: number | string | null | undefined; icon: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] p-4" style={{ background: "var(--hex-card-bg)" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="material-icons-outlined" style={{ fontSize: "18px", color: color || "var(--hex-primary)" }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--hex-text-dim)]">{label}</span>
      </div>
      <div className="text-xl font-bold text-[var(--hex-text)]">{value ?? "—"}</div>
    </div>
  );
}

function PersonaSection({ section }: { section: ReportSection }) {
  const isDataGap = section.headline?.startsWith("DATA GAP:");

  return (
    <div className="mb-8 rounded-2xl border border-[var(--border-color)] overflow-hidden" style={{ background: "var(--hex-card-bg)" }}>
      {/* Section header */}
      <div className="px-6 py-4 border-b border-[var(--border-color)]"
        style={{ background: "linear-gradient(135deg, rgba(60,44,218,0.03), rgba(60,44,218,0.08))" }}>
        <h2 className="text-base font-bold text-[var(--hex-text)]">{section.persona}</h2>
        {section.department && (
          <span className="text-xs text-[var(--hex-text-dim)]">{section.department}</span>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Headline — DATA GAP as amber banner */}
        {section.headline && (
          isDataGap ? (
            <div className="rounded-xl p-4 border border-amber-300 flex items-start gap-3"
              style={{ background: "rgba(245,158,11,0.08)" }}>
              <span className="material-icons-outlined text-amber-500 mt-0.5" style={{ fontSize: "20px" }}>info</span>
              <div>
                <div className="text-xs font-bold text-amber-700 uppercase mb-1">Data Gap</div>
                <p className="text-sm text-[var(--hex-text)]">{section.headline}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--hex-text)] font-medium">{section.headline}</p>
          )
        )}

        {/* Key Metrics */}
        {section.key_metrics && section.key_metrics.length > 0 && !isDataGap && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--hex-text-dim)] uppercase tracking-wider mb-3">Key Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {section.key_metrics.map((m, i) => (
                <div key={i} className="rounded-lg border border-[var(--border-color)] p-3">
                  <div className="text-[10px] text-[var(--hex-text-dim)] uppercase truncate">{m.metric}</div>
                  <div className="text-lg font-bold text-[var(--hex-text)]">
                    {m.value != null ? String(m.value) : "—"}
                    {m.unit && <span className="text-xs font-normal ml-1">{m.unit}</span>}
                  </div>
                  {m.delta != null && (
                    <div className="text-xs" style={{ color: Number(m.delta) >= 0 ? "#10B981" : "#EF4444" }}>
                      {Number(m.delta) >= 0 ? "+" : ""}{String(m.delta)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Anomalies */}
        {section.anomalies && section.anomalies.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--hex-text-dim)] uppercase tracking-wider mb-3">Anomalies</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--hex-text-dim)] border-b border-[var(--border-color)]">
                    <th className="pb-2 pr-4">Anomaly</th>
                    <th className="pb-2 pr-4">Severity</th>
                    <th className="pb-2 pr-4">Regions</th>
                    <th className="pb-2">Deviation</th>
                  </tr>
                </thead>
                <tbody>
                  {section.anomalies.map((a, i) => (
                    <tr key={i} className="border-b border-[var(--border-color)]/50">
                      <td className="py-2 pr-4 text-[var(--hex-text)]">{a.anomaly}</td>
                      <td className="py-2 pr-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{
                            background: a.severity === "high" ? "rgba(239,68,68,0.1)" : a.severity === "medium" ? "rgba(249,115,22,0.1)" : "rgba(148,163,184,0.1)",
                            color: a.severity === "high" ? "#EF4444" : a.severity === "medium" ? "#F97316" : "#64748B",
                          }}>
                          {a.severity || "—"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-[var(--hex-text-dim)]">{a.regions?.join(", ") || "—"}</td>
                      <td className="py-2 text-[var(--hex-text)]">{a.deviation_pct != null ? `${a.deviation_pct}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Drivers */}
        {section.drivers && section.drivers.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--hex-text-dim)] uppercase tracking-wider mb-3">Drivers</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--hex-text-dim)] border-b border-[var(--border-color)]">
                    <th className="pb-2 pr-4">Driver</th>
                    <th className="pb-2 pr-4">Contribution</th>
                    <th className="pb-2">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {section.drivers.map((d, i) => (
                    <tr key={i} className="border-b border-[var(--border-color)]/50">
                      <td className="py-2 pr-4 text-[var(--hex-text)]">{d.driver}</td>
                      <td className="py-2 pr-4 text-[var(--hex-text)]">{d.contribution_pct != null ? `${d.contribution_pct}%` : "—"}</td>
                      <td className="py-2 text-[var(--hex-text)]">{d.confidence != null ? `${(d.confidence * 100).toFixed(0)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Risks */}
        {section.risks && section.risks.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--hex-text-dim)] uppercase tracking-wider mb-3">Risks</h4>
            <ul className="space-y-1.5">
              {section.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--hex-text)]">
                  <span className="text-red-400 mt-0.5">•</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Actions */}
        {section.recommended_actions && section.recommended_actions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--hex-text-dim)] uppercase tracking-wider mb-3">Recommended Actions</h4>
            <div className="space-y-3">
              {section.recommended_actions.map((a, i) => (
                <ActionCard key={i} action={a} />
              ))}
            </div>
          </div>
        )}

        {/* Trajectory */}
        {section.trajectory && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--hex-text-dim)] uppercase tracking-wider mb-3">Trajectory</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-[var(--border-color)] p-3">
                <div className="text-[10px] text-[var(--hex-text-dim)]">Peak Day</div>
                <div className="font-semibold text-[var(--hex-text)]">{section.trajectory.peak_day || "—"}</div>
              </div>
              <div className="rounded-lg border border-[var(--border-color)] p-3">
                <div className="text-[10px] text-[var(--hex-text-dim)]">Decay to Baseline</div>
                <div className="font-semibold text-[var(--hex-text)]">{section.trajectory.decay_to_baseline_day || "—"}</div>
              </div>
              <div className="rounded-lg border border-[var(--border-color)] p-3">
                <div className="text-[10px] text-[var(--hex-text-dim)]">Peak Deviation</div>
                <div className="font-semibold text-[var(--hex-text)]">{section.trajectory.peak_deviation_pct != null ? `${section.trajectory.peak_deviation_pct}%` : "—"}</div>
              </div>
              <div className="rounded-lg border border-[var(--border-color)] p-3">
                <div className="text-[10px] text-[var(--hex-text-dim)]">Day 7 Deviation</div>
                <div className="font-semibold text-[var(--hex-text)]">{section.trajectory.day7_deviation_pct != null ? `${section.trajectory.day7_deviation_pct}%` : "—"}</div>
              </div>
            </div>
          </div>
        )}

        {/* Caveats — ALWAYS shown */}
        {section.caveats && section.caveats.length > 0 && (
          <div className="rounded-xl p-4 border border-amber-200" style={{ background: "rgba(245,158,11,0.05)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-icons-outlined text-amber-500" style={{ fontSize: "16px" }}>warning</span>
              <span className="text-xs font-bold text-amber-700 uppercase">Caveats</span>
            </div>
            <ul className="space-y-1">
              {section.caveats.map((c, i) => (
                <li key={i} className="text-xs text-[var(--hex-text-dim)] flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">•</span>{c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: RecommendedAction }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] p-4">
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
          <span>Impact: <span className="font-semibold text-green-600">{formatUsd(action.impact_usd)}</span></span>
        )}
        {action.cost_usd != null && (
          <span>Cost: <span className="font-semibold text-[var(--hex-text)]">{formatUsd(action.cost_usd)}</span></span>
        )}
        {action.confidence != null && (
          <div className="flex items-center gap-1.5">
            <span>Confidence:</span>
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(action.confidence * 100)}%`, background: "var(--hex-primary)" }} />
            </div>
            <span className="font-mono">{(action.confidence * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
