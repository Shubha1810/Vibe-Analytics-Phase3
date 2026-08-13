"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">Loading Plotly Chart...</div>,
});

// Helper function to decode base64 to TypedArray based on numpy dtypes
function decodeBase64ToTypedArray(b64: string, dtype: string) {
  try {
    const binaryString = window.atob(b64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const buffer = bytes.buffer;
    switch (dtype) {
      case "f8":
      case "float64":
        return Array.from(new Float64Array(buffer));
      case "f4":
      case "float32":
        return Array.from(new Float32Array(buffer));
      case "i8":
      case "int64":
        return Array.from(new BigInt64Array(buffer)).map(val => Number(val));
      case "i4":
      case "int32":
        return Array.from(new Int32Array(buffer));
      case "i2":
      case "int16":
        return Array.from(new Int16Array(buffer));
      default:
        return Array.from(new Float64Array(buffer));
    }
  } catch (e) {
    console.error("Error decoding Plotly binary data:", e);
    return [];
  }
}

// Recursive function to traverse object and replace { dtype, bdata } with decoded arrays
function deserializePlotly(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deserializePlotly(item));
  }

  // Detect base64 binary container
  if (obj.bdata && obj.dtype) {
    return decodeBase64ToTypedArray(obj.bdata, obj.dtype);
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = deserializePlotly(obj[key]);
    }
  }
  return result;
}

interface PlotlyChartProps {
  spec: any;
  className?: string;
  height?: number;
}

export function PlotlyChart({ spec, className = "", height = 450 }: PlotlyChartProps) {
  const deserialized = useMemo(() => {
    if (!spec) return null;
    try {
      return deserializePlotly(spec);
    } catch (e) {
      console.error("Failed to deserialize Plotly spec:", e);
      return spec;
    }
  }, [spec]);

  if (!deserialized || !deserialized.data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
        Failed to render Plotly chart: Missing data spec.
      </div>
    );
  }

  // Build layout: start with defaults, merge agent layout, then force responsive overrides
  const agentLayout = { ...(deserialized.layout || {}) };
  delete agentLayout.width;

  const layout = {
    height: height,
    margin: { l: 60, r: 40, t: 60, b: 60, pad: 4 },
    font: { family: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" },
    ...agentLayout,
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
  };

  const config = {
    ...(deserialized.config || {}),
    displayModeBar: true,
    responsive: true,
    displaylogo: false,
    modeBarButtonsToAdd: [
      "zoom2d", "pan2d", "select2d", "lasso2d",
      "zoomIn2d", "zoomOut2d", "autoScale2d", "resetScale2d",
      "toImage",
    ],
  };

  return (
    <div className={`rounded-xl p-2 border border-gray-100 dark:border-gray-800 shadow-sm w-full ${className}`} style={{ background: "var(--hex-surface-1)" }}>
      <Plot
        data={deserialized.data}
        layout={layout}
        config={config}
        useResizeHandler={true}
        style={{ width: "100%", height: `${height}px` }}
        className="w-full h-full"
      />
    </div>
  );
}
