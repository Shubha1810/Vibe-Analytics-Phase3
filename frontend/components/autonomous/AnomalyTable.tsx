"use client";

import React, { useMemo } from "react";
import type { AnomalyRow } from "@/lib/orchestration-types";
import { HowToReadIt } from "./HowToReadIt";
import { ChartExplainer } from "./ChartExplainer";

interface AnomalyTableProps {
  data: AnomalyRow[];
  narrative?: string | null;
}

const severityColors: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: "rgba(220,38,38,0.15)", text: "#DC2626" },
  HIGH: { bg: "rgba(220,38,38,0.12)", text: "#DC2626" },
  MEDIUM: { bg: "rgba(245,158,11,0.12)", text: "#F59E0B" },
  LOW: { bg: "rgba(99,102,241,0.12)", text: "#6366F1" },
};

function formatUSD(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

const HOW_TO_READ = [
  "Auto-ranked by 11-day revenue impact, largest first.",
  "Deviation % = how far actual demand is from the forecast baseline.",
  "Days = how long the deviation has persisted.",
  "Direction: Over = demand exceeding forecast (opportunity), Under = falling short (markdown risk).",
  "Confidence reflects how many independent signals confirm the anomaly.",
];

export function AnomalyTable({ data, narrative }: AnomalyTableProps) {
  const footerStats = useMemo(() => {
    if (data.length < 3) return null;
    const top3Impact = data.slice(0, 3).reduce((s, r) => s + r.value_at_risk, 0);
    const totalImpact = data.reduce((s, r) => s + r.value_at_risk, 0);
    const pct = totalImpact > 0 ? ((top3Impact / totalImpact) * 100).toFixed(0) : "0";
    return { top3Impact, pct, total: data.length };
  }, [data]);

  if (!data.length)
    return <div className="text-sm opacity-60 p-4">No anomaly data available.</div>;

  return (
    <div>
      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: "rgba(124,58,237,0.1)", color: "var(--hex-primary, #7c3aed)" }}
        >
          {data.length} SKUs flagged
        </span>
        <span
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
        >
          {data.filter((r) => r.severity === "CRITICAL" || r.severity === "HIGH").length} high-impact
        </span>
        <span
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: "rgba(234,179,8,0.1)", color: "#eab308" }}
        >
          {data.filter((r) => r.severity === "MEDIUM").length} medium-impact
        </span>
        <span
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
        >
          {data.filter((r) => Math.abs(r.deviation_pct) <= 10).length} within ±10%
        </span>
      </div>

      <div className="flex gap-4 max-lg:flex-col">
        {/* Table */}
        <div
          className="flex-1 rounded-xl border overflow-hidden"
          style={{
            borderColor: "var(--hex-border, #334155)",
            background: "var(--hex-surface-1, #1e293b)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Rank", "Sub-Category", "Region(s)", "Deviation", "Impact", "Days", "Direction", "Confidence"].map(
                    (h) => (
                      <th
                        key={h}
                        className={`px-3 py-2.5 font-semibold ${
                          ["Deviation", "Impact", "Days", "Confidence"].includes(h) ? "text-right" : "text-left"
                        } ${h === "Direction" ? "text-center" : ""}`}
                        style={{ color: "var(--hex-text-secondary, #94a3b8)" }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const isTop3 = i < 3;
                  const isOver = row.deviation_pct > 0;
                  const confLabel = row.confidence >= 0.8 ? "High" : row.confidence >= 0.5 ? "Medium" : "Low";
                  const confColor = row.confidence >= 0.8 ? "#22c55e" : row.confidence >= 0.5 ? "#F59E0B" : "#6366F1";
                  return (
                    <tr
                      key={i}
                      style={isTop3 ? { background: "rgba(124,58,237,0.06)" } : undefined}
                      className="border-t"
                    >
                      <td
                        className="px-3 py-2 font-mono text-xs"
                        style={{
                          color: "var(--hex-text-secondary, #94a3b8)",
                          borderColor: "var(--hex-border, #334155)",
                        }}
                      >
                        {i + 1}
                      </td>
                      <td
                        className="px-3 py-2 font-medium"
                        style={{
                          color: "var(--hex-text, #e2e8f0)",
                          borderColor: "var(--hex-border, #334155)",
                        }}
                      >
                        {row.category}
                      </td>
                      <td
                        className="px-3 py-2"
                        style={{
                          color: "var(--hex-text, #e2e8f0)",
                          borderColor: "var(--hex-border, #334155)",
                        }}
                      >
                        {row.region}
                      </td>
                      <td
                        className="px-3 py-2 text-right font-mono"
                        style={{
                          color: isOver ? "#ef4444" : "#3b82f6",
                          borderColor: "var(--hex-border, #334155)",
                        }}
                      >
                        {isOver ? "\u2191" : "\u2193"} {isOver ? "+" : ""}
                        {row.deviation_pct.toFixed(1)}%
                      </td>
                      <td
                        className="px-3 py-2 text-right font-mono"
                        style={{
                          color: "var(--hex-text, #e2e8f0)",
                          borderColor: "var(--hex-border, #334155)",
                        }}
                      >
                        {formatUSD(row.value_at_risk)}
                      </td>
                      <td
                        className="px-3 py-2 text-right font-mono"
                        style={{
                          color: "var(--hex-text, #e2e8f0)",
                          borderColor: "var(--hex-border, #334155)",
                        }}
                      >
                        {row.days_to_impact}
                      </td>
                      <td
                        className="px-3 py-2 text-center"
                        style={{ borderColor: "var(--hex-border, #334155)" }}
                      >
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          title={isOver ? "Demand exceeding forecast" : "Demand falling short of forecast"}
                          style={{
                            background: isOver ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.12)",
                            color: isOver ? "#ef4444" : "#3b82f6",
                          }}
                        >
                          {isOver ? "Over" : "Under"}
                        </span>
                      </td>
                      <td
                        className="px-3 py-2 text-right"
                        style={{ borderColor: "var(--hex-border, #334155)" }}
                      >
                        <span className="font-mono text-xs" style={{ color: confColor }} title={`Confidence: ${confLabel}`}>
                          {confLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          {footerStats && (
            <div
              className="px-4 py-2.5 text-xs"
              style={{
                background: "var(--hex-surface-2, #0f172a)",
                color: "var(--hex-text-secondary, #94a3b8)",
                borderTop: "1px solid var(--hex-border, #334155)",
              }}
            >
              Top 3 anomalies represent{" "}
              <span className="font-semibold" style={{ color: "var(--hex-text, #e2e8f0)" }}>
                {footerStats.pct}%
              </span>{" "}
              of total revenue impact across the {footerStats.total} flagged items
            </div>
          )}
        </div>

        {/* HOW TO READ IT sidebar */}
        <HowToReadIt bullets={HOW_TO_READ} />
      </div>

      <ChartExplainer narrative={narrative} />
    </div>
  );
}
