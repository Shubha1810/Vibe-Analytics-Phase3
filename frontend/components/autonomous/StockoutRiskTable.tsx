"use client";

import React, { useMemo, useState } from "react";
import { HowToReadIt } from "./HowToReadIt";
import { ChartExplainer } from "./ChartExplainer";
import type { StockoutRow } from "@/lib/orchestration-types";

interface StockoutRiskTableProps {
  data: StockoutRow[];
  narrative?: string | null;
  vizNumber?: string;
}

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const severityStyle: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
  HIGH: { bg: "rgba(249,115,22,0.15)", text: "#f97316" },
  MEDIUM: { bg: "rgba(234,179,8,0.15)", text: "#eab308" },
  LOW: { bg: "rgba(99,102,241,0.15)", text: "#6366F1" },
};

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

const howToReadBullets = [
  "Each row represents the highest-risk record for a distinct Subcategory + Region combination.",
  "Stockout Rate = percentage of SKUs currently stocked out in this category/region.",
  "Risk Level reflects the business-defined severity from the source system.",
  "Units at Risk = projected units affected if no action is taken.",
  "Revenue at Risk = dollar exposure if no action is taken.",
  "Days to Impact = how soon this risk affects revenue or availability.",
  "Rows are sorted by Units at Risk (highest first), then Revenue at Risk.",
];

function formatUSD(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function sortRows(rows: StockoutRow[]): StockoutRow[] {
  return [...rows].sort((a, b) => {
    // 1. Units at risk DESC
    if (b.units_at_risk !== a.units_at_risk) return b.units_at_risk - a.units_at_risk;
    // 2. Revenue at risk DESC
    if (b.value_at_risk !== a.value_at_risk) return b.value_at_risk - a.value_at_risk;
    // 3. Stockout rate DESC
    if (b.stockout_rate !== a.stockout_rate) return b.stockout_rate - a.stockout_rate;
    // 4. Severity rank ASC (CRITICAL first)
    const sevA = SEVERITY_RANK[a.severity] ?? 4;
    const sevB = SEVERITY_RANK[b.severity] ?? 4;
    if (sevA !== sevB) return sevA - sevB;
    // 5. Deterministic tiebreaker
    return a.risk_id.localeCompare(b.risk_id);
  });
}

export function StockoutRiskTable({ data, narrative, vizNumber }: StockoutRiskTableProps) {
  const [selectedL2, setSelectedL2] = useState<string | null>(null);
  const [selectedL3, setSelectedL3] = useState<string | null>(null);

  // Deduplicate by L3+Region: keep highest units_at_risk per combo
  const deduped = useMemo(() => {
    const map = new Map<string, StockoutRow>();
    for (const r of data) {
      const key = `${r.category_l2}||${r.category}||${r.region}`;
      const existing = map.get(key);
      if (!existing || r.units_at_risk > existing.units_at_risk) {
        map.set(key, r);
      }
    }
    return [...map.values()];
  }, [data]);

  // L2 categories from data
  const l2Categories = useMemo(() => {
    return [...new Set(deduped.map((d) => d.category_l2).filter(Boolean))].sort();
  }, [deduped]);

  // L3 products within selected L2
  const l3Products = useMemo(() => {
    if (!selectedL2) return [];
    return [...new Set(deduped.filter((d) => d.category_l2 === selectedL2).map((d) => d.category).filter(Boolean))].sort();
  }, [deduped, selectedL2]);

  // Filtered rows based on selection
  const filtered = useMemo(() => {
    let rows = deduped;
    if (selectedL2) rows = rows.filter((d) => d.category_l2 === selectedL2);
    if (selectedL3) rows = rows.filter((d) => d.category === selectedL3);
    return rows;
  }, [deduped, selectedL2, selectedL3]);

  // Sort and take top 10
  const displayRows = useMemo(() => sortRows(filtered).slice(0, 10), [filtered]);

  // View indicator text
  const viewIndicator = useMemo(() => {
    if (selectedL3) return `Showing Top 10 distinct records for ${selectedL3} across all regions`;
    if (selectedL2) return `Showing Top 10 distinct records in ${selectedL2} across all regions`;
    return "Showing Top 10 distinct records across all L2 categories and regions";
  }, [selectedL2, selectedL3]);

  // Dynamic Cortex AI insight from displayed rows only
  const computedInsight = useMemo(() => {
    if (!displayRows.length) return null;
    const scope = selectedL3 ? `**${selectedL3}**` : selectedL2 ? `**${selectedL2}**` : "all categories";
    const regions = [...new Set(displayRows.map((r) => r.region))];
    const critical = displayRows.filter((r) => r.severity === "CRITICAL").length;
    const high = displayRows.filter((r) => r.severity === "HIGH").length;
    const maxStockout = displayRows[0];
    const totalVAR = displayRows.reduce((s, r) => s + r.value_at_risk, 0);
    const totalUnits = displayRows.reduce((s, r) => s + r.units_at_risk, 0);

    const lines: string[] = [];
    lines.push(`**${displayRows.length}** stockout risk records displayed for ${scope} across **${regions.length}** region${regions.length !== 1 ? "s" : ""} (${regions.join(", ")}).`);
    if (maxStockout) {
      lines.push(`Highest units at risk: **${maxStockout.units_at_risk.toLocaleString()}** in **${maxStockout.category}** (${maxStockout.region}) with stockout rate **${maxStockout.stockout_rate.toFixed(1)}%**.`);
    }
    lines.push(`Total value at risk: **${formatUSD(totalVAR)}**. Units at risk: **${totalUnits.toLocaleString()}**.`);
    if (critical) lines.push(`**${critical}** CRITICAL-severity records.`);
    if (high) lines.push(`**${high}** HIGH-severity records.`);

    const implLines: string[] = [];
    if (maxStockout && maxStockout.stockout_rate > 30) {
      implLines.push(`**${maxStockout.category}** at **${maxStockout.stockout_rate.toFixed(1)}%** stockout rate signals severe availability failure — customer-facing impact is likely already occurring.`);
    }
    if (critical > 0) {
      implLines.push(`**${critical}** CRITICAL items require same-day intervention to prevent revenue loss.`);
    }
    if (totalVAR > 500000) {
      implLines.push(`**${formatUSD(totalVAR)}** total exposure across displayed records is material — coordinate cross-functional response.`);
    }
    if (!implLines.length) implLines.push("Stockout risk levels are within manageable thresholds — maintain standard monitoring cadence.");

    const actLines: string[] = [];
    if (critical) actLines.push(`Approve emergency replenishment for **${critical}** CRITICAL items immediately.`);
    if (high) actLines.push(`Stage orders for **${high}** HIGH-severity items within 24 hours.`);
    const topDrivers = [...new Set(displayRows.map((r) => r.primary_driver).filter(Boolean))].slice(0, 3);
    if (topDrivers.length) actLines.push(`Primary drivers: ${topDrivers.join(", ")} — align mitigation strategy accordingly.`);
    actLines.push("Escalate capacity conflicts to the Director for resolution at S&OP.");

    return lines.join(" ") + ` |IMPLICATIONS| ${implLines.join(" ")} |ACTIONS| ${actLines.join(" ")}`;
  }, [displayRows, selectedL2, selectedL3]);

  if (!data.length) return <div className="text-sm opacity-60 p-4">No stockout risk data available.</div>;

  return (
    <div className="rounded-2xl border border-[var(--border-color)] p-5 mb-6" style={{ background: "var(--hex-card-bg)" }}>
      <h3 className="text-base font-bold mb-3 flex items-center gap-1" style={{ color: "var(--hex-text, #1e293b)" }}>
        <span className="material-icons-outlined" style={{ fontSize: "20px", color: "#DC2626" }}>inventory</span>
        {vizNumber && <span className="font-mono text-sm mr-1 opacity-70">{vizNumber}</span>}
        Stockout &amp; Availability Risk
      </h3>

      {/* Cascading filters */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {/* L2 dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Category:</span>
          <select
            value={selectedL2 ?? ""}
            onChange={(e) => { setSelectedL2(e.target.value || null); setSelectedL3(null); }}
            style={dropdownStyle}
          >
            <option value="">All Categories &amp; Regions (L2)</option>
            {l2Categories.map((cat) => (
              <option key={cat} value={cat}>{cat} &rarr;</option>
            ))}
          </select>
        </div>

        {/* L3 dropdown — only when L2 selected */}
        {selectedL2 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Subcategory:</span>
            <select
              value={selectedL3 ?? ""}
              onChange={(e) => setSelectedL3(e.target.value || null)}
              style={dropdownStyle}
            >
              <option value="">All Subcategories in {selectedL2}</option>
              {l3Products.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

        {/* View indicator */}
        {selectedL2 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>
            {selectedL3 ? `Showing ${selectedL3} in ${selectedL2}` : `Showing L3 products in ${selectedL2}`}
          </span>
        )}
      </div>

      {/* Summary pill */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: "rgba(124,58,237,0.1)", color: "var(--hex-primary, #7c3aed)" }}>
          {viewIndicator}
        </span>
      </div>

      <div className="flex gap-4 max-lg:flex-col">
        <div className="flex-1 min-w-0 rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--hex-border, #334155)", background: "var(--hex-surface-1, #1e293b)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Rank</th>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Category (L2)</th>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Subcategory (L3)</th>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Region</th>
                  <th className="px-3 py-2.5 text-right font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Stockout Rate</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Risk Level</th>
                  <th className="px-3 py-2.5 text-right font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Units at Risk</th>
                  <th className="px-3 py-2.5 text-right font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Revenue at Risk</th>
                  <th className="px-3 py-2.5 text-right font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Days to Impact</th>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Primary Driver</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => {
                  const sev = severityStyle[row.severity] || severityStyle.MEDIUM;
                  const confLabel = row.confidence >= 0.8 ? "High" : row.confidence >= 0.5 ? "Medium" : "Low";
                  const confColor = row.confidence >= 0.8 ? "#22c55e" : row.confidence >= 0.5 ? "#F59E0B" : "#6366F1";
                  return (
                    <tr key={row.risk_id} style={i < 3 ? { background: "rgba(124,58,237,0.06)" } : undefined} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs" style={{ color: "var(--hex-text-secondary)" }}>{i + 1}</td>
                      <td className="px-3 py-2" style={{ color: "var(--hex-text, #e2e8f0)" }}>{row.category_l2}</td>
                      <td className="px-3 py-2 font-medium" style={{ color: "var(--hex-text, #e2e8f0)" }}>{row.category}</td>
                      <td className="px-3 py-2" style={{ color: "var(--hex-text, #e2e8f0)" }}>{row.region}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: "#ef4444" }}>
                        {row.stockout_rate.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: sev.bg, color: sev.text }}>
                          {row.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: "var(--hex-text, #e2e8f0)" }}>
                        {row.units_at_risk.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: "var(--hex-text, #e2e8f0)" }}>
                        {formatUSD(row.value_at_risk)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: "var(--hex-text, #e2e8f0)" }}>
                        {row.days_to_impact}d
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--hex-text-dim, #94a3b8)" }}>{row.primary_driver}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="font-mono text-[10px] font-bold" style={{ color: confColor }}>{confLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="hidden lg:block w-56 flex-shrink-0">
          <HowToReadIt bullets={howToReadBullets} />
        </div>
      </div>

      <ChartExplainer narrative={computedInsight || narrative} />
    </div>
  );
}
