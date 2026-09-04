"use client";

import { useState, useEffect, useRef } from "react";
import type { PlanningData } from "@/lib/api";
import HexagonProgress from "@/components/common/HexagonProgress";

interface Props {
  planning: PlanningData | null;
  defaultCollapsed?: boolean;
  progressive?: boolean;
  feedbackStep?: boolean;
  onAllRevealed?: () => void;
}

const BASE_STEPS = [
  { key: "intent",         label: "Intent Classification",  icon: "psychology",    desc: "Understanding what you're asking and categorizing the type of analysis needed" },
  { key: "sub_tasks",      label: "Sub-tasks Breakdown",     icon: "account_tree",  desc: "Breaking your question into smaller executable queries and data lookups" },
  { key: "kpis",           label: "KPIs in Scope",           icon: "speed",         desc: "Identifying relevant metrics like forecast accuracy, demand signals, inventory levels, and lead times" },
  { key: "visualizations", label: "Visualizations Planned",  icon: "insert_chart",  desc: "Selecting the best chart types and data views to present results clearly" },
];

const FEEDBACK_STEP = { key: "feedback", label: "Working on Feedback", icon: "rate_review", desc: "Incorporating your feedback and re-running the analysis with adjusted parameters" };

const STEP_MIN_MS = 15000;
const STEP_MAX_MS = 20000;
const FINISH_STEP_MS = 350;
const HEX_LOOP_CYCLE_MS = 2400;

const randomStepMs = () =>
  STEP_MIN_MS + Math.floor(Math.random() * (STEP_MAX_MS - STEP_MIN_MS + 1));

export default function ThinkingCard({
  planning,
  defaultCollapsed = false,
  progressive = false,
  feedbackStep = false,
  onAllRevealed,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const steps = feedbackStep ? [...BASE_STEPS, FEEDBACK_STEP] : BASE_STEPS;
  const totalSteps = steps.length;

  const [activeStep, setActiveStep] = useState<number>(progressive ? 0 : totalSteps);
  const finishedRef = useRef(false);
  const stepDurationsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!progressive) {
      setActiveStep(totalSteps);
      return;
    }
    setActiveStep(0);
    finishedRef.current = false;
    stepDurationsRef.current = Array.from({ length: totalSteps }, randomStepMs);

    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    for (let i = 0; i < totalSteps - 1; i++) {
      elapsed += stepDurationsRef.current[i];
      timers.push(
        setTimeout(() => {
          setActiveStep((prev) => Math.max(prev, i + 1));
        }, elapsed),
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [progressive, totalSteps]);

  useEffect(() => {
    if (!progressive || !planning) return;

    if (activeStep >= totalSteps) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onAllRevealed?.();
      }
      return;
    }

    const t = setTimeout(() => {
      setActiveStep((prev) => Math.min(prev + 1, totalSteps));
    }, FINISH_STEP_MS);
    return () => clearTimeout(t);
  }, [progressive, planning, activeStep, totalSteps, onAllRevealed]);

  const getStepValue = (key: string): string | null => {
    if (!planning) return null;
    switch (key) {
      case "intent":         return planning.intent ? `${planning.intent}${planning.confidence ? ` (${Math.round(planning.confidence * 100)}% confidence)` : ""}` : null;
      case "sub_tasks":      return planning.sub_tasks?.join(" → ") || null;
      case "kpis":           return planning.kpis?.join(", ") || null;
      case "visualizations": {
        const parts: string[] = [];
        if (planning.recommended_chart) parts.push(`Chart: ${planning.recommended_chart}`);
        if (planning.viz_rationale) parts.push(planning.viz_rationale);
        if (!parts.length && planning.visualizations) return planning.visualizations.join(", ");
        return parts.join(" — ") || null;
      }
      case "feedback":       return "Incorporating your feedback and re-analyzing...";
      default:               return null;
    }
  };

  const tools = planning?.tools_called || [];
  const TOOL_DISPLAY_NAMES: Record<string, string> = {
    // MCP tools (all naming variants the agent might use)
    "demandsensing_mcp_server_get_national_inflation_cpi": "Inflation (CPI)",
    "demandsensing_mcp_server_get_state_unemployment_rate": "Unemployment (State)",
    "demandsensing_mcp_server_get_national_cost_of_living_index": "Cost of Living",
    "demandsensing_mcp_server_get_national_consumer_confidence_index": "Consumer Confidence",
    "MCP:get_national_inflation_cpi": "Inflation (CPI)",
    "MCP:get_state_unemployment_rate": "Unemployment (State)",
    "MCP:get_national_cost_of_living_index": "Cost of Living",
    "MCP:get_national_consumer_confidence_index": "Consumer Confidence",
    "get_national_inflation_cpi": "Inflation (CPI)",
    "get_state_unemployment_rate": "Unemployment (State)",
    "get_national_cost_of_living_index": "Cost of Living",
    "get_national_consumer_confidence_index": "Consumer Confidence",
    // Core tools
    "DemandSensingAnalyst": "Analyst",
    "classify_intent": "Intent",
    "system_execute_sql": "SQL",
    "PLOTLY_DEMANDSENSING": "Chart",
    "DemandSensingRAG": "RAG Search",
    "PythonSandbox": "Python",
    "Run_ML_Tasks": "ML Engine",
  };
  const toolNames = [...new Set(tools.map((t) => TOOL_DISPLAY_NAMES[t.name] || t.name))].join(", ");
  const allDone = activeStep >= totalSteps;
  const allRevealed = allDone && (planning !== null || !progressive);

  return (
    <div
      className="rounded-xl border border-[var(--border-color)] overflow-hidden mb-3 animate-scale-in w-full min-w-[400px]"
      style={{ background: "linear-gradient(to bottom, var(--hex-surface-1), var(--hex-surface-2))" }}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--hex-surface-hover)] transition-colors cursor-pointer border-none bg-transparent"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--hex-primary)", color: "white" }}
        >
          <span className="material-icons-outlined" style={{ fontSize: "14px" }}>auto_awesome</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[var(--hex-text)]">Thinking &amp; Planning</div>
          <div className="text-[10px] text-[var(--hex-text-muted)]">
            {!allRevealed ? (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--hex-accent)] animate-pulse" />
                Executing step {Math.min(activeStep + 1, totalSteps)} of {totalSteps}...
              </span>
            ) : (
              <>
                {totalSteps} steps completed
                {planning?.thinking_time ? ` · ${planning.thinking_time.toFixed(1)}s` : ""}
                {planning?.sql_count ? ` · ${planning.sql_count} SQL statements` : ""}
              </>
            )}
          </div>
        </div>
        <span
          className="material-icons-outlined text-[var(--hex-text-muted)] transition-transform duration-200"
          style={{ fontSize: "18px", transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}
        >
          expand_more
        </span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2 animate-fade-in">
          {steps.map((step, i) => {
            const isProcessing = i === activeStep && !allDone;
            const isDone       = i < activeStep || allDone;
            const value        = isDone ? getStepValue(step.key) : null;

            const hexFillColor  = isDone ? "var(--hex-accent)" : "var(--hex-primary)";
            const hexTrackColor = "var(--hex-surface-3, rgba(120,130,145,0.25))";

            return (
              <div
                key={step.key}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-white/60 transition-all duration-300 opacity-100"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <HexagonProgress
                    progress={isDone ? 100 : 0}
                    loop={isProcessing}
                    loopCycleMs={HEX_LOOP_CYCLE_MS}
                    size={26}
                    strokeWidth={70}
                    fillColor={hexFillColor}
                    trackColor={hexTrackColor}
                    transitionMs={250}
                    ariaLabel={`Step ${i + 1}: ${isDone ? "done" : isProcessing ? "processing" : "waiting"}`}
                  >
                    {isDone ? (
                      <span
                        className="material-icons-outlined"
                        style={{ fontSize: "12px", color: "var(--hex-accent)" }}
                      >
                        check
                      </span>
                    ) : (
                      <span
                        className="text-[9px] font-bold"
                        style={{ color: isProcessing ? "var(--hex-primary)" : "var(--hex-text-muted)" }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </HexagonProgress>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-[var(--hex-text)] flex items-center gap-1.5">
                    <span className="material-icons-outlined" style={{ fontSize: "13px", color: "var(--hex-primary)" }}>
                      {step.icon}
                    </span>
                    {step.label}
                  </div>
                  <div className="text-[10px] text-[var(--hex-text-muted)] mt-0.5 leading-relaxed">
                    {step.desc}
                  </div>
                  {value && (
                    <div className="text-[11px] text-[var(--hex-text-dim)] mt-1 leading-relaxed font-medium animate-fade-in">
                      {value}
                    </div>
                  )}
                  {isProcessing && (
                    <div className="text-[10px] text-[var(--hex-accent)] mt-1 italic flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--hex-accent)] animate-pulse" />
                      Processing...
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {toolNames && allRevealed && (
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[var(--hex-primary)]/5 text-[10px] text-[var(--hex-primary)] animate-fade-in">
              <span className="material-icons-outlined" style={{ fontSize: "13px" }}>smart_toy</span>
              <span className="font-medium">Tools: {toolNames}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
