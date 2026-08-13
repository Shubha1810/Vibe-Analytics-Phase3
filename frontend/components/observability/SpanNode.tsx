"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TraceSpan } from "@/lib/api";

function getSpanIcon(spanName: string): string {
  if (spanName.startsWith("ReasoningAgentStepPlanning")) return "psychology";
  if (spanName.startsWith("ReasoningAgentStepResponseGeneration")) return "edit_note";
  if (spanName.startsWith("ToolCall")) return "build";
  if (spanName.startsWith("SqlExecution")) return "storage";
  if (spanName.startsWith("SystemExecuteSQLTool")) return "code";
  if (spanName.startsWith("SemanticContextTool")) return "auto_awesome";
  if (spanName.startsWith("CortexAnalystTool")) return "analytics";
  if (spanName.startsWith("CortexChartTool")) return "bar_chart";
  if (spanName === "Agent") return "smart_toy";
  if (spanName === "AgentV2RequestResponseInfo") return "info";
  if (spanName === "CORTEX_AGENT_REQUEST") return "input";
  return "circle";
}

function getSpanLabel(span: TraceSpan): string {
  if (span.tool_name) return `Tool: ${span.tool_name}`;
  const name = span.span_name;
  if (name.startsWith("ReasoningAgentStepPlanning-")) {
    const step = name.replace("ReasoningAgentStepPlanning-", "");
    return `Planning Step ${parseInt(step) + 1}`;
  }
  if (name.startsWith("ReasoningAgentStepResponseGeneration-")) {
    const step = name.replace("ReasoningAgentStepResponseGeneration-", "");
    return `Response Generation ${parseInt(step) + 1}`;
  }
  if (name.startsWith("ToolCall-")) return `Tool: ${name.replace("ToolCall-", "")}`;
  if (name.startsWith("SqlExecution_")) return `SQL: ${name.replace("SqlExecution_", "")}`;
  if (name === "SqlExecution") return "SQL Execution";
  if (name.startsWith("SystemExecuteSQLTool_")) return `SQL Tool: ${name.replace("SystemExecuteSQLTool_", "")}`;
  if (name.startsWith("SemanticContextTool_")) return `Semantic: ${name.replace("SemanticContextTool_", "")}`;
  if (name.startsWith("CortexAnalystTool_")) return `Analyst: ${name.replace("CortexAnalystTool_", "")}`;
  if (name === "Agent") return "Agent Execution";
  if (name === "AgentV2RequestResponseInfo") return "Request/Response";
  if (name === "CORTEX_AGENT_REQUEST") return "Agent Request";
  return name;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface SpanNodeProps {
  span: TraceSpan;
  depth: number;
  children?: React.ReactNode;
}

export default function SpanNode({ span, depth, children }: SpanNodeProps) {
  const [sqlExpanded, setSqlExpanded] = useState(false);
  const icon = getSpanIcon(span.span_name);
  const label = getSpanLabel(span);
  const duration = formatDuration(span.duration_ms);
  const isError = span.sql_status === "ERROR" || span.status_code !== "STATUS_CODE_OK";
  const hasSql = !!span.sql_query;

  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-start gap-2 px-3 py-2 rounded-lg border transition-colors",
          isError
            ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
            : "border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[#3C2CDA]/30"
        )}
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <span
          className={cn(
            "material-icons-outlined mt-0.5 flex-shrink-0",
            isError ? "text-red-500" : "text-[#3C2CDA]"
          )}
          style={{ fontSize: "18px" }}
        >
          {icon}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
              {label}
            </span>
            {duration && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#3C2CDA]/10 text-[#3C2CDA] font-mono flex-shrink-0">
                {duration}
              </span>
            )}
            {isError && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 flex-shrink-0">
                ERROR
              </span>
            )}
            {span.sql_status === "SUCCESS" && span.sql_query && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 flex-shrink-0">
                SUCCESS
              </span>
            )}
          </div>

          {hasSql && (
            <button
              onClick={() => setSqlExpanded(!sqlExpanded)}
              className="text-[11px] text-[#3C2CDA] hover:underline mt-1 flex items-center gap-0.5"
            >
              <span className="material-icons-outlined" style={{ fontSize: "12px" }}>
                {sqlExpanded ? "expand_less" : "expand_more"}
              </span>
              {sqlExpanded ? "Hide SQL" : "Show SQL"}
            </button>
          )}

          {sqlExpanded && span.sql_query && (
            <pre className="mt-1.5 p-2 rounded bg-slate-100 dark:bg-slate-900 text-[11px] font-mono text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
              {span.sql_query}
            </pre>
          )}

          {sqlExpanded && span.sql_error_desc && (
            <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
              {span.sql_error_desc}
            </p>
          )}
        </div>

        <span className="text-[10px] text-[var(--text-muted)] font-mono flex-shrink-0 mt-0.5">
          {span.timestamp ? new Date(span.timestamp.replace(/"/g, "")).toLocaleTimeString() : ""}
        </span>
      </div>

      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
