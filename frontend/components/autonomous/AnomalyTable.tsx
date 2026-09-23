"use client";

import React, { useMemo, useState } from "react";
import type { AnomalyRow } from "@/lib/orchestration-types";
import { HowToReadIt } from "./HowToReadIt";
import { ChartExplainer } from "./ChartExplainer";

interface AnomalyTableProps {
  data: AnomalyRow[];
  narrative?: string | null;
  vizNumber?: string;
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

const dropdownStyle: React.CSSProperties = {
  background: "var(--hex-surface-2, #0f172a)",
  color: "var(--hex-text, #e2e8f0)",
  border: "1px solid var(--hex-border, #334155)",
  borderRadius: "8px",
  padding: "6px 12px",
  fontSize: "13px",
  cursor: "pointer",
  minWidth: "180px",
};

const HOW_TO_READ = [
  "Auto-ranked by 11-day revenue impact, largest first.",
  "Demand Deviation % = how far actual demand is from the forecast baseline.",
  "Direction: Over Forecast = demand exceeding forecast (stockout risk), Under Forecast = falling short (markdown risk).",
  "Days = how long the deviation has persisted.",
  "Confidence reflects how many independent signals confirm the anomaly.",
];

interface AggregatedRow {
  label: string;
  regionCount: number;
  regionNames: string;
  severity: string;
  deviation_pct: number;
  value_at_risk: number;
  units_at_risk: number;
  days_to_impact: number;
  confidence: number;
  count: number;
}

function aggregateToL2(rows: AnomalyRow[]): AggregatedRow[] {
  const map = new Map<string, { regions: Set<string>; sevCounts: Record<string, number>; devSum: number; varSum: number; unitSum: number; dtiMin: number; confSum: number; count: number }>();
  for (const r of rows) {
    const key = r.category_l2;
    if (!key) continue;
    const entry = map.get(key);
    if (entry) {
      entry.regions.add(r.region);
      entry.sevCounts[r.severity] = (entry.sevCounts[r.severity] || 0) + 1;
      entry.devSum += r.deviation_pct;
      entry.varSum += r.value_at_risk;
      entry.unitSum += r.units_at_risk;
      entry.dtiMin = Math.min(entry.dtiMin, r.days_to_impact);
      entry.confSum += r.confidence;
      entry.count += 1;
    } else {
      map.set(key, {
        regions: new Set([r.region]),
        sevCounts: { [r.severity]: 1 },
        devSum: r.deviation_pct,
        varSum: r.value_at_risk,
        unitSum: r.units_at_risk,
        dtiMin: r.days_to_impact,
        confSum: r.confidence,
        count: 1,
      });
    }
  }

  return [...map.entries()]
    .map(([label, v]) => {
      const topSev = Object.entries(v.sevCounts).sort((a, b) => {
        const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (order[a[0]] ?? 4) - (order[b[0]] ?? 4);
      })[0]?.[0] ?? "MEDIUM";
      return {
        label,
        regionCount: v.regions.size,
        regionNames: v.regions.size <= 3 ? [...v.regions].sort().join(", ") : `${v.regions.size} regions`,
        severity: topSev,
        deviation_pct: v.devSum / v.count,
        value_at_risk: v.varSum,
        units_at_risk: v.unitSum,
        days_to_impact: v.dtiMin,
        confidence: v.confSum / v.count,
        count: v.count,
      };
    })
    .sort((a, b) => b.value_at_risk - a.value_at_risk);
}

export function AnomalyTable({ data, narrative, vizNumber }: AnomalyTableProps) {
  const [selectedL2, setSelectedL2] = useState<string | null>(null);

  const l2Categories = useMemo(() => {
    return [...new Set(data.map((d) => d.category_l2).filter(Boolean))].sort();
  }, [data]);

  const isL3View = selectedL2 !== null;

  // Aggregated L2 rows for default view
  const l2Rows = useMemo(() => aggregateToL2(data), [data]);

  // L3 rows when drilled into a specific L2
  const l3Rows = useMemo(() => {
    if (!selectedL2) return [];
    const filtered = data.filter((d) => d.category_l2 === selectedL2);
    // Dedup: keep highest value_at_risk per category+region
    const seen = new Map<string, AnomalyRow>();
    for (const row of filtered) {
      const key = `${row.category}|${row.region}`;
      const existing = seen.get(key);
      if (!existing || row.value_at_risk > existing.value_at_risk) {
        seen.set(key, row);
      }
    }
    return [...seen.values()].sort((a, b) => b.value_at_risk - a.value_at_risk).slice(0, 10);
  }, [data, selectedL2]);

  const regionCount = useMemo(() => {
    const scope = isL3View ? l3Rows : data;
    return new Set(scope.map((r) => r.region)).size;
  }, [data, l3Rows, isL3View]);

  const displayCount = isL3View ? l3Rows.length : l2Rows.length;

  const footerStats = useMemo(() => {
    const rows = isL3View ? l3Rows : l2Rows;
    if (rows.length < 3) return null;
    const top3Impact = rows.slice(0, 3).reduce((s, r) => s + ("value_at_risk" in r ? r.value_at_risk : 0), 0);
    const totalImpact = rows.reduce((s, r) => s + ("value_at_risk" in r ? r.value_at_risk : 0), 0);
    const pct = totalImpact > 0 ? ((top3Impact / totalImpact) * 100).toFixed(0) : "0";
    return { top3Impact, pct, total: rows.length };
  }, [l2Rows, l3Rows, isL3View]);

  const computedInsight = useMemo(() => {
    const scope = isL3View ? l3Rows : data;
    if (!scope.length) return null;

    const critical = scope.filter((r) => r.severity === "CRITICAL").length;
    const high = scope.filter((r) => r.severity === "HIGH").length;
    const medium = scope.filter((r) => r.severity === "MEDIUM").length;
    const totalVAR = scope.reduce((s, r) => s + r.value_at_risk, 0);
    const totalUnits = scope.reduce((s, r) => s + r.units_at_risk, 0);
    const avgDev = scope.reduce((s, r) => s + Math.abs(r.deviation_pct), 0) / scope.length;

    const label = selectedL2 ? `**${selectedL2}**` : "all categories";
    const lines: string[] = [];
    lines.push(`**${scope.length}** anomalies in ${label} across **${regionCount}** regions. Total value at risk: **${formatUSD(totalVAR)}**.`);
    if (critical) lines.push(`**${critical}** CRITICAL-severity items require immediate attention.`);
    if (high) lines.push(`**${high}** HIGH-severity items for action within 2-3 days.`);
    if (medium) lines.push(`**${medium}** MEDIUM-severity items for weekly review.`);
    lines.push(`Units at risk: **${totalUnits.toLocaleString()}**. Avg deviation: **${avgDev.toFixed(1)}%**.`);

    const implLines: string[] = [];
    if (critical > 0) implLines.push(`**${critical}** CRITICAL items carry the highest financial exposure — address first.`);
    if (totalVAR > 1e6) implLines.push(`**${formatUSD(totalVAR)}** total exposure requires coordinated response.`);
    if (!implLines.length) implLines.push("Anomaly levels within manageable thresholds.");

    const actLines: string[] = [];
    actLines.push("Prioritize CRITICAL items for same-day response.");
    if (high) actLines.push(`Delegate **${high}** HIGH-severity items for 2-3 day action.`);
    actLines.push("Cross-reference with Driver Attribution for root causes.");

    return lines.join(" ") + ` |IMPLICATIONS| ${implLines.join(" ")} |ACTIONS| ${actLines.join(" ")}`;
  }, [data, l3Rows, isL3View, selectedL2, regionCount]);

  if (!data.length) return <div className="text-sm opacity-60 p-4">No anomaly data available.</div>;

  // Column config
  const columns = isL3View
    ? ["Rank", "Product (L3)", "Region", "Demand Deviation", "Direction", "Impact", "Days", "Confidence"]
    : ["Rank", "Category (L2)", "Regions", "Demand Deviation", "Direction", "Impact", "Min Days", "Confidence"];

  const rightAligned = ["Demand Deviation", "Impact", "Days", "Min Days", "Confidence"];

  return (
    <div>
      <h3 className="text-base font-bold mb-3 flex items-center gap-1" style={{ color: "var(--hex-text, #1e293b)" }}>
        <span className="material-icons-outlined" style={{ fontSize: "20px", color: "#EF4444" }}>warning</span>
        {vizNumber && <span className="font-mono text-sm mr-1 opacity-70">{vizNumber}</span>}Multi-Signal Anomaly Detection
      </h3>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Category:</span>
          <select
            value={selectedL2 ?? ""}
            onChange={(e) => setSelectedL2(e.target.value || null)}
            style={dropdownStyle}
          >
            <option value="">All Categories &amp; Regions (L2)</option>
            {l2Categories.map((cat) => (
              <option key={cat} value={cat}>{cat} →</option>
            ))}
          </select>
          {isL3View && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
              Showing L3 products in {selectedL2}
            </span>
          )}
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: "rgba(124,58,237,0.1)", color: "var(--hex-primary, #7c3aed)" }}>
          {displayCount} {isL3View ? "products" : "categories"} flagged across {regionCount} regions
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
          {(isL3View ? l3Rows : data).filter((r) => r.severity === "CRITICAL" || r.severity === "HIGH").length} high-impact
        </span>
      </div>

      <div className="flex gap-4 max-lg:flex-col">
        <div className="flex-1 rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--hex-border, #334155)", background: "var(--hex-surface-1, #1e293b)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {columns.map((h) => (
                    <th key={h}
                      className={`px-3 py-2.5 font-semibold ${rightAligned.includes(h) ? "text-right" : "text-left"} ${h === "Direction" ? "text-center" : ""}`}
                      style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isL3View
                  ? l3Rows.map((row, i) => {
                      const isOver = row.deviation_pct > 0;
                      const confLabel = row.confidence >= 0.8 ? "High" : row.confidence >= 0.5 ? "Medium" : "Low";
                      const confColor = row.confidence >= 0.8 ? "#22c55e" : row.confidence >= 0.5 ? "#F59E0B" : "#6366F1";
                      return (
                        <tr key={i} style={i < 3 ? { background: "rgba(124,58,237,0.06)" } : undefined} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs" style={{ color: "var(--hex-text-secondary)" }}>{i + 1}</td>
                          <td className="px-3 py-2 font-medium" style={{ color: "var(--hex-text, #e2e8f0)" }}>{row.category}</td>
                          <td className="px-3 py-2" style={{ color: "var(--hex-text, #e2e8f0)" }}>{row.region}</td>
                          <td className="px-3 py-2 text-right font-mono" style={{ color: isOver ? "#ef4444" : "#3b82f6" }}>
                            {isOver ? "\u2191+" : "\u2193"}{row.deviation_pct.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                              style={{ background: isOver ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.12)", color: isOver ? "#ef4444" : "#3b82f6" }}>
                              {isOver ? "Over Forecast" : "Under Forecast"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono" style={{ color: "var(--hex-text, #e2e8f0)" }}>{formatUSD(row.value_at_risk)}</td>
                          <td className="px-3 py-2 text-right font-mono" style={{ color: "var(--hex-text, #e2e8f0)" }}>{row.days_to_impact}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-mono text-xs" style={{ color: confColor }}>{confLabel}</span>
                          </td>
                        </tr>
                      );
                    })
                  : l2Rows.slice(0, 10).map((row, i) => {
                      const isOver = row.deviation_pct > 0;
                      const confLabel = row.confidence >= 0.8 ? "High" : row.confidence >= 0.5 ? "Medium" : "Low";
                      const confColor = row.confidence >= 0.8 ? "#22c55e" : row.confidence >= 0.5 ? "#F59E0B" : "#6366F1";
                      return (
                        <tr key={i} style={i < 3 ? { background: "rgba(124,58,237,0.06)" } : undefined} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs" style={{ color: "var(--hex-text-secondary)" }}>{i + 1}</td>
                          <td className="px-3 py-2 font-medium" style={{ color: "var(--hex-text, #e2e8f0)" }}>
                            {row.label}
                            <span className="text-[10px] ml-1.5 opacity-50">({row.count} items)</span>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs" style={{ color: "var(--hex-text, #e2e8f0)" }}>{row.regionNames}</td>
                          <td className="px-3 py-2 text-right font-mono" style={{ color: isOver ? "#ef4444" : "#3b82f6" }}>
                            {isOver ? "\u2191+" : "\u2193"}{row.deviation_pct.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                              style={{ background: isOver ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.12)", color: isOver ? "#ef4444" : "#3b82f6" }}>
                              {isOver ? "Over Forecast" : "Under Forecast"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono" style={{ color: "var(--hex-text, #e2e8f0)" }}>{formatUSD(row.value_at_risk)}</td>
                          <td className="px-3 py-2 text-right font-mono" style={{ color: "var(--hex-text, #e2e8f0)" }}>{row.days_to_impact}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-mono text-xs" style={{ color: confColor }}>{confLabel}</span>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {footerStats && (
            <div className="px-4 py-2.5 text-xs"
              style={{ background: "var(--hex-surface-2, #0f172a)", color: "var(--hex-text-secondary, #94a3b8)", borderTop: "1px solid var(--hex-border, #334155)" }}>
              Top 3 represent{" "}
              <span className="font-semibold" style={{ color: "var(--hex-text, #e2e8f0)" }}>{footerStats.pct}%</span>{" "}
              of total revenue impact across {footerStats.total} flagged {isL3View ? "products" : "categories"}
            </div>
          )}
        </div>

        <HowToReadIt bullets={HOW_TO_READ} />
      </div>

      <ChartExplainer narrative={computedInsight || narrative} />
    </div>
  );
}
