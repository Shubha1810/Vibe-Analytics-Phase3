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
  vizNumber?: string;
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

export function VarianceHistogram({ data, narrative, vizNumber }: VarianceHistogramProps) {
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

  // Cap chart display at 250% deviation to exclude outliers — zone counts use full data
  const CHART_MAX_DEVIATION = 250;
  const chartData = useMemo(() => data.filter((d) => d.deviation_bucket <= CHART_MAX_DEVIATION), [data]);
  const chartColors = useMemo(() => chartData.map((d) => bucketColor(d.deviation_bucket)), [chartData]);
  const excludedCount = useMemo(() => {
    return data.filter((d) => d.deviation_bucket > CHART_MAX_DEVIATION).reduce((s, d) => s + d.sku_count, 0);
  }, [data]);

  const computedInsight = useMemo(() => {
    if (!data.length) return null;
    const { totalSkus, mean, stdDev, skew } = stats;
    const { normal, watch, anomaly, normalPct, watchPct, anomalyPct } = zoneCounts;

    const lines: string[] = [];
    lines.push(`Portfolio health scan: **${totalSkus.toLocaleString()}** category-region combinations analyzed. **${normalPct}%** (${normal.toLocaleString()}) within normal ±10% variance band.`);
    lines.push(`**${watch}** combinations (**${watchPct}%**) in the watch zone (±10-20%), **${anomaly}** (**${anomalyPct}%**) flagged as true anomalies (≥20% deviation).`);
    lines.push(`Distribution: mean **${mean.toFixed(1)}%**, std dev **${stdDev.toFixed(1)}**, skew **${skew.toFixed(2)}**.`);
    
    if (Number(normalPct) < 50) {
      lines.push(`Less than half the portfolio is within normal range — this signals broad forecast stress.`);
    }

    // Implications
    const implLines: string[] = [];
    if (Number(anomalyPct) > 30) {
      implLines.push(`Over **${anomalyPct}%** of the portfolio shows extreme deviation (>20%) — the baseline forecast may need emergency recalibration.`);
    } else if (Number(anomalyPct) > 15) {
      implLines.push(`**${anomalyPct}%** extreme-deviation SKUs is above typical thresholds — targeted forecast adjustments are warranted.`);
    } else {
      implLines.push(`Anomaly rate of **${anomalyPct}%** is within manageable range — standard monitoring cycles should suffice.`);
    }
    if (Math.abs(skew) > 0.5) {
      implLines.push(`Distribution skew of **${skew.toFixed(2)}** indicates ${skew > 0 ? "more over-forecasting (right tail) — stockout risk is elevated" : "more under-forecasting (left tail) — markdown and overstock exposure"}.`);
    }

    // Actions
    const actLines: string[] = [];
    actLines.push(`Flag the **${anomaly}** extreme-deviation SKUs for immediate root cause investigation.`);
    if (Number(watchPct) > 25) {
      actLines.push(`The **${watch}** watch-zone SKUs should be reviewed in the next weekly planning cycle to prevent escalation.`);
    }
    actLines.push("Use the distribution shape to determine if issues are broad (flat) or concentrated (long tail) — this determines whether a systemic or targeted response is needed.");

    return lines.join(" ") + ` |IMPLICATIONS| ${implLines.join(" ")} |ACTIONS| ${actLines.join(" ")}`;
  }, [data, stats, zoneCounts]);

  if (!data.length) return <div className="text-sm opacity-60 p-4">No variance data available.</div>;

  return (
    <div>
      <h3 className="text-base font-bold mb-3 flex items-center gap-1" style={{ color: "var(--hex-text, #1e293b)" }}>
        <span className="material-icons-outlined" style={{ fontSize: "20px", color: "#10B981" }}>monitoring</span>
        {vizNumber && <span className="font-mono text-sm mr-1 opacity-70">{vizNumber}</span>}Portfolio Health Overview
      </h3>
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
            Anomaly beyond ±20% — {zoneCounts.anomaly} SKUs · {zoneCounts.anomalyPct}%
          </span>
        </div>
      </div>

      <div className="flex gap-4 max-lg:flex-col">
        <div
          className="flex-1 rounded-xl border"
          style={{
            borderColor: "var(--hex-border, #334155)",
            background: "var(--hex-surface-1, #1e293b)",
          }}
        >
          {/* Stats strip */}
          <div className="flex flex-wrap gap-3 px-3 pt-3 pb-1">
            {[
              { label: "Analyzed", value: stats.totalSkus.toLocaleString() },
              { label: "Mean", value: `${stats.mean.toFixed(1)}%` },
              { label: "Median", value: `${stats.median}%` },
              { label: "Std Dev", value: stats.stdDev.toFixed(1) },
              { label: "Skew", value: stats.skew.toFixed(2) },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 text-xs">
                <span style={{ color: "var(--hex-text-dim, #64748b)" }}>{s.label}:</span>
                <span className="font-mono font-semibold" style={{ color: "var(--hex-text, #e2e8f0)" }}>{s.value}</span>
              </div>
            ))}
          </div>
          {/* Chart */}
          <div className="p-2">
            <Plot
              data={[
                {
                  type: "bar" as const,
                  x: chartData.map((d) => `${d.deviation_bucket}%`),
                  y: chartData.map((d) => d.sku_count),
                  marker: { color: chartColors },
                  hovertemplate: "Bucket: %{x}<br>Count: %{y}<extra></extra>",
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
          {excludedCount > 0 && (
            <p className="text-[10px] px-3 pb-2" style={{ color: "var(--hex-text-dim, #64748b)" }}>
              {excludedCount} outlier combination{excludedCount !== 1 ? "s" : ""} (&gt;250% deviation) excluded from chart for readability. Zone counts include all data.
            </p>
          )}
        </div>

        <HowToReadIt bullets={HOW_TO_READ} />
      </div>
      <div
        className="mt-3 rounded-lg px-4 py-2.5 text-sm leading-relaxed"
        style={{
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.15)",
          color: "var(--hex-text, #e2e8f0)",
        }}
      >
            The portfolio is {Number(zoneCounts.normalPct) >= 70 ? "healthy" : "under stress"} — <strong>{zoneCounts.normalPct}%</strong> of category-region combinations sit inside the ±10% band. Only <strong>{zoneCounts.anomaly}</strong> are true anomalies
            {stats.totalSkus > 0 && <>, representing <strong>{zoneCounts.anomalyPct}%</strong> of combinations at stake</>}.
      </div>

      <ChartExplainer narrative={computedInsight || narrative} />
    </div>
  );
}
