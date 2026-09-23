"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { HeatmapCell } from "@/lib/orchestration-types";
import { HowToReadIt } from "./HowToReadIt";
import { ChartExplainer } from "./ChartExplainer";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[400px] w-full animate-pulse rounded-xl flex items-center justify-center"
      style={{ background: "var(--hex-surface-1, #f8fafc)" }}
    >
      Loading chart...
    </div>
  ),
});

interface DeviationHeatmapProps {
  data: HeatmapCell[];
  narrative?: string | null;
  vizNumber?: string;
}

const HOW_TO_READ_L1 = [
  "Each cell shows the average demand deviation (%) for a department × region combination over the latest fiscal week.",
  "Red shading = demand running above forecast — could signal opportunity or overstock risk.",
  "Blue shading = running below forecast — potential markdown risk or supply surplus.",
  "White/neutral = within normal ±10% variance band.",
  "Select one or more departments above to drill into Category L2 sub-categories.",
];

const HOW_TO_READ_L2 = [
  "Drilled view: each cell shows deviation (%) for a sub-category × region within the selected department(s).",
  "Red = over-forecast demand. Blue = under-forecast.",
  "White cells are within normal ±10% range — no action needed.",
  "Compare across regions to spot geographic concentration of anomalies.",
  "Deselect all departments to return to the high-level view.",
];

export function DeviationHeatmap({ data, narrative, vizNumber }: DeviationHeatmapProps) {
  const [selectedL1, setSelectedL1] = useState<string | null>(null);

  // Derive all L1 departments from data (deduplicated)
  const allL1 = useMemo(() => {
    return [...new Set(data.map((d) => d.category_l1).filter(Boolean))].sort();
  }, [data]);

  const isDrillDown = selectedL1 !== null;

  // Build heatmap matrix
  const { regions, categories, z, text, summaryText } = useMemo(() => {
    const regionSet = [...new Set(data.map((d) => d.region))].sort();

    if (!isDrillDown) {
      // L1 view: aggregate by department
      const buckets = new Map<string, { sumDev: number; count: number; sumLost: number }>();
      for (const d of data) {
        const key = `${d.region}|${d.category_l1}`;
        const cur = buckets.get(key) ?? { sumDev: 0, count: 0, sumLost: 0 };
        cur.sumDev += d.deviation_pct;
        cur.count += 1;
        cur.sumLost += d.lost_sales;
        buckets.set(key, cur);
      }

      const zMatrix: (number | null)[][] = [];
      const textMatrix: string[][] = [];
      for (const region of regionSet) {
        const row: (number | null)[] = [];
        const textRow: string[] = [];
        for (const dept of allL1) {
          const bucket = buckets.get(`${region}|${dept}`);
          if (bucket) {
            const avg = bucket.sumDev / bucket.count;
            row.push(avg);
            textRow.push(`${avg.toFixed(1)}%`);
          } else {
            row.push(null);
            textRow.push("—");
          }
        }
        zMatrix.push(row);
        textMatrix.push(textRow);
      }

      const totalCells = allL1.length * regionSet.length;
      const hotCells = zMatrix.flat().filter((v) => v != null && Math.abs(v) > 10).length;
      const summary = `Showing ${allL1.length} departments × ${regionSet.length} regions. ${hotCells} of ${totalCells} cells exceed ±10% deviation threshold.`;

      return { regions: regionSet, categories: allL1, z: zMatrix, text: textMatrix, summaryText: summary };
    }

    // L2 drill-down: show sub-categories for selected L1
    const filtered = data.filter((d) => d.category_l1 === selectedL1);
    const l2Set = [...new Set(filtered.map((d) => d.category_l2))].sort();

    // Aggregate at L2 level (in case multiple L3 roll up to same L2)
    const buckets = new Map<string, { sumDev: number; count: number; sumLost: number }>();
    for (const d of filtered) {
      const key = `${d.region}|${d.category_l2}`;
      const cur = buckets.get(key) ?? { sumDev: 0, count: 0, sumLost: 0 };
      cur.sumDev += d.deviation_pct;
      cur.count += 1;
      cur.sumLost += d.lost_sales;
      buckets.set(key, cur);
    }

    const zMatrix: (number | null)[][] = [];
    const textMatrix: string[][] = [];
    for (const region of regionSet) {
      const row: (number | null)[] = [];
      const textRow: string[] = [];
      for (const cat of l2Set) {
        const bucket = buckets.get(`${region}|${cat}`);
        if (bucket) {
          const avg = bucket.sumDev / bucket.count;
          row.push(avg);
          textRow.push(`${avg.toFixed(1)}%`);
        } else {
          row.push(null);
          textRow.push("—");
        }
      }
      zMatrix.push(row);
      textMatrix.push(textRow);
    }

    const hotCells = zMatrix.flat().filter((v) => v != null && Math.abs(v) > 10).length;
    const summary = `Drill-down: ${l2Set.length} sub-categories in ${selectedL1} × ${regionSet.length} regions. ${hotCells} cells exceed ±10% threshold.`;

    return { regions: regionSet, categories: l2Set, z: zMatrix, text: textMatrix, summaryText: summary };
  }, [data, allL1, isDrillDown, selectedL1]);

  // Dynamic insight based on filtered scope
  const scopedInsight = useMemo(() => {
    const scope = isDrillDown
      ? data.filter((d) => d.category_l1 === selectedL1)
      : data;
    if (!scope.length) return null;

    const sorted = [...scope].sort((a, b) => Math.abs(b.deviation_pct) - Math.abs(a.deviation_pct));
    const top3 = sorted.slice(0, 3);
    const avgDev = scope.reduce((s, d) => s + d.deviation_pct, 0) / scope.length;
    const totalLost = scope.reduce((s, d) => s + d.lost_sales, 0);
    const hotCount = scope.filter((d) => Math.abs(d.deviation_pct) > 10).length;

    const lines = [
      `Average deviation across ${isDrillDown ? "selected scope" : "all departments"}: **${avgDev.toFixed(1)}%**. **${hotCount}** product-region combinations exceed the ±10% threshold.`,
      ...top3.map((d) => `**${isDrillDown ? d.category_l2 : d.category_l1}** in **${d.region}**: ${d.deviation_pct > 0 ? "+" : ""}${d.deviation_pct.toFixed(1)}% deviation, ${d.lost_sales.toLocaleString()} lost sales units.`),
    ];
    if (totalLost > 0) {
      lines.push(`Total lost sales exposure in scope: **${totalLost.toLocaleString()} units**.`);
    }

    // Business Implications
    const implLines: string[] = [];
    if (hotCount > scope.length * 0.3) {
      implLines.push(`Over **${Math.round(hotCount / scope.length * 100)}%** of product-region combinations are outside normal variance — this signals broad portfolio stress, not isolated incidents.`);
    }
    if (totalLost > 10000) {
      implLines.push(`**${totalLost.toLocaleString()} units** of estimated lost sales represent direct revenue leakage and potential customer experience erosion.`);
    }
    if (avgDev > 15) {
      implLines.push(`Average deviation of **${avgDev.toFixed(1)}%** exceeds the action threshold — systemic under-forecasting may be compounding stockout risk.`);
    } else if (avgDev < -10) {
      implLines.push(`Negative average deviation of **${avgDev.toFixed(1)}%** indicates over-forecasting — excess inventory and markdown exposure are likely.`);
    }
    if (!implLines.length) implLines.push("Deviations are within manageable range — continue monitoring for trend acceleration.");

    // Recommended Actions
    const actLines: string[] = [];
    if (isDrillDown) {
      actLines.push(`Review the top-deviating sub-categories in ${selectedL1} for immediate replenishment or markdown decisions.`);
    } else {
      actLines.push("Select departments above to drill into sub-category level and identify specific product lines driving the deviation.");
    }
    if (hotCount > 0) {
      actLines.push(`Prioritize the **${Math.min(hotCount, 5)} highest-deviation** cells for same-day action — these carry the largest revenue exposure.`);
    }
    actLines.push("Cross-reference with the Driver Attribution section to understand root causes before committing to replenishment orders.");

    return lines.join(" ") + ` |IMPLICATIONS| ${implLines.join(" ")} |ACTIONS| ${actLines.join(" ")}`;
  }, [data, isDrillDown, selectedL1]);

  if (!data.length) return <div className="text-sm opacity-60 p-4">No heatmap data available.</div>;

  return (
    <div>
      <h3 className="text-base font-bold mb-3 flex items-center gap-1" style={{ color: "var(--hex-text, #1e293b)" }}>
        <span className="material-icons-outlined" style={{ fontSize: "20px", color: "#6366F1" }}>grid_view</span>
        {vizNumber && <span className="font-mono text-sm mr-1 opacity-70">{vizNumber}</span>}Portfolio Deviation Heatmap
      </h3>
      {/* Department dropdown filter */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--hex-text, #334155)" }}>
          Department:
        </span>
        <select
          value={selectedL1 ?? ""}
          onChange={(e) => setSelectedL1(e.target.value || null)}
          style={{
            background: "var(--hex-surface-2, #0f172a)",
            color: "var(--hex-text, #e2e8f0)",
            border: "1px solid var(--hex-border, #334155)",
            borderRadius: "8px",
            padding: "6px 12px",
            fontSize: "13px",
            cursor: "pointer",
            minWidth: "180px",
          }}
        >
          <option value="">All Departments</option>
          {allL1.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Scope indicator */}
      <p className="text-[11px] mb-2" style={{ color: "var(--hex-text-dim, #94a3b8)" }}>
        {isDrillDown ? `Showing Category L2 breakdown for: ${selectedL1}` : "Showing Department (L1) level. Select a department to drill into sub-categories."}
      </p>

      <div className="flex gap-4 max-lg:flex-col">
        {/* Chart */}
        <div
          className="flex-1 rounded-xl border p-2"
          style={{
            borderColor: "var(--hex-border, #e2e8f0)",
            background: "var(--hex-card-bg, white)",
          }}
        >
          <Plot
            data={[
              {
                type: "heatmap" as const,
                z,
                x: categories,
                y: regions,
                text,
                texttemplate: "%{text}",
                hovertemplate:
                  "<b>%{y}</b> × %{x}<br>Deviation: %{text}<extra></extra>",
                colorscale: [
                  [0, "#3B82F6"],
                  [0.35, "#93C5FD"],
                  [0.5, "#FFFFFF"],
                  [0.65, "#FCA5A5"],
                  [1, "#EF4444"],
                ],
                zmid: 0,
                colorbar: {
                  title: { text: "Dev %", font: { color: "#64748b", size: 11 } },
                  tickfont: { color: "#64748b", size: 10 },
                },
              },
            ]}
            layout={{
              height: Math.max(320, regions.length * 50 + 120),
              margin: { l: 110, r: 80, t: 30, b: Math.max(80, categories.length > 8 ? 120 : 80) },
              font: { family: "Inter, system-ui, sans-serif", color: "#64748b", size: 12 },
              xaxis: {
                side: "bottom" as const,
                tickangle: categories.length > 6 ? -45 : 0,
                title: {
                  text: isDrillDown ? "Sub-Category (L2)" : "Department (L1)",
                  font: { size: 12, color: "#475569" },
                  standoff: 10,
                },
                tickfont: { size: 11 },
              },
              yaxis: {
                title: { text: "Region", font: { size: 12, color: "#475569" }, standoff: 10 },
                tickfont: { size: 11 },
              },
              autosize: true,
              paper_bgcolor: "rgba(0,0,0,0)",
              plot_bgcolor: "rgba(0,0,0,0)",
            }}
            config={{ displayModeBar: false, responsive: true }}
            useResizeHandler
            style={{ width: "100%", height: "auto" }}
          />
        </div>

        {/* HOW TO READ IT sidebar */}
        <HowToReadIt bullets={isDrillDown ? HOW_TO_READ_L2 : HOW_TO_READ_L1} />
      </div>

      {/* Dynamic insight — updates based on filter scope */}
      <ChartExplainer narrative={scopedInsight || narrative} />
    </div>
  );
}
