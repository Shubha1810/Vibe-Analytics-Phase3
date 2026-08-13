"use client";

import { cn } from "@/lib/utils";
import type { ObservabilityThread } from "@/lib/api";

interface ThreadListProps {
  threads: ObservabilityThread[];
  loading: boolean;
  onSelect: (thread: ObservabilityThread) => void;
}

function formatTimestamp(ts: string): string {
  if (!ts) return "";
  const d = new Date(ts.replace(/"/g, ""));
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default function ThreadList({ threads, loading, onSelect }: ThreadListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <span className="material-icons-outlined animate-spin" style={{ fontSize: "20px" }}>
            progress_activity
          </span>
          <span className="text-sm">Loading conversation threads...</span>
        </div>
      </div>
    );
  }

  if (!threads.length) {
    return (
      <div className="text-center py-16">
        <span className="material-icons-outlined text-[var(--text-muted)]" style={{ fontSize: "48px" }}>
          chat_bubble_outline
        </span>
        <p className="mt-3 text-[var(--text-muted)] text-sm">
          No conversation threads found for the selected time range.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_120px_80px_80px_80px_60px] gap-2 px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
        <span>Query</span>
        <span>Time</span>
        <span>Duration</span>
        <span>Spans</span>
        <span>Tools</span>
        <span>Status</span>
      </div>

      {/* Thread rows */}
      {threads.map((thread) => (
        <button
          key={thread.record_id}
          onClick={() => onSelect(thread)}
          className={cn(
            "w-full grid grid-cols-[1fr_120px_80px_80px_80px_60px] gap-2 px-3 py-3 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-left transition-all duration-150",
            "hover:border-[#3C2CDA]/40 hover:shadow-sm hover:bg-[#3C2CDA]/[0.02]",
            "focus:outline-none focus:ring-2 focus:ring-[#3C2CDA]/30"
          )}
        >
          <span className="text-[13px] text-[var(--text-primary)] truncate font-medium">
            {thread.user_question || "(No question recorded)"}
          </span>
          <span className="text-[12px] text-[var(--text-secondary)] font-mono">
            {formatTimestamp(thread.timestamp)}
          </span>
          <span className="text-[12px] text-[var(--text-secondary)] font-mono">
            {formatDuration(thread.duration_ms)}
          </span>
          <span className="text-[12px] text-[var(--text-secondary)] font-mono">
            {thread.total_spans}
          </span>
          <span className="text-[12px] text-[var(--text-secondary)] font-mono">
            {thread.tool_calls_count}
          </span>
          <span>
            <span
              className={cn(
                "inline-block w-2 h-2 rounded-full",
                thread.status === "success" ? "bg-green-500" : "bg-red-500"
              )}
            />
          </span>
        </button>
      ))}
    </div>
  );
}
