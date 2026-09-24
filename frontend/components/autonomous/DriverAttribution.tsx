"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { DriverRow } from "@/lib/orchestration-types";
import { HowToReadIt } from "./HowToReadIt";
import { ChartExplainer } from "./ChartExplainer";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[400px] w-full animate-pulse rounded-xl flex items-center justify-center"
      style={{ background: "var(--hex-surface-1, #1e293b)" }}
    >
      Loading chart...
    </div>
  ),
});

interface DriverAttributionProps {
  data: DriverRow[];
  narrative?: string | null;
  vizNumber?: string;
}

const DRIVER_ORDER = ["Weather", "Promotions", "Competitor Actions", "Digital Signals", "Residual"] as const;

function normalizeDriver(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower === "weather" || lower === "weather signal" || lower === "weather signals") return "Weather";
  if (lower === "promotion" || lower === "promo" || lower === "promotions" || lower === "promotional activity") return "Promotions";
  if (lower === "competitor" || lower === "competitor action" || lower === "competitor actions" || lower === "competitive activity") return "Competitor Actions";
  if (lower === "digital" || lower === "digital signal" || lower === "digital signals" || lower === "social signal" || lower === "online signal") return "Digital Signals";
  if (lower === "residual" || lower === "unexplained" || lower === "unexplained contribution" || lower === "other") return "Residual";
  return raw;
}

const DRIVER_COLORS: Record<string, string> = {
  Weather: "#6366F1",
  Promotions: "#F59E0B",
  "Competitor Actions": "#14B8A6",
  "Digital Signals": "#FB7185",
  Residual: "#94A3B8",
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

const HOW_TO_READ = [
  "Each bar decomposes a demand deviation into its contributing drivers.",
  "The width represents each driver\u2019s contribution in percentage points.",
  "Confidence indicates how reliably that driver is isolated.",
  "A multicollinearity flag (MC) means two drivers overlap \u2014 the contribution has been dampened to avoid double-counting.",
  "Residual represents the portion of demand deviation not fully explained by Weather, Promotions, Competitor Actions, or Digital Signals. A high Residual contribution may indicate missing variables, uncaptured local effects, data limitations, or model uncertainty.",
];

function normalizeRows(rows: DriverRow[]): DriverRow[] {
  return rows.map((r) => ({ ...r, driver_name: normalizeDriver(r.driver_name) }));
}

// Deduplicate: average per category(L3)+driver
function deduplicateRows(rows: DriverRow[]): DriverRow[] {
  const map = new Map<string, { sum: number; confSum: number; confCount: number; count: number; mc: boolean; row: DriverRow }>();
  for (const r of rows) {
    const k = `${r.category}||${r.driver_name}`;
    const entry = map.get(k);
    if (entry) {
      entry.sum += r.contribution_pp;
      entry.confSum += r.confidence_score;
      entry.confCount += r.confidence_score > 0 ? 1 : 0;
      entry.count += 1;
      if (r.multicollinearity_flag) entry.mc = true;
    } else {
      map.set(k, { sum: r.contribution_pp, confSum: r.confidence_score, confCount: r.confidence_score > 0 ? 1 : 0, count: 1, mc: r.multicollinearity_flag, row: r });
    }
  }
  return Array.from(map.values()).map((v) => ({
    ...v.row,
    contribution_pp: v.sum / v.count,
    confidence_score: v.confCount > 0 ? v.confSum / v.confCount : 0,
    multicollinearity_flag: v.mc,
  }));
}

export function DriverAttribution({ data, narrative, vizNumber }: DriverAttributionProps) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // Normalize driver names once
  const normalized = useMemo(() => normalizeRows(data), [data]);

  // Departments available
  const departments = useMemo(() => {
    return [...new Set(normalized.map((d) => d.department).filter(Boolean))].sort();
  }, [normalized]);

  // Filter by department, then deduplicate
  const chartData = useMemo(() => {
    const scoped = selectedDept ? normalized.filter((d) => d.department === selectedDept) : normalized;
    return deduplicateRows(scoped);
  }, [normalized, selectedDept]);

  // All L3 categories sorted by total absolute contribution + ordered driver traces + flags
  const { categories, traces, flags } = useMemo(() => {
    const catTotals = new Map<string, number>();
    for (const d of chartData) {
      catTotals.set(d.category, (catTotals.get(d.category) || 0) + Math.abs(d.contribution_pp));
    }
    const allCats = [...catTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

    // Only include drivers that actually exist in the filtered data
    const presentDrivers = new Set(chartData.map((d) => d.driver_name));
    const orderedDrivers = DRIVER_ORDER.filter((d) => presentDrivers.has(d));

    const traceList = orderedDrivers.map((driver) => {
      const vals = allCats.map((cat) => {
        const row = chartData.find((d) => d.category === cat && d.driver_name === driver);
        return row ? row.contribution_pp : 0;
      });
      return {
        type: "bar" as const,
        name: driver,
        orientation: "h" as const,
        y: allCats,
        x: vals,
        marker: { color: DRIVER_COLORS[driver] || "#64748b" },
        hovertemplate: `${driver}: %{x:.1f}pp<extra></extra>`,
      };
    });

    const flagMap = new Map<string, { confidence: number; multicollinearity: boolean }>();
    for (const cat of allCats) {
      const catRows = chartData.filter((d) => d.category === cat);
      const validConf = catRows.filter((d) => d.confidence_score > 0);
      const avgConf = validConf.length > 0 ? validConf.reduce((s, d) => s + d.confidence_score, 0) / validConf.length : 0;
      const hasMC = catRows.some((d) => d.multicollinearity_flag);
      flagMap.set(cat, { confidence: avgConf, multicollinearity: hasMC });
    }

    return { categories: allCats, traces: traceList, flags: flagMap };
  }, [chartData]);

  // View label for insight
  const viewLabel = selectedDept ? `**${selectedDept}**` : "all departments";

  // Dynamic Cortex AI Insight
  const scopedInsight = useMemo(() => {
    if (!chartData.length) return null;

    const byDriver: Record<string, { total: number; count: number }> = {};
    chartData.forEach((d) => {
      const name = d.driver_name ?? "Unknown";
      if (!byDriver[name]) byDriver[name] = { total: 0, count: 0 };
      byDriver[name].total += d.contribution_pp ?? 0;
      byDriver[name].count += 1;
    });

    const ranked = Object.entries(byDriver)
      .map(([name, v]) => ({ name, avg: v.total / v.count, count: v.count }))
      .sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg));

    const lines: string[] = [];
    lines.push(`Root cause attribution for ${viewLabel}: **${chartData.length}** driver-category combinations analyzed across **${categories.length}** product categories.`);
    ranked.forEach((d) => {
      lines.push(`**${d.name}**: average contribution **${d.avg > 0 ? "+" : ""}${d.avg.toFixed(2)}pp** across ${d.count} categories.`);
    });

    const dominant = ranked[0];
    const residualEntry = ranked.find((d) => d.name === "Residual");

    const implLines: string[] = [];
    if (dominant) {
      if (Math.abs(dominant.avg) > 5) {
        implLines.push(`**${dominant.name}** is the dominant driver at **${dominant.avg > 0 ? "+" : ""}${dominant.avg.toFixed(2)}pp** \u2014 this single factor explains the majority of demand deviation for ${viewLabel}.`);
      }
      const multiSignal = ranked.filter((d) => Math.abs(d.avg) > 1);
      if (multiSignal.length >= 3) {
        implLines.push(`**${multiSignal.length} drivers** contribute meaningfully (>1pp) \u2014 this is a multi-signal demand event with compounding effects.`);
      }
    }
    const hasMulticoll = chartData.some((d) => d.multicollinearity_flag);
    if (hasMulticoll) {
      implLines.push("Multicollinearity detected \u2014 contribution estimates may overlap. Treat individual driver values as directional, not exact.");
    }
    if (residualEntry && dominant && dominant.name === "Residual") {
      implLines.push(`A significant portion of the deviation (**${residualEntry.avg > 0 ? "+" : ""}${residualEntry.avg.toFixed(2)}pp**) is not explained by the four identified external drivers. This indicates missing variables, uncaptured local effects, data limitations, or model uncertainty.`);
    } else if (residualEntry && Math.abs(residualEntry.avg) > 3) {
      implLines.push(`Residual contribution of **${residualEntry.avg > 0 ? "+" : ""}${residualEntry.avg.toFixed(2)}pp** signals that part of the deviation remains unexplained \u2014 validate additional operational or local signals.`);
    }
    if (!implLines.length) implLines.push("Driver contributions are within expected ranges \u2014 no structural demand shift detected.");

    const actLines: string[] = [];
    if (dominant) {
      if (dominant.name === "Weather") {
        actLines.push("Weather-driven demand is temporary \u2014 secure short-term replenishment but avoid over-ordering beyond the forecast window.");
      } else if (dominant.name === "Promotions") {
        actLines.push("Validate that promotional lift is incremental, not pulled-forward demand. Monitor post-promotion demand decline.");
      } else if (dominant.name === "Competitor Actions") {
        actLines.push("Competitor-driven share gains may be sustainable \u2014 assess whether the competitor disruption is temporary or structural.");
      } else if (dominant.name === "Digital Signals") {
        actLines.push("Digital/social signal spikes are often short-lived (5\u20137 days). Monitor decay rate before committing to large inventory positions.");
      } else if (dominant.name === "Residual") {
        actLines.push("The dominant attribution is unexplained \u2014 review missing variables, localized events, data quality, and model coverage before making a major planning decision.");
      }
    }
    actLines.push("Use the Recovery Timeline to size the financial impact and determine the optimal intervention window.");

    return lines.join(" ") + ` |IMPLICATIONS| ${implLines.join(" ")} |ACTIONS| ${actLines.join(" ")}`;
  }, [chartData, viewLabel, categories.length]);

  if (!data.length) return <div className="text-sm opacity-60 p-4">No driver data available.</div>;

  return (
    <div>
      <h3 className="text-base font-bold mb-3 flex items-center gap-1" style={{ color: "var(--hex-text, #1e293b)" }}>
        <span className="material-icons-outlined" style={{ fontSize: "20px", color: "#8B5CF6" }}>account_tree</span>
        {vizNumber && <span className="font-mono text-sm mr-1 opacity-70">{vizNumber}</span>}
        Root Cause Driver Attribution
      </h3>

      {/* Department filter dropdown */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Department:</span>
          <select
            value={selectedDept ?? ""}
            onChange={(e) => setSelectedDept(e.target.value || null)}
            style={dropdownStyle}
          >
            <option value="">All</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4 max-lg:flex-col">
        <div
          className="flex-1 rounded-xl border p-2"
          style={{
            borderColor: "var(--hex-border, #334155)",
            background: "var(--hex-surface-1, #1e293b)",
          }}
        >
          <div className="flex gap-4">
            <div className="flex-1">
              <Plot
                data={traces}
                layout={{
                  height: Math.max(300, categories.length * 40 + 80),
                  margin: { l: 200, r: 40, t: 50, b: 50 },
                  font: { family: "Inter, system-ui, sans-serif", color: "#94a3b8", size: 12 },
                  barmode: "relative" as const,
                  xaxis: {
                    title: { text: "Contribution to Deviation (percentage points)", font: { size: 12 } },
                    zeroline: true,
                    zerolinecolor: "#475569",
                    tickfont: { size: 11 },
                  },
                  yaxis: {
                    automargin: true,
                    title: { text: "Product Category", font: { size: 12 }, standoff: 20 },
                    tickfont: { size: 11 },
                  },
                  legend: {
                    orientation: "h" as const,
                    y: 1.08,
                    x: 0.5,
                    xanchor: "center" as const,
                    font: { size: 11 },
                  },
                  autosize: true,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                }}
                config={{ displayModeBar: false, responsive: true }}
                useResizeHandler
                style={{
                  width: "100%",
                  height: `${Math.max(300, categories.length * 40 + 80)}px`,
                }}
              />
            </div>
            <div className="w-40 flex-shrink-0 flex flex-col gap-2 pt-8 text-xs">
              {categories.map((cat) => {
                const f = flags.get(cat);
                return (
                  <div key={cat} className="flex items-center gap-1.5">
                    <span
                      className="px-1.5 py-0.5 rounded font-mono"
                      style={{
                        background: "rgba(124,58,237,0.1)",
                        color: "var(--hex-text-secondary, #94a3b8)",
                      }}
                    >
                      {f && f.confidence > 0 ? `${(f.confidence * 100).toFixed(0)}%` : "\u2014"}
                    </span>
                    {f?.multicollinearity && (
                      <span
                        className="px-1 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}
                        title="Multicollinearity detected"
                      >
                        MC
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <HowToReadIt bullets={HOW_TO_READ} />
      </div>

      <ChartExplainer narrative={scopedInsight || narrative} />
    </div>
  );
}
