"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import type { RecoveryPoint } from "@/lib/orchestration-types";
import { HowToReadIt } from "./HowToReadIt";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full animate-pulse rounded-xl flex items-center justify-center" style={{ background: "var(--hex-surface-1, #1e293b)" }}>Loading chart...</div>,
});

interface RecoveryTimelineProps {
  data: RecoveryPoint[];
  narrative?: string | null;
}

const driverColors: Record<string, string> = {
  Weather: "#6366F1",
  Promotion: "#F59E0B",
  Competitor: "#14B8A6",
  Digital: "#FB7185",
  Residual: "#94A3B8",
};
const defaultDriverColor = "#6366F1";

const howToReadBullets = [
  "14-day demand projection from today.",
  "Each colored band represents one driver's contribution to the deviation.",
  "The spike holds while multiple drivers overlap, then decays as each fades (e.g. promotion ends Day 5, heat wave eases Day 7).",
  "The baseline is the Blue Yonder forecast that existed before the anomaly.",
];

export function RecoveryTimeline({ data, narrative }: RecoveryTimelineProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { traces, shapes, annotations } = useMemo<{ traces: any[]; shapes: any[]; annotations: any[] }>(() => {
    const groups = new Map<string, RecoveryPoint[]>();
    for (const pt of data) {
      const key = `${pt.category} (${pt.risk_type})`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(pt);
    }

    const sortedGroups = [...groups.entries()]
      .sort((a, b) => {
        const maxA = Math.max(...a[1].map(p => p.total_value_at_risk));
        const maxB = Math.max(...b[1].map(p => p.total_value_at_risk));
        return maxB - maxA;
      })
      .slice(0, 5);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const traceList: any[] = [];

    // Baseline reference line
    if (sortedGroups.length > 0) {
      const allPoints = sortedGroups.flatMap(([, pts]) => pts);
      const minVal = Math.min(...allPoints.map(p => p.recoverable_value));
      traceList.push({
        type: "scatter",
        mode: "lines",
        name: "Intervention Cost Baseline",
        x: [0, 14],
        y: [minVal * 0.3, minVal * 0.3],
        line: { color: "#374151", width: 2, dash: "dash" },
        marker: { size: 0 },
        hovertemplate: "Baseline forecast<extra></extra>",
      });
    }

    // Main demand trajectory lines per group
    sortedGroups.forEach(([key, points], i) => {
      const sorted = [...points].sort((a, b) => a.days_from_now - b.days_from_now);
      const colors = Object.values(driverColors);
      const color = colors[i % colors.length] || defaultDriverColor;

      traceList.push({
        type: "scatter",
        mode: "lines+markers",
        name: key,
        x: sorted.map(p => p.days_from_now),
        y: sorted.map(p => p.recoverable_value),
        line: { color, width: 2.5 },
        marker: { size: 5, color },
        fill: "tozeroy",
        fillcolor: color.replace(")", ",0.08)").replace("rgb", "rgba"),
        hovertemplate: `<b>${key}</b><br>Day %{x}: $%{y:,.0f} recoverable<extra></extra>`,
      });
    });

    // Action window shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shapeList: any[] = [{
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: 0,
      x1: 3,
      y0: 0,
      y1: 1,
      fillcolor: "rgba(16, 185, 129, 0.08)",
      line: { width: 0 },
    }];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const annotList: any[] = [{
      x: 1.5,
      y: 1,
      xref: "x",
      yref: "paper",
      text: "Action Window",
      showarrow: false,
      font: { size: 10, color: "#22c55e" },
      yanchor: "bottom",
    }];

    // Driver fade annotations
    const driverFadeMap: Record<string, number> = { Promotion: 5, Weather: 7, Competitor: 10, Digital: 12 };
    Object.entries(driverFadeMap).forEach(([driver, day]) => {
      annotList.push({
        x: day,
        y: 0,
        xref: "x",
        yref: "paper",
        text: `${driver} fades`,
        showarrow: true,
        arrowhead: 0,
        arrowcolor: driverColors[driver] || "#94a3b8",
        ax: 0,
        ay: -25,
        font: { size: 9, color: driverColors[driver] || "#94a3b8" },
      });
    });

    // Intervention cost reference
    if (sortedGroups.length > 0) {
      const firstGroup = sortedGroups[0][1];
      const firstPoint = firstGroup[0];
      if (firstPoint?.intervention_cost > 0) {
        traceList.push({
          type: "scatter",
          mode: "lines",
          name: "Intervention Cost",
          x: [0, 14],
          y: [firstPoint.intervention_cost, firstPoint.intervention_cost],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          line: { color: "#94a3b8", width: 1, dash: "dash" } as any,
          marker: { size: 0 },
          hovertemplate: "Intervention cost: $%{y:,.0f}<extra></extra>",
        });

        if (firstPoint.benefit_cost_ratio > 0) {
          annotList.push({
            x: 7,
            y: firstPoint.intervention_cost,
            xref: "x",
            yref: "y",
            text: `BCR: ${firstPoint.benefit_cost_ratio.toFixed(1)}x`,
            showarrow: false,
            font: { size: 10, color: "#94a3b8" },
            yanchor: "bottom",
          });
        }
      }
    }

    return { traces: traceList, shapes: shapeList, annotations: annotList };
  }, [data]);

  if (!data.length) return <div className="text-sm opacity-60 p-4">No recovery data available.</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-start">
        <div className="flex-1 rounded-xl border p-2" style={{ borderColor: "var(--hex-border, #334155)", background: "var(--hex-surface-1, #1e293b)" }}>
          <Plot
            data={traces}
            layout={{
              height: 420,
              margin: { l: 70, r: 40, t: 30, b: 60 },
              font: { family: "Inter, system-ui, sans-serif", color: "#94a3b8", size: 12 },
              xaxis: { title: { text: "Days from Now", font: { size: 12 } }, range: [0, 14], gridcolor: "rgba(148,163,184,0.1)", tickfont: { size: 11 } },
              yaxis: { title: { text: "Recoverable Value ($)", font: { size: 12 } }, tickformat: ",.0f", gridcolor: "rgba(148,163,184,0.1)", tickfont: { size: 11 } },
              legend: { orientation: "h" as const, y: -0.22, x: 0.5, xanchor: "center" as const, font: { size: 11 } },
              shapes,
              annotations,
              autosize: true,
              paper_bgcolor: "rgba(0,0,0,0)",
              plot_bgcolor: "rgba(0,0,0,0)",
            }}
            config={{ displayModeBar: false, responsive: true }}
            useResizeHandler
            style={{ width: "100%", height: "420px" }}
          />
        </div>
        <HowToReadIt bullets={howToReadBullets} />
      </div>

      {narrative && (
        <div className="rounded-xl border border-[var(--border-color)] p-4" style={{ background: "rgba(60,44,218,0.04)" }}>
          <p className="text-xs font-semibold text-[var(--hex-text-dim)] uppercase tracking-wider mb-2">AI Narrative</p>
          <p className="text-sm text-[var(--hex-text)] leading-relaxed">{narrative}</p>
        </div>
      )}
    </div>
  );
}
