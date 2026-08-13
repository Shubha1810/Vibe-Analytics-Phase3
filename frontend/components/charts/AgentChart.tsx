"use client";

import { useRef, useEffect, forwardRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import annotationPlugin from "chartjs-plugin-annotation";
import { Bar, Doughnut } from "react-chartjs-2";
import { CHART_PALETTE } from "@/lib/constants";
import type { ChartConfig } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler, ChartDataLabels, annotationPlugin);

interface Props {
  columns: string[];
  rows: unknown[][];
  chartConfig?: ChartConfig;
}

function resolveChartType(config?: ChartConfig): "bar" | "horizontalBar" | "doughnut" | "heatmap" {
  if (!config) return "bar";
  const ct = config.chart_type.toLowerCase();
  if (ct.includes("heatmap") || ct.includes("heat")) return "heatmap";
  if (ct === "bar_h" || ct === "horizontal" || ct.includes("horizontal")) return "horizontalBar";
  if (ct.includes("pie") || ct.includes("doughnut") || ct.includes("donut")) return "doughnut";
  return "bar";
}

function getColumnIndex(columns: string[], colName?: string): number {
  if (!colName) return -1;
  const upper = colName.toUpperCase();
  return columns.findIndex((c) => c.toUpperCase() === upper);
}

function formatColumnName(col: string): string {
  return col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function detectNumberFormat(values: number[], colName: string): string {
  const colLower = colName.toLowerCase();
  if (colLower.includes("pct") || colLower.includes("percent") || colLower.includes("gap") || colLower.includes("margin") || colLower.includes("rate") || colLower.includes("ratio")) {
    return "pct";
  }
  if (colLower.includes("revenue") || colLower.includes("price") || colLower.includes("cost") || colLower.includes("sales") || colLower.includes("spend")) {
    return "currency";
  }
  const absValues = values.map(Math.abs).filter((v) => v > 0);
  if (absValues.length > 0) {
    const maxVal = Math.max(...absValues);
    if (maxVal <= 1) return "pct_decimal";
    if (maxVal <= 100 && absValues.every((v) => v <= 100)) return "pct";
  }
  return "auto";
}

function formatValue(value: number, fmt?: string): string {
  if (fmt === "pct" || fmt === "percent" || fmt === "percentage") {
    return `${value.toFixed(1)}%`;
  }
  if (fmt === "pct_decimal") {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (fmt === "currency" || fmt === "usd" || fmt === "dollar") {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}K`;
    return `$${value.toFixed(0)}`;
  }
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function generateInsight(labels: string[], values: number[], fmt: string, title?: string): string {
  if (labels.length === 0 || values.length === 0) return "";

  const maxIdx = values.indexOf(Math.max(...values));
  const minIdx = values.indexOf(Math.min(...values));
  const maxLabel = labels[maxIdx];
  const minLabel = labels[minIdx];
  const maxVal = formatValue(values[maxIdx], fmt);
  const minVal = formatValue(values[minIdx], fmt);

  const hasNegatives = values.some((v) => v < 0);
  const allNegative = values.every((v) => v < 0);
  const range = Math.abs(values[maxIdx] - values[minIdx]);
  const rangeFormatted = formatValue(range, fmt);

  if (allNegative) {
    return `${labels[maxIdx]} shows the narrowest gap at ${maxVal}, while ${labels[minIdx]} has the widest at ${minVal}. The spread across all ${labels.length} categories is ${rangeFormatted}, indicating varying pressure across segments.`;
  }

  if (hasNegatives) {
    const posCount = values.filter((v) => v >= 0).length;
    const negCount = values.filter((v) => v < 0).length;
    return `${posCount} categories show positive values (best: ${maxLabel} at ${maxVal}) while ${negCount} show negative (lowest: ${minLabel} at ${minVal}). The total range spans ${rangeFormatted} across ${labels.length} entries.`;
  }

  return `${maxLabel} leads with ${maxVal}, while ${minLabel} is lowest at ${minVal}. Across ${labels.length} categories, the range spans ${rangeFormatted}${title ? `, reflecting the distribution of ${title.toLowerCase().replace(/by\s+\w+/i, "").trim()}` : ""}.`;
}

function generateGradientColors(values: number[], baseColor: string): string[] {
  const max = Math.max(...values.map(Math.abs));
  if (max === 0) return values.map(() => baseColor);
  return values.map((v) => {
    const intensity = 0.4 + (Math.abs(v) / max) * 0.6;
    return `rgba(60, 44, 218, ${intensity})`;
  });
}

export default function AgentChart({ columns, rows, chartConfig }: Props) {
  const chartType = resolveChartType(chartConfig);
  const isHorizontal = chartType === "horizontalBar";

  let labelIdx: number;
  let valueIdx: number;

  if (chartConfig?.x && chartConfig?.y) {
    const xi = getColumnIndex(columns, chartConfig.x);
    const yi = getColumnIndex(columns, chartConfig.y);
    if (isHorizontal) {
      labelIdx = yi >= 0 ? yi : 0;
      valueIdx = xi >= 0 ? xi : 1;
    } else {
      labelIdx = xi >= 0 ? xi : 0;
      valueIdx = yi >= 0 ? yi : 1;
    }
  } else {
    const numericColIdx = columns.findIndex((_, ci) => {
      const numericCount = rows.filter((r) => {
        const v = r[ci];
        return typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)));
      }).length;
      return numericCount > rows.length * 0.5;
    });

    if (numericColIdx >= 0) {
      valueIdx = numericColIdx;
      labelIdx = numericColIdx === 0 ? (columns.length > 1 ? 1 : 0) : 0;
    } else {
      labelIdx = 0;
      valueIdx = columns.length > 1 ? 1 : 0;
    }
  }

  let labels = rows.map((r) => String(r[labelIdx] != null ? r[labelIdx] : ""));
  let values = rows.map((r) => {
    const v = r[valueIdx];
    return typeof v === "number" ? v : parseFloat(String(v)) || 0;
  });

  const hasData = values.some((v) => v !== 0);
  if (!hasData) return null;

  if (chartConfig?.sort) {
    const paired = labels.map((l, i) => ({ label: l, value: values[i] }));
    if (chartConfig.sort === "asc") {
      paired.sort((a, b) => a.value - b.value);
    } else {
      paired.sort((a, b) => b.value - a.value);
    }
    labels = paired.map((p) => p.label);
    values = paired.map((p) => p.value);
  }

  const valueColName = columns[valueIdx] || "Value";
  const labelColName = columns[labelIdx] || "Category";
  const xAxisLabel = isHorizontal ? formatColumnName(valueColName) : formatColumnName(labelColName);
  const yAxisLabel = isHorizontal ? formatColumnName(labelColName) : formatColumnName(valueColName);

  const numberFmt = chartConfig?.number_fmt || detectNumberFormat(values, valueColName);

  const title = chartConfig?.title || `${formatColumnName(valueColName)} by ${formatColumnName(labelColName)}`;
  const subtitle = chartConfig?.subtitle;

  const insight = generateInsight(labels, values, numberFmt, title);

  if (chartType === "heatmap") {
    return <HeatmapCanvas columns={columns} rows={rows} title={title} subtitle={subtitle} insight={insight} />;
  }

  if (chartType === "doughnut") {
    const doughnutInsight = generateInsight(labels, values, numberFmt, title);
    return (
      <div className="rounded-xl p-5 mt-3 border border-[var(--border-color)]" style={{ background: "var(--hex-surface-1)" }}>
        <div className="text-sm font-semibold text-[var(--hex-text)] mb-0.5">{title}</div>
        {subtitle && <div className="text-[10px] text-[var(--hex-text-muted)] mb-2">{subtitle}</div>}
        <div style={{ height: "280px" }}>
          <Doughnut
            data={{
              labels,
              datasets: [{
                data: values,
                backgroundColor: CHART_PALETTE.slice(0, labels.length),
                borderWidth: 2,
                borderColor: "white",
                hoverOffset: 12,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: "55%",
              plugins: {
                legend: { position: "right", labels: { color: "#1A1A2E", font: { size: 11, family: "Inter", weight: "bold" }, padding: 14, usePointStyle: true, pointStyle: "circle" } },
                datalabels: { display: false },
                annotation: { annotations: {} },
                tooltip: {
                  backgroundColor: "rgba(26,26,46,0.95)",
                  titleFont: { size: 12, family: "Inter", weight: "bold" },
                  bodyFont: { size: 11, family: "Inter" },
                  padding: 12,
                  cornerRadius: 8,
                  callbacks: {
                    label: (ctx) => {
                      const val = ctx.parsed;
                      const total = values.reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
                      return ` ${formatValue(val, numberFmt)} (${pct}%)`;
                    },
                  },
                },
              },
            }}
          />
        </div>
        {doughnutInsight && (
          <div className="mt-3 px-3 py-2.5 rounded-lg bg-[var(--hex-surface-2)] border-l-3 border-[var(--hex-primary)]" style={{ borderLeft: "3px solid var(--hex-primary)" }}>
            <div className="flex items-start gap-2">
              <span className="material-icons-outlined text-[var(--hex-primary)] flex-shrink-0 mt-0.5" style={{ fontSize: "14px" }}>insights</span>
              <p className="text-[11px] text-[var(--hex-text-dim)] leading-relaxed m-0">{doughnutInsight}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Bar chart (vertical or horizontal)
  const hasHighlight = chartConfig?.highlight;
  const hasNegatives = values.some((v) => v < 0);

  let barColors: string[];
  if (hasHighlight) {
    const colorNeg = hasHighlight.color_neg || "#EF4444";
    const colorPos = hasHighlight.color_pos || "#10B981";
    barColors = values.map((v) => v < 0 ? colorNeg : colorPos);
  } else if (hasNegatives) {
    barColors = values.map((v) => v < 0 ? "#EF4444" : "#10B981");
  } else {
    barColors = generateGradientColors(values, CHART_PALETTE[0]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const annotations: Record<string, any> = {};
  if (chartConfig?.ref_line) {
    const rl = chartConfig.ref_line;
    const isXAxis = rl.axis === "x";
    annotations["refLine"] = {
      type: "line",
      scaleID: isHorizontal ? (isXAxis ? "x" : "y") : (isXAxis ? "x" : "y"),
      value: rl.value,
      borderColor: "#374151",
      borderWidth: 2,
      borderDash: [6, 4],
      label: {
        display: !!rl.label,
        content: rl.label || "",
        position: "start",
        backgroundColor: "rgba(55,65,81,0.9)",
        color: "#fff",
        font: { size: 9, family: "Inter", weight: "bold" },
        padding: { top: 3, bottom: 3, left: 8, right: 8 },
      },
    };
  }

  const showDataLabels = chartConfig?.data_labels !== false;

  return (
    <div className="rounded-xl p-5 mt-3 border border-[var(--border-color)]" style={{ background: "var(--hex-surface-1)" }}>
      <div className="text-sm font-semibold text-[var(--hex-text)] mb-0.5">{title}</div>
      {subtitle && <div className="text-[10px] text-[var(--hex-text-muted)] mb-2">{subtitle}</div>}
      <div style={{ height: "320px" }}>
        <Bar
          data={{
            labels,
            datasets: [{
              data: values,
              backgroundColor: barColors,
              borderWidth: 0,
              borderRadius: 6,
              barPercentage: 0.7,
            }],
          }}
          options={{
            indexAxis: isHorizontal ? "y" : "x",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              datalabels: showDataLabels ? {
                anchor: isHorizontal ? "end" : "end",
                align: isHorizontal ? "right" : "top",
                color: "#374151",
                font: { size: 10, weight: "bold", family: "Inter" },
                formatter: (value: number) => formatValue(value, numberFmt),
              } : { display: false },
              annotation: { annotations },
              tooltip: {
                backgroundColor: "rgba(26,26,46,0.95)",
                titleFont: { size: 12, family: "Inter", weight: "bold" },
                bodyFont: { size: 11, family: "Inter" },
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                  title: (items) => items[0]?.label || "",
                  label: (ctx) => {
                    const val = ctx.parsed[isHorizontal ? "x" : "y"] ?? 0;
                    const rank = values.indexOf(val) + 1;
                    return ` ${formatValue(val, numberFmt)}  (#${rank} of ${values.length})`;
                  },
                },
              },
            },
            scales: {
              x: {
                grid: { color: "rgba(0,0,0,0.04)", drawTicks: false },
                title: {
                  display: true,
                  text: xAxisLabel,
                  color: "#6B7280",
                  font: { size: 11, family: "Inter", weight: "bold" },
                  padding: { top: 8 },
                },
                ticks: {
                  color: "#6B7280",
                  font: { size: 10, family: "Inter" },
                  maxRotation: isHorizontal ? 0 : 45,
                  callback: isHorizontal ? function(value) { return formatValue(Number(value), numberFmt); } : undefined,
                },
              },
              y: {
                grid: { color: "rgba(0,0,0,0.04)", drawTicks: false },
                title: {
                  display: !isHorizontal,
                  text: yAxisLabel,
                  color: "#6B7280",
                  font: { size: 11, family: "Inter", weight: "bold" },
                  padding: { bottom: 8 },
                },
                ticks: {
                  color: "#6B7280",
                  font: { size: 10, family: "Inter" },
                  callback: !isHorizontal ? function(value) { return formatValue(Number(value), numberFmt); } : undefined,
                },
              },
            },
          }}
        />
      </div>
      {insight && (
        <div className="mt-3 px-3 py-2.5 rounded-lg bg-[var(--hex-surface-2)]" style={{ borderLeft: "3px solid var(--hex-primary)" }}>
          <div className="flex items-start gap-2">
            <span className="material-icons-outlined text-[var(--hex-primary)] flex-shrink-0 mt-0.5" style={{ fontSize: "14px" }}>insights</span>
            <p className="text-[11px] text-[var(--hex-text-dim)] leading-relaxed m-0">{insight}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* Heatmap — custom canvas rendering */
const HeatmapCanvas = forwardRef<HTMLCanvasElement, {
  columns: string[];
  rows: unknown[][];
  title?: string;
  subtitle?: string;
  insight?: string;
}>(function HeatmapCanvas({ rows, title, subtitle, insight }, _ref) {
  const localRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = localRef.current;
    if (!canvas || rows.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rowLabels = [...new Set(rows.map((r) => String(r[0] ?? "")))];
    const colLabels = [...new Set(rows.map((r) => String(r[1] ?? "")))];
    const dataMap: Record<string, number> = {};
    let minVal = Infinity, maxVal = -Infinity;

    for (const r of rows) {
      const key = String(r[0]) + "||" + String(r[1]);
      const v = typeof r[2] === "number" ? r[2] : parseFloat(String(r[2])) || 0;
      dataMap[key] = v;
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }

    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth - 32;
    const h = 280;
    canvas.width = w;
    canvas.height = h;

    const leftMargin = 100;
    const topMargin = 30;
    const cellW = (w - leftMargin) / colLabels.length;
    const cellH = (h - topMargin) / rowLabels.length;

    ctx.clearRect(0, 0, w, h);

    ctx.font = "bold 10px Inter";
    ctx.fillStyle = "#374151";
    ctx.textAlign = "center";
    colLabels.forEach((c, ci) => {
      ctx.fillText(c.slice(0, 12), leftMargin + ci * cellW + cellW / 2, topMargin - 8);
    });

    rowLabels.forEach((rl, ri) => {
      ctx.fillStyle = "#374151";
      ctx.textAlign = "right";
      ctx.font = "bold 10px Inter";
      ctx.fillText(rl.slice(0, 14), leftMargin - 8, topMargin + ri * cellH + cellH / 2 + 4);

      colLabels.forEach((cl, ci) => {
        const key = rl + "||" + cl;
        const v = dataMap[key] ?? 0;
        const norm = maxVal === minVal ? 0.5 : (v - minVal) / (maxVal - minVal);
        const r2 = Math.round(60 * (1 - norm));
        const g = Math.round(44 + norm * 140);
        const b = Math.round(218 * (1 - norm) + norm * 50);
        ctx.fillStyle = `rgb(${r2},${g},${b})`;
        ctx.fillRect(leftMargin + ci * cellW + 1, topMargin + ri * cellH + 1, cellW - 2, cellH - 2);

        ctx.fillStyle = norm > 0.5 ? "#ffffff" : "#1A1A2E";
        ctx.font = "bold 9px Inter";
        ctx.textAlign = "center";
        const label = Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(1);
        ctx.fillText(label, leftMargin + ci * cellW + cellW / 2, topMargin + ri * cellH + cellH / 2 + 3);
      });
    });
  }, [rows]);

  return (
    <div className="rounded-xl p-4 mt-3 border border-[var(--border-color)]" style={{ background: "var(--hex-surface-1)" }}>
      {title && <div className="text-sm font-semibold text-[var(--hex-text)] mb-0.5">{title}</div>}
      {subtitle && <div className="text-[10px] text-[var(--hex-text-muted)] mb-3">{subtitle}</div>}
      <canvas ref={localRef} style={{ width: "100%", height: "280px" }} />
      {insight && (
        <div className="mt-3 px-3 py-2.5 rounded-lg bg-[var(--hex-surface-2)]" style={{ borderLeft: "3px solid var(--hex-primary)" }}>
          <div className="flex items-start gap-2">
            <span className="material-icons-outlined text-[var(--hex-primary)] flex-shrink-0 mt-0.5" style={{ fontSize: "14px" }}>insights</span>
            <p className="text-[11px] text-[var(--hex-text-dim)] leading-relaxed m-0">{insight}</p>
          </div>
        </div>
      )}
    </div>
  );
});
