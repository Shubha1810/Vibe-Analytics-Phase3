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

  if (!data.length) return <div className="text-sm opacity-60 p-4">No driver data available.</div>;

  return (
    <div>
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

      <ChartExplainer narrative={narrative} />
    </div>
  );
}
