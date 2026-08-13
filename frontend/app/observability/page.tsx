"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import type { ObservabilityAgent, ObservabilityThread, ThreadDetail } from "@/lib/api";
import { cn } from "@/lib/utils";
import ThreadList from "@/components/observability/ThreadList";
import SpanTree from "@/components/observability/SpanTree";

const MODULES = ["Interactive", "Autonomous"] as const;
const TIME_PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

// Fallback agent config — used if backend /api/observability/agents is unavailable
const DEFAULT_AGENTS: Record<string, Record<string, ObservabilityAgent[]>> = {
  "Demand Analyst": {
    Interactive: [
      { name: "INTERACTIVE_DEMANDSENSING_AGENT", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_AI", display_name: "Interactive Demand Sensing Agent" },
      { name: "BA_SUB_ORCHESTRATOR_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "BA Sub-Orchestrator" },
      { name: "DATA_GATHERING_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Data Gathering Agent" },
      { name: "DIMENSIONAL_ANALYSIS_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Dimensional Analysis Agent" },
      { name: "DS_SUB_ORCHESTRATOR_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "DS Sub-Orchestrator" },
      { name: "FEATURE_ENHANCEMENT_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Feature Enhancement Agent" },
      { name: "INSIGHTS_NARRATION_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Insights Narration Agent" },
      { name: "PERSONA_CONTEXT_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Persona Context Agent" },
      { name: "PREDICTIVE_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Predictive Agent" },
      { name: "PRESCRIPTIVE_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Prescriptive Agent" },
      { name: "ROOT_CAUSE_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Root Cause Agent" },
      { name: "TREND_DISCOVERY_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Trend Discovery Agent" },
      { name: "VALIDATION_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Validation Agent" },
      { name: "VISUALIZATION_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Visualization Agent" },
    ],
    Autonomous: [
      { name: "MASTER_ORCHESTRATOR_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Master Orchestrator" },
      { name: "BA_SUB_ORCHESTRATOR_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "BA Sub-Orchestrator" },
      { name: "DATA_GATHERING_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Data Gathering Agent" },
      { name: "DIMENSIONAL_ANALYSIS_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Dimensional Analysis Agent" },
      { name: "DS_SUB_ORCHESTRATOR_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "DS Sub-Orchestrator" },
      { name: "FEATURE_ENHANCEMENT_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Feature Enhancement Agent" },
      { name: "INSIGHTS_NARRATION_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Insights Narration Agent" },
      { name: "PERSONA_CONTEXT_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Persona Context Agent" },
      { name: "PREDICTIVE_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Predictive Agent" },
      { name: "PRESCRIPTIVE_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Prescriptive Agent" },
      { name: "ROOT_CAUSE_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Root Cause Agent" },
      { name: "TREND_DISCOVERY_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Trend Discovery Agent" },
      { name: "VALIDATION_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Validation Agent" },
      { name: "VISUALIZATION_AGENT_DEMANDSENSING", database: "DEMANDSENSING_AI", schema: "DEMANDSENSING_SCHEMA", display_name: "Visualization Agent" },
    ],
  },
};

export default function ObservabilityPage() {
  const { persona } = useApp();

  // Selection state
  const [selectedModule, setSelectedModule] = useState<string>("Interactive");
  const [agents, setAgents] = useState<Record<string, Record<string, ObservabilityAgent[]>>>({});
  const [selectedAgent, setSelectedAgent] = useState<ObservabilityAgent | null>(null);
  const [days, setDays] = useState(30);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Data state
  const [threads, setThreads] = useState<ObservabilityThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  // Load agents config — fallback to hardcoded defaults if API unavailable
  useEffect(() => {
    api.getObservabilityAgents()
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setAgents(data);
        } else {
          setAgents(DEFAULT_AGENTS);
        }
      })
      .catch(() => {
        setAgents(DEFAULT_AGENTS);
      });
  }, []);

  // Auto-select first agent when persona/module changes
  useEffect(() => {
    const moduleAgents = agents[persona]?.[selectedModule];
    if (moduleAgents && moduleAgents.length > 0) {
      setSelectedAgent(moduleAgents[0]);
    } else {
      setSelectedAgent(null);
    }
    setThreadDetail(null);
  }, [persona, selectedModule, agents]);

  // Fetch threads when agent or time range changes
  const fetchThreads = useCallback(async () => {
    if (!selectedAgent) {
      setThreads([]);
      return;
    }
    setThreadsLoading(true);
    setError("");
    try {
      const data = await api.getObservabilityThreads(
        selectedAgent.name,
        selectedAgent.schema,
        selectedAgent.database,
        days
      );
      setThreads(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load threads");
      setThreads([]);
    } finally {
      setThreadsLoading(false);
    }
  }, [selectedAgent, days]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Load thread detail
  const handleThreadSelect = async (thread: ObservabilityThread) => {
    if (!selectedAgent || !thread.record_id) return;
    setDetailLoading(true);
    setError("");
    try {
      const detail = await api.getObservabilityThreadDetail(
        thread.record_id,
        selectedAgent.name,
        selectedAgent.schema,
        selectedAgent.database
      );
      setThreadDetail(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load thread detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const availableAgents = agents[persona]?.[selectedModule] || [];

  return (
    <div className="p-6 animate-fade-in">
      {/* Header Banner */}
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a237e 0%, #3C2CDA 30%, #42a5f5 70%, #80d8ff 100%)",
          boxShadow: "0 4px 20px rgba(26,35,126,0.35)",
        }}>
        {/* Decorative shapes */}
        <div className="absolute top-0 left-12 w-24 h-full opacity-[0.14]"
          style={{ background: "repeating-linear-gradient(60deg, white 0px, white 2px, transparent 2px, transparent 14px)" }} />
        <div className="absolute -top-4 -left-4 w-20 h-20 opacity-[0.16]"
          style={{ background: "white", transform: "rotate(45deg)", borderRadius: "6px" }} />
        <div className="absolute -bottom-3 left-1/3 w-14 h-14 opacity-[0.12]"
          style={{ background: "white", transform: "rotate(45deg)", borderRadius: "4px" }} />
        {/* Snowflake accents */}
        <svg className="absolute top-2 left-32 opacity-[0.22]" width="28" height="28" viewBox="0 0 32 32" fill="none">
          <path d="M16 2v28M2 16h28M5.86 5.86l20.28 20.28M26.14 5.86L5.86 26.14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="16" cy="6" r="2" fill="white"/><circle cx="16" cy="26" r="2" fill="white"/>
          <circle cx="6" cy="16" r="2" fill="white"/><circle cx="26" cy="16" r="2" fill="white"/>
          <circle cx="8.5" cy="8.5" r="1.5" fill="white"/><circle cx="23.5" cy="23.5" r="1.5" fill="white"/>
          <circle cx="23.5" cy="8.5" r="1.5" fill="white"/><circle cx="8.5" cy="23.5" r="1.5" fill="white"/>
        </svg>
        <svg className="absolute bottom-1.5 left-[18%] opacity-[0.16]" width="20" height="20" viewBox="0 0 32 32" fill="none">
          <path d="M16 2v28M2 16h28M5.86 5.86l20.28 20.28M26.14 5.86L5.86 26.14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="16" cy="5" r="2" fill="white"/><circle cx="16" cy="27" r="2" fill="white"/>
          <circle cx="5" cy="16" r="2" fill="white"/><circle cx="27" cy="16" r="2" fill="white"/>
        </svg>
        <svg className="absolute top-1 left-[48%] opacity-[0.12]" width="16" height="16" viewBox="0 0 32 32" fill="none">
          <path d="M16 2v28M2 16h28M5.86 5.86l20.28 20.28M26.14 5.86L5.86 26.14" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <svg className="absolute top-0.5 left-4 opacity-[0.18]" width="22" height="22" viewBox="0 0 32 32" fill="none">
          <path d="M16 4v24M4 16h24M8 8l16 16M24 8L8 24" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="16" cy="7" r="1.5" fill="white"/><circle cx="16" cy="25" r="1.5" fill="white"/>
          <circle cx="7" cy="16" r="1.5" fill="white"/><circle cx="25" cy="16" r="1.5" fill="white"/>
        </svg>
        <svg className="absolute top-3 left-[40%] opacity-[0.14]" width="24" height="24" viewBox="0 0 32 32" fill="none">
          <path d="M16 3v26M3 16h26M7 7l18 18M25 7L7 25" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="16" cy="6" r="1.5" fill="white"/><circle cx="16" cy="26" r="1.5" fill="white"/>
          <circle cx="6" cy="16" r="1.5" fill="white"/><circle cx="26" cy="16" r="1.5" fill="white"/>
          <circle cx="9" cy="9" r="1" fill="white"/><circle cx="23" cy="23" r="1" fill="white"/>
          <circle cx="23" cy="9" r="1" fill="white"/><circle cx="9" cy="23" r="1" fill="white"/>
        </svg>
        {/* Header content */}
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="1.5"/>
              <path d="M14.5 9.5l3-3m0 0h-2.2m2.2 0v2.2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold mb-0.5 tracking-tight">Observability Cockpit <span className="text-white/50 text-sm font-normal ml-1">aka AI Observability</span></h2>
            <p className="text-white/60 text-[11px] m-0">Monitor agent conversations, trace execution spans, and inspect tool calls</p>
          </div>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
        {/* Module Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mr-1">Module</span>
          {MODULES.map((mod) => (
            <button
              key={mod}
              onClick={() => { setSelectedModule(mod); setThreadDetail(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                selectedModule === mod
                  ? "bg-[#3C2CDA] text-white shadow-sm"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[#3C2CDA]/10"
              )}
            >
              {mod}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-[var(--border-color)]" />

        {/* Agent Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mr-1">Agent</span>
          <select
            value={selectedAgent?.name || ""}
            onChange={(e) => {
              const agent = availableAgents.find((a) => a.name === e.target.value);
              setSelectedAgent(agent || null);
              setThreadDetail(null);
            }}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[#3C2CDA]/30"
          >
            {availableAgents.map((a) => (
              <option key={a.name} value={a.name}>
                {a.display_name}
              </option>
            ))}
            {availableAgents.length === 0 && (
              <option value="">No agents available</option>
            )}
          </select>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-[var(--border-color)]" />

        {/* Time Range */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mr-1">Range</span>
          {TIME_PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                days === p.days
                  ? "bg-[#3C2CDA] text-white shadow-sm"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[#3C2CDA]/10"
              )}
            >
              {p.label}
            </button>
          ))}
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1 rounded-lg text-[11px] bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] w-[110px]"
            placeholder="Start"
          />
          <span className="text-[var(--text-muted)] text-[11px]">&ndash;</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1 rounded-lg text-[11px] bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] w-[110px]"
            placeholder="End"
          />
        </div>

        {/* Refresh */}
        <button
          onClick={fetchThreads}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[#3C2CDA]/10 transition-colors"
        >
          <span className="material-icons-outlined" style={{ fontSize: "14px" }}>refresh</span>
          Refresh
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-[13px] flex items-center gap-2">
          <span className="material-icons-outlined" style={{ fontSize: "16px" }}>error</span>
          {error}
        </div>
      )}

      {/* Thread Detail View */}
      {threadDetail ? (
        <div className="animate-fade-in">
          {/* Back button + header */}
          <div className="flex items-start gap-3 mb-4">
            <button
              onClick={() => setThreadDetail(null)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[#3C2CDA]/10 transition-colors flex-shrink-0"
            >
              <span className="material-icons-outlined" style={{ fontSize: "14px" }}>arrow_back</span>
              Back
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">
                {threadDetail.user_question || "Agent Conversation"}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Record: {threadDetail.record_id} &middot; {threadDetail.spans.length} spans
              </p>
            </div>
          </div>

          {/* Span Tree */}
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] mb-5">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <span className="material-icons-outlined text-[#3C2CDA]" style={{ fontSize: "16px" }}>account_tree</span>
              Execution Trace
            </h3>
            <SpanTree spans={threadDetail.spans} />
          </div>

          {/* Agent Response */}
          {threadDetail.agent_response && (
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <span className="material-icons-outlined text-[#3C2CDA]" style={{ fontSize: "16px" }}>smart_toy</span>
                Agent Response
              </h3>
              <div className="text-[13px] text-[var(--text-secondary)] whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-relaxed">
                {threadDetail.agent_response}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Thread List View */
        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <span className="material-icons-outlined text-[#3C2CDA]" style={{ fontSize: "16px" }}>forum</span>
              Conversation Threads
              {!threadsLoading && (
                <span className="text-[11px] font-normal text-[var(--text-muted)]">
                  ({threads.length} results)
                </span>
              )}
            </h3>
          </div>
          <ThreadList
            threads={threads}
            loading={threadsLoading}
            onSelect={handleThreadSelect}
          />
        </div>
      )}

      {/* Detail Loading Overlay */}
      {detailLoading && (
        <div className="fixed inset-0 bg-black/10 z-50 flex items-center justify-center">
          <div className="bg-[var(--card-bg)] p-6 rounded-xl shadow-xl border border-[var(--border-color)] flex items-center gap-3">
            <span className="material-icons-outlined animate-spin text-[#3C2CDA]" style={{ fontSize: "24px" }}>
              progress_activity
            </span>
            <span className="text-sm text-[var(--text-primary)]">Loading trace details...</span>
          </div>
        </div>
      )}
    </div>
  );
}
