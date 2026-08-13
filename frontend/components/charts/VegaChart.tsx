"use client";

import { useRef, useEffect } from "react";
import embed from "vega-embed";

interface Props {
  spec: Record<string, unknown>;
}

type VegaSpec = Record<string, unknown> & {
  mark?: string | { type?: string };
  encoding?: Record<string, unknown>;
  data?: { values?: unknown[] };
};

function getMarkType(spec: VegaSpec): string {
  const mark = spec.mark;
  if (typeof mark === "string") return mark;
  if (mark && typeof mark === "object" && typeof mark.type === "string") return mark.type;
  return "";
}

function computeHeatmapHeight(spec: VegaSpec): number {
  const values = (spec.data?.values as Array<Record<string, unknown>> | undefined) ?? [];
  const encoding = (spec.encoding ?? {}) as Record<string, { field?: string }>;
  const yField = encoding.y?.field;
  if (!yField || values.length === 0) return 320;
  const distinctY = new Set(values.map((v) => String(v[yField] ?? ""))).size;
  return Math.max(220, Math.min(640, distinctY * 36 + 80));
}

export default function VegaChart({ spec }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !spec) return;

    const { title: _title, ...specWithoutTitle } = spec as VegaSpec;
    const markType = getMarkType(spec as VegaSpec);
    const isHeatmap = markType === "rect";

    const baseConfig: Record<string, unknown> = {
      font: "Inter, system-ui, sans-serif",
      title: { fontSize: 13, fontWeight: 600, color: "#1A1A2E" },
      axis: {
        labelFontSize: 10,
        titleFontSize: 11,
        titleColor: "#6B7280",
        labelColor: "#6B7280",
        gridColor: "rgba(0,0,0,0.04)",
      },
      legend: { labelFontSize: 10, titleFontSize: 11 },
      range: {
        category: ["#3C2CDA", "#00D4AA", "#FF6B6B", "#FFB432", "#A855F7", "#06B6D4", "#F97316", "#EC4899"],
        heatmap: ["#F1EEFF", "#C9C0FF", "#8A7BFF", "#3C2CDA", "#1F1A99"],
        ramp: ["#F1EEFF", "#C9C0FF", "#8A7BFF", "#3C2CDA", "#1F1A99"],
      },
    };

    if (!isHeatmap) {
      (baseConfig as { bar?: unknown }).bar = { cornerRadiusEnd: 4 };
    } else {
      (baseConfig as { rect?: unknown; view?: unknown }).rect = { stroke: "#FFFFFF", strokeWidth: 1 };
      (baseConfig as { view?: unknown }).view = { stroke: "transparent" };
    }

    const height = isHeatmap ? computeHeatmapHeight(spec as VegaSpec) : 300;

    const vegaSpec = {
      ...specWithoutTitle,
      width: "container",
      height,
      autosize: isHeatmap
        ? { type: "fit-x", contains: "padding" }
        : { type: "fit", contains: "padding" },
      config: baseConfig,
    };

    embed(containerRef.current, vegaSpec as never, {
      actions: false,
      renderer: "svg",
    }).catch((err) => console.error("Vega render error:", err));

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [spec]);

  let displayTitle = "";
  let displaySubtitle = "";

  if (typeof spec?.title === "string") {
    displayTitle = spec.title;
  } else if (spec?.title && typeof spec.title === "object") {
    const t = spec.title as Record<string, unknown>;
    displayTitle = String(t.text || "");
    displaySubtitle = String(t.subtitle || "");
  }

  return (
    <div className="rounded-xl p-5 mt-3 border border-[var(--border-color)]" style={{ background: "var(--hex-surface-1)" }}>
      {displayTitle && (
        <div className="mb-3">
          <div className="text-sm font-semibold text-[var(--hex-text)]">{displayTitle}</div>
          {displaySubtitle && <div className="text-xs text-[var(--hex-text-muted)] mt-0.5">{displaySubtitle}</div>}
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", minHeight: "320px" }} />
    </div>
  );
}
