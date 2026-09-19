"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import type { VarianceBucket } from "@/lib/orchestration-types";
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

interface VarianceHistogramProps {
  data: VarianceBucket[];
  narrative?: string | null;
}

function bucketColor(bucket: number): string {
  const abs = Math.abs(bucket);
  if (abs >= 20) return "#EF4444";
  if (abs >= 10) return "#F59E0B";
  return "#10B981";
}

const HOW_TO_READ = [
  "Each bar counts SKUs whose forecast deviation falls in a 5-percentage-point band.",
  "Green bars (±10%) represent normal forecast variance — no action needed.",
  "Amber bars (10–20%) are the watch zone — monitor but don't panic.",
  "Red bars (beyond ±20%) are true anomalies that need investigation.",
  "A healthy portfolio forms a tight bell curve centered near 0%.",
  "The Portfolio Health card shows distributional statistics for the entire SKU set.",
];

export function VarianceHistogram({ data, narrative }: VarianceHistogramProps) {
  const { stats, colors, zoneCounts } = useMemo(() => {
    const totalSkus = data.reduce((s, d) => s + d.sku_count, 0);
    const weightedSum = data.reduce((s, d) => s + d.deviation_bucket * d.sku_count, 0);
    const mean = totalSkus ? weightedSum / totalSkus : 0;

    const sorted = data
      .flatMap((d) => Array(d.sku_count).fill(d.deviation_bucket))
      .sort((a: number, b: number) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

    const varianceSum = data.reduce(
      (s, d) => s + d.sku_count * (d.deviation_bucket - mean) ** 2,
      0
    );
    const stdDev = totalSkus ? Math.sqrt(varianceSum / totalSkus) : 0;

    const m3 = data.reduce(
      (s, d) => s + d.sku_count * ((d.deviation_bucket - mean) / (stdDev || 1)) ** 3,
      0
    );
    const skew = totalSkus ? m3 / totalSkus : 0;

    const normal = data.filter((d) => Math.abs(d.deviation_bucket) < 10).reduce((s, d) => s + d.sku_count, 0);
    const watch = data.filter((d) => Math.abs(d.deviation_bucket) >= 10 && Math.abs(d.deviation_bucket) < 20).reduce((s, d) => s + d.sku_count, 0);
    const anomaly = data.filter((d) => Math.abs(d.deviation_bucket) >= 20).reduce((s, d) => s + d.sku_count, 0);

    return {
      stats: { mean, median, stdDev, skew, totalSkus },
      colors: data.map((d) => bucketColor(d.deviation_bucket)),
      zoneCounts: {
        normal,
        watch,
        anomaly,
        normalPct: totalSkus ? ((normal / totalSkus) * 100).toFixed(0) : "0",
        watchPct: totalSkus ? ((watch / totalSkus) * 100).toFixed(0) : "0",
        anomalyPct: totalSkus ? ((anomaly / totalSkus) * 100).toFixed(0) : "0",
      },
    };
  }, [data]);

  if (!data.length) return <div className="text-sm opacity-60 p-4">No variance data available.</div>;

  return (
    <div>
      {/* Zone labels */}
      <div className="flex flex-wrap gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ background: "#10B981" }} />
          <span className="text-xs" style={{ color: "var(--hex-text-secondary, #94a3b8)", fontWeight: 600 }}>
            Normal -10% to +10% — {zoneCounts.normal} SKUs · {zoneCounts.normalPct}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ background: "#F59E0B" }} />
          <span className="text-xs" style={{ color: "var(--hex-text-secondary, #94a3b8)", fontWeight: 600 }}>
            Watch ±10-20% — {zoneCounts.watch} SKUs · {zoneCounts.watchPct}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ background: "#EF4444" }} />
          <span className="text-xs" style={{ color: "var(--hex-text-secondary, #94a3b8)", fontWeight: 600 }}>
            Anomaly ≥20% — {zoneCounts.anomaly} SKUs · {zoneCounts.anomalyPct}%
          </span>
        </div>
      </div>

      <div className="flex gap-4 max-lg:flex-col">
        <div className="flex-1 flex gap-4">
          {/* Chart */}
          <div
            className="flex-1 rounded-xl border p-2"
            style={{
              borderColor: "var(--hex-border, #334155)",
              background: "var(--hex-surface-1, #1e293b)",
            }}
          >
            <Plot
              data={[
                {
                  type: "bar" as const,
                  x: data.map((d) => `${d.deviation_bucket}%`),
                  y: data.map((d) => d.sku_count),
                  marker: { color: colors },
                  hovertemplate: "Bucket: %{x}<br>SKUs: %{y}<extra></extra>",
                },
              ]}
              layout={{
                height: 360,
                margin: { l: 50, r: 20, t: 30, b: 60 },
                font: { family: "Inter, system-ui, sans-serif", color: "#94a3b8", size: 12 },
                xaxis: { title: { text: "Deviation from Forecast (%)<br><sub>Lower edge of each 5-point band</sub>", font: { size: 12 } }, tickfont: { size: 11 } },
                yaxis: { title: { text: "Number of SKUs", font: { size: 12 } }, tickfont: { size: 11 } },
                autosize: true,
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                bargap: 0.15,
              }}
              config={{ displayModeBar: false, responsive: true }}
              useResizeHandler
              style={{ width: "100%", height: "360px" }}
            />
          </div>

          {/* Portfolio Health panel */}
          <div
            className="w-48 flex-shrink-0 rounded-xl border p-4 flex flex-col gap-3 text-sm"
            style={{
              borderColor: "var(--hex-border, #334155)",
              background: "var(--hex-surface-1, #1e293b)",
            }}
          >
            <div
              className="font-semibold text-xs uppercase tracking-wider mb-1"
              style={{ color: "var(--hex-text-secondary, #94a3b8)" }}
            >
              Portfolio Health
            </div>
            {[
              { label: "Total SKUs", value: stats.totalSkus.toLocaleString() },
              { label: "Mean", value: `${stats.mean.toFixed(1)}%` },
              { label: "Median", value: `${stats.median}%` },
              { label: "Std Dev", value: stats.stdDev.toFixed(1) },
              { label: "Skew", value: stats.skew.toFixed(2) },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xs" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>
                  {s.label}
                </div>
                <div className="font-mono font-semibold" style={{ color: "var(--hex-text, #e2e8f0)" }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HOW TO READ IT sidebar */}
        <HowToReadIt bullets={HOW_TO_READ} />
      </div>

      {/* Bottom summary */}
      <div
        className="mt-3 rounded-lg px-4 py-2.5 text-sm leading-relaxed"
        style={{
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.15)",
          color: "var(--hex-text, #e2e8f0)",
        }}
      >
        The portfolio is {Number(zoneCounts.normalPct) >= 70 ? "healthy" : "under stress"} — <strong>{zoneCounts.normalPct}%</strong> of SKUs sit inside the ±10% band. Only <strong>{zoneCounts.anomaly}</strong> SKUs are true anomalies
        {stats.totalSkus > 0 && <>, representing <strong>{zoneCounts.anomalyPct}%</strong> of SKUs at stake</>}.
      </div>

      <ChartExplainer narrative={narrative} />
    </div>
  );
}
