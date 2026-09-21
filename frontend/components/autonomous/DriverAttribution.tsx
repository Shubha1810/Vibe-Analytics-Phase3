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
}

const driverColors: Record<string, string> = {
  Weather: "#6366F1",
  Promotion: "#F59E0B",
  Competitor: "#14B8A6",
  Digital: "#FB7185",
  Residual: "#94A3B8",
};

const HOW_TO_READ = [
  "Each bar decomposes a deviation into its contributing drivers.",
  "The width represents each driver's contribution in percentage points.",
  "Confidence indicates how reliably that driver is isolated.",
  "A multicollinearity flag (MC) means two drivers overlap — the contribution has been dampened to avoid double-counting.",
];

export function DriverAttribution({ data, narrative }: DriverAttributionProps) {
  const departments = useMemo(() => {
    return [...new Set(data.map((d) => d.department))].sort();
  }, [data]);

  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!selectedDept) return data;
    return data.filter((d) => d.department === selectedDept);
  }, [data, selectedDept]);

  const { categories, traces, flags } = useMemo(() => {
    const catSet = [...new Set(filtered.map((d) => d.category))];
    const driverSet = [...new Set(filtered.map((d) => d.driver_name))];

    const traceList = driverSet.map((driver) => {
      const vals = catSet.map((cat) => {
        const row = filtered.find((d) => d.category === cat && d.driver_name === driver);
        return row ? row.contribution_pp : 0;
      });
      return {
        type: "bar" as const,
        name: driver,
        orientation: "h" as const,
        y: catSet,
        x: vals,
        marker: { color: driverColors[driver] || "#64748b" },
        hovertemplate: `${driver}: %{x:.1f}pp<extra></extra>`,
      };
    });

    const flagMap = new Map<string, { confidence: number; multicollinearity: boolean }>();
    for (const row of filtered) {
      if (!flagMap.has(row.category)) {
        flagMap.set(row.category, {
          confidence: row.confidence_score,
          multicollinearity: row.multicollinearity_flag,
        });
      }
      const entry = flagMap.get(row.category)!;
      if (row.multicollinearity_flag) entry.multicollinearity = true;
    }

    return { categories: catSet, traces: traceList, flags: flagMap };
  }, [filtered]);

  // Dynamic insight based on department filter
  const scopedInsight = useMemo(() => {
    if (!filtered.length) return null;
    const scope = selectedDept ? `**${selectedDept}**` : "all departments";

    // Aggregate by driver
    const byDriver: Record<string, { total: number; count: number }> = {};
    filtered.forEach((d) => {
      const name = d.driver_name ?? "Unknown";
      if (!byDriver[name]) byDriver[name] = { total: 0, count: 0 };
      byDriver[name].total += d.contribution_pp ?? 0;
      byDriver[name].count += 1;
    });

    const ranked = Object.entries(byDriver)
      .map(([name, v]) => ({ name, avg: v.total / v.count, count: v.count }))
      .sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg));

    const lines: string[] = [];
    lines.push(`Root cause attribution for ${scope}: **${filtered.length}** driver-category combinations analyzed.`);
    ranked.forEach((d) => {
      lines.push(`**${d.name}**: average contribution **${d.avg > 0 ? "+" : ""}${d.avg.toFixed(2)}pp** across ${d.count} categories.`);
    });

    const dominant = ranked[0];

    // Business Implications
    const implLines: string[] = [];
    if (dominant) {
      if (Math.abs(dominant.avg) > 5) {
        implLines.push(`**${dominant.name}** is the dominant driver at **${dominant.avg.toFixed(2)}pp** — this single factor explains the majority of demand deviation in ${scope}.`);
      }
      const multiSignal = ranked.filter((d) => Math.abs(d.avg) > 1);
      if (multiSignal.length >= 3) {
        implLines.push(`**${multiSignal.length} drivers** contribute meaningfully (>1pp) — this is a multi-signal demand event with compounding effects, not a single-cause anomaly.`);
      }
    }
    const hasMulticoll = filtered.some((d) => d.multicollinearity_flag);
    if (hasMulticoll) {
      implLines.push("Multicollinearity detected between some drivers — contribution estimates may overlap. Treat individual driver values as directional, not exact.");
    }
    if (!implLines.length) implLines.push("Driver contributions are within expected ranges — no structural demand shift detected.");

    // Recommended Actions
    const actLines: string[] = [];
    if (dominant && dominant.name.toLowerCase().includes("weather")) {
      actLines.push("Weather-driven demand is temporary — secure short-term replenishment but avoid over-ordering beyond the forecast window.");
    } else if (dominant && dominant.name.toLowerCase().includes("digital")) {
      actLines.push("Digital/social signal spikes are often short-lived (5-7 days). Monitor decay rate before committing to large inventory positions.");
    } else if (dominant && dominant.name.toLowerCase().includes("promo")) {
      actLines.push("Validate that promotional lift is incremental, not pulled-forward demand. Check post-promo dip patterns from prior campaigns.");
    } else if (dominant && dominant.name.toLowerCase().includes("competitor")) {
      actLines.push("Competitor-driven share gains may be sustainable — assess whether the competitor stockout is temporary or structural.");
    }
    actLines.push("Use the Recovery Timeline below to size the financial impact and determine the optimal intervention window.");
    if (selectedDept) {
      actLines.push(`Switch department filter to compare driver patterns across departments and identify systemic vs. isolated effects.`);
    } else {
      actLines.push("Filter by individual department to isolate department-specific driver patterns for targeted action.");
    }

    return lines.join(" ") + ` |IMPLICATIONS| ${implLines.join(" ")} |ACTIONS| ${actLines.join(" ")}`;
  }, [filtered, selectedDept]);

  if (!data.length) return <div className="text-sm opacity-60 p-4">No driver data available.</div>;

  return (
    <div>
      <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "var(--hex-text, #1e293b)" }}>
        <span className="material-icons-outlined" style={{ fontSize: "20px", color: "#8B5CF6" }}>account_tree</span>
        Root Cause Driver Attribution
      </h3>
      {/* Department filter */}
      {departments.length > 1 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>
            Department:
          </span>
          <button
            onClick={() => setSelectedDept(null)}
            className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: selectedDept === null ? "var(--hex-primary, #7c3aed)" : "var(--hex-surface-2, #0f172a)",
              color: selectedDept === null ? "#fff" : "var(--hex-text-secondary, #94a3b8)",
              border: `1px solid ${selectedDept === null ? "var(--hex-primary, #7c3aed)" : "var(--hex-border, #334155)"}`,
            }}
          >
            All
          </button>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: selectedDept === dept ? "var(--hex-primary, #7c3aed)" : "var(--hex-surface-2, #0f172a)",
                color: selectedDept === dept ? "#fff" : "var(--hex-text-secondary, #94a3b8)",
                border: `1px solid ${selectedDept === dept ? "var(--hex-primary, #7c3aed)" : "var(--hex-border, #334155)"}`,
              }}
            >
              {dept}
            </button>
          ))}
        </div>
      )}

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
                  height: Math.max(300, categories.length * 50 + 80),
                  margin: { l: 160, r: 40, t: 30, b: 50 },
                  font: { family: "Inter, system-ui, sans-serif", color: "#94a3b8", size: 12 },
                  barmode: "relative" as const,
                  xaxis: {
                    title: { text: "Contribution to Deviation (percentage points)", font: { size: 12 } },
                    zeroline: true,
                    zerolinecolor: "#475569",
                    tickfont: { size: 11 },
                  },
                  yaxis: { automargin: true, title: { text: "Product Category", font: { size: 12 } }, tickfont: { size: 11 } },
                  legend: {
                    orientation: "h" as const,
                    y: -0.15,
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
                  height: `${Math.max(300, categories.length * 50 + 80)}px`,
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
                      {f ? `${(f.confidence * 100).toFixed(0)}%` : "\u2014"}
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

        {/* HOW TO READ IT sidebar */}
        <HowToReadIt bullets={HOW_TO_READ} />
      </div>

      <ChartExplainer narrative={scopedInsight || narrative} />
    </div>
  );
}
