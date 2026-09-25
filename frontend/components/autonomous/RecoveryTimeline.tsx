"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { RecoveryPoint } from "@/lib/orchestration-types";
import { HowToReadIt } from "./HowToReadIt";
import { ChartExplainer } from "./ChartExplainer";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full animate-pulse rounded-xl flex items-center justify-center" style={{ background: "var(--hex-surface-1, #1e293b)" }}>Loading chart...</div>,
});

interface RecoveryTimelineProps {
  data: RecoveryPoint[];
  narrative?: string | null;
  vizNumber?: string;
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

const chartColors = ["#6366F1", "#F59E0B", "#14B8A6", "#FB7185", "#8B5CF6", "#10B981", "#F97316", "#0EA5E9", "#E879F9", "#A3E635"];

const PERISHABLE = new Set(["Dairy", "Bakery", "Fresh Produce", "Pantry & Beverages"]);
const SEASONAL = new Set(["Cooling & Comfort", "Garden & Patio", "Grills & Outdoor Cooking", "Outdoor Furniture", "Seasonal Decor"]);

function urgencyLabel(cat: string): { label: string; color: string; bg: string; days: number } {
  if (PERISHABLE.has(cat)) return { label: "Perishable — 3 days", color: "#DC2626", bg: "rgba(220,38,38,0.1)", days: 3 };
  if (SEASONAL.has(cat)) return { label: "Seasonal — 5 days", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", days: 5 };
  return { label: "Durable — 7 days", color: "#3B82F6", bg: "rgba(59,130,246,0.1)", days: 7 };
}

function fmtUsd(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

interface L2Summary {
  category: string;
  day0: number;
  day3: number;
  day7: number;
  day14: number;
  erosion: number;
  bcr: number;
  urgency: ReturnType<typeof urgencyLabel>;
}

const howToReadBullets = [
  "Each line shows how recoverable value decays over 14 days for a category.",
  "The green 'Action Window' (days 0-3) marks the optimal intervention period.",
  "Steeper lines = faster value erosion — act sooner on these categories.",
  "Use the urgency cards above to compare day-0 vs delayed intervention value.",
  "Filter by Region or Category to drill into specific L3 products.",
];

export function RecoveryTimeline({ data, narrative, vizNumber }: RecoveryTimelineProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedL2, setSelectedL2] = useState<string | null>(null);

  const availableRegions = useMemo(() => [...new Set(data.map((d) => d.region).filter(Boolean))].sort(), [data]);

  const l2Categories = useMemo(() => {
    const scope = selectedRegion ? data.filter((d) => d.region === selectedRegion) : data;
    return [...new Set(scope.map((d) => d.category_l2).filter(Boolean))].sort();
  }, [data, selectedRegion]);

  const effectiveL2 = selectedL2 && l2Categories.includes(selectedL2) ? selectedL2 : null;

  // Compute L2 summaries for urgency cards + action matrix
  const l2Summaries = useMemo<L2Summary[]>(() => {
    let scope = data;
    if (selectedRegion) scope = scope.filter((d) => d.region === selectedRegion);

    const map = new Map<string, Map<number, { rv: number; erosion: number; bcr: number; cnt: number }>>();
    for (const pt of scope) {
      const l2 = pt.category_l2 || pt.category;
      if (!map.has(l2)) map.set(l2, new Map());
      const dayMap = map.get(l2)!;
      const e = dayMap.get(pt.days_from_now);
      if (e) { e.rv += pt.recoverable_value; e.erosion += pt.daily_erosion; e.bcr += pt.benefit_cost_ratio; e.cnt += 1; }
      else dayMap.set(pt.days_from_now, { rv: pt.recoverable_value, erosion: pt.daily_erosion, bcr: pt.benefit_cost_ratio, cnt: 1 });
    }

    return [...map.entries()].map(([cat, dayMap]) => {
      const getDay = (d: number) => { const v = dayMap.get(d); return v ? v.rv : 0; };
      const allEntries = [...dayMap.values()];
      const totalErosion = allEntries.reduce((s, v) => s + v.erosion, 0) / Math.max(allEntries.length, 1);
      const avgBcr = allEntries.reduce((s, v) => s + v.bcr / v.cnt, 0) / Math.max(allEntries.length, 1);
      return { category: cat, day0: getDay(0), day3: getDay(3), day7: getDay(7), day14: getDay(14), erosion: totalErosion, bcr: avgBcr, urgency: urgencyLabel(cat) };
    }).sort((a, b) => b.day0 - a.day0);
  }, [data, selectedRegion]);

  // Aggregate totals for urgency cards
  const totals = useMemo(() => ({
    day0: l2Summaries.reduce((s, r) => s + r.day0, 0),
    day3: l2Summaries.reduce((s, r) => s + r.day3, 0),
    day7: l2Summaries.reduce((s, r) => s + r.day7, 0),
    day14: l2Summaries.reduce((s, r) => s + r.day14, 0),
    erosion: l2Summaries.reduce((s, r) => s + r.erosion, 0),
  }), [l2Summaries]);

  // Build chart groups
  const chartGroups = useMemo(() => {
    let filtered = data;
    if (selectedRegion) filtered = filtered.filter((d) => d.region === selectedRegion);

    if (effectiveL2) {
      // L3 drilldown
      const groups = new Map<string, RecoveryPoint[]>();
      for (const pt of filtered.filter((d) => d.category_l2 === effectiveL2)) {
        if (!groups.has(pt.category)) groups.set(pt.category, []);
        groups.get(pt.category)!.push(pt);
      }
      return [...groups.entries()]
        .map(([key, pts]) => ({ key, pts: [...pts].sort((a, b) => a.days_from_now - b.days_from_now), maxRisk: Math.max(...pts.map((p) => p.total_value_at_risk)) }))
        .sort((a, b) => b.maxRisk - a.maxRisk)
        .slice(0, 8);
    }

    // L2 aggregated view
    const aggMap = new Map<string, Map<number, { rv: number; cnt: number }>>();
    for (const pt of filtered) {
      const l2 = pt.category_l2 || pt.category;
      if (!aggMap.has(l2)) aggMap.set(l2, new Map());
      const dm = aggMap.get(l2)!;
      const e = dm.get(pt.days_from_now);
      if (e) { e.rv += pt.recoverable_value; e.cnt += 1; } else dm.set(pt.days_from_now, { rv: pt.recoverable_value, cnt: 1 });
    }

    return [...aggMap.entries()]
      .map(([key, dayMap]) => ({
        key,
        pts: [...dayMap.entries()].sort((a, b) => a[0] - b[0]).map(([day, v]) => ({
          department: "", category: key, category_l2: key, region: "", risk_type: "", severity: "",
          persona_owner: "", days_from_now: day, recoverable_value: v.rv, daily_erosion: 0,
          intervention_cost: 0, benefit_cost_ratio: 0, window_status: "", total_value_at_risk: v.rv,
        })),
        maxRisk: Math.max(...[...dayMap.values()].map((v) => v.rv)),
      }))
      .sort((a, b) => b.maxRisk - a.maxRisk)
      .slice(0, 10);
  }, [data, selectedRegion, effectiveL2]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { traces, shapes, annotations } = useMemo<{ traces: any[]; shapes: any[]; annotations: any[] }>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const traceList: any[] = [];

    chartGroups.forEach((group, i) => {
      const color = chartColors[i % chartColors.length];
      traceList.push({
        type: "scatter", mode: "lines+markers", name: group.key,
        x: group.pts.map((p) => p.days_from_now),
        y: group.pts.map((p) => p.recoverable_value),
        line: { color, width: 2.5, shape: "spline" },
        marker: { size: 5, color },
        fill: "tozeroy",
        fillcolor: color + "0D",
        hovertemplate: `<b>${group.key}</b><br>Day %{x}: ${fmtUsd(0).charAt(0)}%{y:,.0f} recoverable<extra></extra>`,
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shapeList: any[] = [{
      type: "rect", xref: "x", yref: "paper", x0: 0, x1: 3, y0: 0, y1: 1,
      fillcolor: "rgba(16, 185, 129, 0.06)", line: { width: 0 },
    }];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const annotList: any[] = [{
      x: 1.5, y: 1, xref: "x", yref: "paper",
      text: "Action Window", showarrow: false,
      font: { size: 10, color: "#22c55e" }, yanchor: "bottom",
    }];

    return { traces: traceList, shapes: shapeList, annotations: annotList };
  }, [chartGroups]);

  // Data-driven insight replacing stale LLM narrative
  const computedInsight = useMemo(() => {
    if (!l2Summaries.length) return null;
    const scope = effectiveL2 ? `**${effectiveL2}**` : selectedRegion ? `**${selectedRegion}**` : "all categories and regions";
    const totalRecoverable = totals.day0;
    const totalErosion = totals.erosion;
    const topCategory = l2Summaries[0];
    const categoriesWithData = l2Summaries.filter((s) => s.day0 > 0);
    const totalInterventionCost = l2Summaries.reduce((s, r) => s + (r.bcr > 0 && r.day0 > 0 ? r.day0 / r.bcr : 0), 0);

    const lines: string[] = [];
    lines.push(`Recovery trajectory for ${scope}: **${fmtUsd(totalRecoverable)}** recoverable at day 0 across **${categoriesWithData.length}** categories.`);
    if (topCategory && topCategory.day0 > 0) {
      lines.push(`Highest exposure: **${topCategory.category}** with **${fmtUsd(topCategory.day0)}** recoverable, eroding at **${fmtUsd(topCategory.erosion)}/day**.`);
    }
    lines.push(`Expected decay to **${fmtUsd(totals.day14)}** by day 14. Total intervention cost: **${fmtUsd(totalInterventionCost)}**.`);

    const implLines: string[] = [];
    if (totalRecoverable > 1_000_000) {
      implLines.push(`**${fmtUsd(totalRecoverable)}** recoverable value requires coordinated supply response \u2014 delay compounds daily erosion.`);
    }
    const perishable = l2Summaries.filter((s) => ["Dairy", "Bakery", "Fresh Produce", "Pantry & Beverages"].includes(s.category) && s.day0 > 0);
    if (perishable.length > 0) {
      implLines.push(`**${perishable.length}** perishable categories face the shortest action windows (3 days) \u2014 recovery value erodes fastest here.`);
    }
    if (totalErosion > 50_000) {
      implLines.push(`Daily erosion of **${fmtUsd(totalErosion)}** means every day of delay reduces recoverable value significantly.`);
    }
    if (!implLines.length) implLines.push("Recovery values are within manageable thresholds \u2014 standard monitoring cadence applies.");

    const actLines: string[] = [];
    actLines.push("Act on perishable items today \u2014 these have the steepest erosion curves.");
    actLines.push("For durable goods, you have more time but should stage orders within 48 hours.");
    actLines.push("Hand off to Supply Planning for sized replenishment actions.");

    return lines.join(" ") + ` |IMPLICATIONS| ${implLines.join(" ")} |ACTIONS| ${actLines.join(" ")}`;
  }, [l2Summaries, totals, effectiveL2, selectedRegion]);

  if (!data.length) return <div className="text-sm opacity-60 p-4">No recovery data available.</div>;

  const viewLabel = effectiveL2 ? `L3 products in ${effectiveL2}` : `L2 categories`;

  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold flex items-center gap-1" style={{ color: "var(--hex-text, #1e293b)" }}>
        <span className="material-icons-outlined" style={{ fontSize: "20px", color: "#0EA5E9" }}>timeline</span>
        {vizNumber && <span className="font-mono text-sm mr-1 opacity-70">{vizNumber}</span>}
        14-Day Recovery Trajectory
      </h3>

      {/* ── Urgency Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Act Today", value: totals.day0, sub: `${fmtUsd(totals.day0 - totals.day3)} lost by day 3`, color: "#DC2626", icon: "emergency" },
          { label: "By Day 3", value: totals.day3, sub: `${fmtUsd(totals.day3 - totals.day7)} lost by day 7`, color: "#F59E0B", icon: "schedule" },
          { label: "By Day 7", value: totals.day7, sub: `${fmtUsd(totals.day7 - totals.day14)} lost by day 14`, color: "#3B82F6", icon: "event" },
          { label: "By Day 14", value: totals.day14, sub: `${fmtUsd(totals.erosion)}/day erosion rate`, color: "#6366F1", icon: "trending_down" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border p-4" style={{ borderColor: "var(--hex-border, #e2e8f0)", background: "var(--hex-card-bg)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: card.color }}>{card.label}</span>
              <span className="material-icons-outlined" style={{ fontSize: "16px", color: card.color }}>{card.icon}</span>
            </div>
            <div className="text-xl font-extrabold" style={{ color: "var(--hex-text)" }}>{fmtUsd(card.value)}</div>
            <p className="text-[10px] mt-1" style={{ color: "var(--hex-text-dim)" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Region:</span>
          <select value={selectedRegion ?? ""} onChange={(e) => { setSelectedRegion(e.target.value || null); setSelectedL2(null); }} style={dropdownStyle}>
            <option value="">All Regions</option>
            {availableRegions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Category:</span>
          <select value={effectiveL2 ?? ""} onChange={(e) => setSelectedL2(e.target.value || null)} style={dropdownStyle}>
            <option value="">All Categories (L2)</option>
            {l2Categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      <p className="text-[11px]" style={{ color: "var(--hex-text-dim)" }}>{viewLabel} · Top {chartGroups.length} by recoverable value</p>

      {/* ── Chart ── */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 rounded-xl border p-2" style={{ borderColor: "var(--hex-border, #334155)", background: "var(--hex-surface-1, #1e293b)" }}>
          <Plot
            data={traces}
            layout={{
              height: 400,
              margin: { l: 80, r: 30, t: 40, b: 55 },
              font: { family: "Inter, system-ui, sans-serif", color: "#94a3b8", size: 12 },
              xaxis: { title: { text: "Days from Now", font: { size: 12 } }, range: [0, 14], gridcolor: "rgba(148,163,184,0.08)", tickfont: { size: 11 }, dtick: 1 },
              yaxis: { title: { text: "Recoverable Value ($)", font: { size: 12 } }, tickformat: ",.0f", gridcolor: "rgba(148,163,184,0.08)", tickfont: { size: 11 } },
              legend: { orientation: "h" as const, y: 1.15, x: 0.5, xanchor: "center" as const, font: { size: 10 } },
              shapes, annotations,
              autosize: true, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
            }}
            config={{ displayModeBar: false, responsive: true }}
            useResizeHandler
            style={{ width: "100%", height: "400px" }}
          />
        </div>
        <HowToReadIt bullets={howToReadBullets} />
      </div>

      {/* ── Category Action Matrix ── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--hex-border, #334155)", background: "var(--hex-surface-1, #1e293b)" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--hex-border, #334155)" }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--hex-text-secondary)" }}>Category Action Matrix</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Category", "Day 0 Value", "Day 3", "Day 7", "Day 14", "Erosion/Day", "BCR", "Action Window"].map((h) => (
                  <th key={h} className={`px-3 py-2.5 font-semibold ${h !== "Category" && h !== "Action Window" ? "text-right" : "text-left"}`}
                    style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {l2Summaries.slice(0, effectiveL2 ? 20 : 14).map((row, i) => (
                <tr key={row.category} className="border-t" style={i < 3 ? { background: "rgba(124,58,237,0.04)" } : undefined}>
                  <td className="px-3 py-2.5 font-medium" style={{ color: "var(--hex-text, #e2e8f0)" }}>{row.category}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold" style={{ color: "#DC2626" }}>{fmtUsd(row.day0)}</td>
                  <td className="px-3 py-2.5 text-right font-mono" style={{ color: "#F59E0B" }}>{fmtUsd(row.day3)}</td>
                  <td className="px-3 py-2.5 text-right font-mono" style={{ color: "#3B82F6" }}>{fmtUsd(row.day7)}</td>
                  <td className="px-3 py-2.5 text-right font-mono" style={{ color: "var(--hex-text-dim)" }}>{fmtUsd(row.day14)}</td>
                  <td className="px-3 py-2.5 text-right font-mono" style={{ color: "#EF4444" }}>{fmtUsd(row.erosion)}/d</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold" style={{ color: row.bcr >= 15 ? "#10B981" : row.bcr >= 10 ? "#F59E0B" : "#94a3b8" }}>
                    {row.bcr.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap" style={{ background: row.urgency.bg, color: row.urgency.color }}>
                      {row.urgency.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] mt-1.5 px-1" style={{ color: "var(--hex-text-dim, #64748b)" }}>
          $0 values indicate the recovery window has passed or the value is fully eroded at that time horizon.
        </p>
      </div>

      <ChartExplainer narrative={computedInsight || narrative} />
    </div>
  );
}
