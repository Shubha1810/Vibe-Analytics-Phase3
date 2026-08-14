"use client";

import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

// Brand palette
const PALETTE = ["#1E3A5F", "#2E86AB", "#4ECDC4", "#45B7D1", "#96CEB4", "#FF6B6B", "#C44569", "#574B90", "#FFEAA7", "#DFE6E9"];
const MARGIN = { top: 40, right: 30, bottom: 60, left: 70 };

interface ParsedSpec {
  chartType: string;
  data: Record<string, unknown>[];
  xField: string;
  yField: string;
  y2Field?: string | null;
  colorField: string | null;
  title: string;
  xType: string;
  yType: string;
  secondaryYField?: string | null;
}

function applyTransforms(
  data: Record<string, unknown>[],
  transforms: Record<string, unknown>[]
): Record<string, unknown>[] {
  let result = [...data];

  for (const t of transforms) {
    // Filter transform: "filter": "datum.FIELD !== 'value'"
    if (t.filter && typeof t.filter === "string") {
      const filterExpr = t.filter as string;
      result = result.filter(row => {
        try {
          const datum = row;
          return new Function("datum", `return ${filterExpr}`)(datum);
        } catch {
          return true;
        }
      });
    }

    // Fold transform: pivot wide columns into key/value rows
    if (t.fold && Array.isArray(t.fold)) {
      const foldFields = t.fold as string[];
      const keyName = (t.as && Array.isArray(t.as)) ? (t.as as string[])[0] : "key";
      const valueName = (t.as && Array.isArray(t.as)) ? (t.as as string[])[1] : "value";
      const folded: Record<string, unknown>[] = [];
      for (const row of result) {
        for (const field of foldFields) {
          const newRow = { ...row, [keyName]: field, [valueName]: Number(row[field]) || 0 };
          folded.push(newRow);
        }
      }
      result = folded;
    }

    // Calculate transform: "calculate": "expr", "as": "fieldName"
    if (t.calculate && t.as && typeof t.calculate === "string" && typeof t.as === "string") {
      const expr = t.calculate as string;
      const asField = t.as as string;
      result = result.map(row => {
        try {
          const datum = row;
          const computed = new Function("datum", `return ${expr}`)(datum);
          return { ...row, [asField]: computed };
        } catch {
          return row;
        }
      });
    }
  }

  return result;
}

function parseVegaSpec(spec: Record<string, unknown>): ParsedSpec | null {
  if (!spec) return null;

  // Handle layered specs: extract from first layer
  const layers = spec.layer as Record<string, unknown>[] | undefined;
  const isLayered = Array.isArray(layers) && layers.length > 0;

  // Extract mark type
  let chartType = "bar";
  if (isLayered) {
    // Use first layer's mark as primary chart type
    const firstMark = layers![0].mark;
    if (typeof firstMark === "string") chartType = firstMark;
    else if (firstMark && typeof firstMark === "object" && "type" in firstMark) chartType = String((firstMark as Record<string, unknown>).type);
  } else {
    const mark = spec.mark;
    if (typeof mark === "string") chartType = mark;
    else if (mark && typeof mark === "object" && "type" in mark) chartType = String((mark as Record<string, unknown>).type);
  }

  // Extract data — could be at top level or inside a layer
  let data: Record<string, unknown>[] = [];
  const dataObj = spec.data as Record<string, unknown> | undefined;
  if (dataObj?.values) {
    data = dataObj.values as Record<string, unknown>[];
  } else if (isLayered) {
    // Check each layer for data
    for (const layer of layers!) {
      const layerData = layer.data as Record<string, unknown> | undefined;
      if (layerData?.values && Array.isArray(layerData.values) && (layerData.values as unknown[]).length > 0) {
        data = layerData.values as Record<string, unknown>[];
        break;
      }
    }
  }
  if (data.length === 0) return null;

  // Apply Vega-Lite transforms (filter, fold, calculate)
  const transforms = (spec.transform || []) as Record<string, unknown>[];
  if (transforms.length > 0) {
    data = applyTransforms(data, transforms);
  }
  if (data.length === 0) return null;

  // Extract encodings — from top level or first layer
  let encoding: Record<string, Record<string, unknown>>;
  if (spec.encoding) {
    encoding = spec.encoding as Record<string, Record<string, unknown>>;
  } else if (isLayered && layers![0].encoding) {
    encoding = layers![0].encoding as Record<string, Record<string, unknown>>;
  } else {
    encoding = {};
  }

  const xEnc = encoding.x || {};
  const yEnc = encoding.y || {};
  const colorEnc = encoding.color || {};

  const xField = String(xEnc.field || "");
  const yField = String(yEnc.field || "");
  const colorField = colorEnc.field ? String(colorEnc.field) : null;
  const xType = String(xEnc.type || "nominal");
  const yType = String(yEnc.type || "quantitative");

  // Extract y2 field (used for waterfall charts)
  const y2Enc = encoding.y2 || {};
  const y2Field = y2Enc.field ? String(y2Enc.field) : null;

  // Extract title
  let title = "";
  if (typeof spec.title === "string") title = spec.title;
  else if (spec.title && typeof spec.title === "object") title = String((spec.title as Record<string, unknown>).text || "");

  // For layered specs with dual axis (bar + line), extract secondary y field
  let secondaryYField: string | null = null;
  if (isLayered && layers!.length > 1) {
    const secondLayer = layers![1];
    const secondEnc = secondLayer.encoding as Record<string, Record<string, unknown>> | undefined;
    if (secondEnc?.y?.field) {
      secondaryYField = String(secondEnc.y.field);
    }
  }

  return { chartType, data, xField, yField, y2Field, colorField, title, xType, yType, secondaryYField };
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toFixed(1);
}

function formatFieldLabel(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b(pct|pp)\b/gi, "%")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function createTooltip() {
  let tooltip = d3.select("body").select<HTMLDivElement>(".d3-chart-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "d3-chart-tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "rgba(26,26,46,0.95)")
      .style("color", "#fff")
      .style("padding", "8px 12px")
      .style("border-radius", "8px")
      .style("font-size", "11px")
      .style("font-family", "Inter, system-ui, sans-serif")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
      .style("opacity", "0")
      .style("z-index", "9999")
      .style("transition", "opacity 0.15s ease");
  }
  return tooltip;
}

function renderBarChart(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  parsed: ParsedSpec,
  width: number,
  height: number
) {
  const { data, xField, yField, colorField, xType, yType } = parsed;

  // Detect stacked bar: has colorField and data has multiple series per x category
  const isStacked = colorField && data.some((d, _, arr) =>
    arr.filter(r => r[xField] === d[xField]).length > 1
  );

  if (isStacked && colorField) {
    renderStackedBar(svg, parsed, width, height);
    return;
  }

  // Determine orientation: if x is quantitative and y is nominal → horizontal bar
  const isHorizontal = xType === "quantitative" && (yType === "nominal" || yType === "ordinal");

  const tooltip = createTooltip();

  if (isHorizontal) {
    // Horizontal bar: y = categories, x = values
    const categories = data.map(d => String(d[yField] || ""));
    const values = data.map(d => Number(d[xField]) || 0);

    const yScale = d3.scaleBand().domain(categories).range([0, height]).padding(0.3);
    const xScale = d3.scaleLinear().domain([Math.min(0, d3.min(values) || 0), d3.max(values) || 0]).nice().range([0, width]);

    // Color scale
    let colorFn: (d: Record<string, unknown>, i: number) => string;
    if (colorField && data.some(d => d[colorField!] != null)) {
      const colorVals = data.map(d => Number(d[colorField!]) || 0);
      const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([d3.min(colorVals) || 0, d3.max(colorVals) || 0]);
      colorFn = (d) => colorScale(Number(d[colorField!]) || 0);
    } else {
      const hasNeg = values.some(v => v < 0);
      colorFn = (_, i) => hasNeg ? (values[i] < 0 ? "#EF4444" : "#10B981") : PALETTE[i % PALETTE.length];
    }

    // Axes
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => formatValue(Number(d))))
      .call(g => g.select(".domain").attr("stroke", "#e5e7eb"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#f3f4f6"))
      .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "10px").style("font-family", "Inter"));

    // X-axis label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .attr("fill", "#6B7280")
      .style("font-size", "11px")
      .style("font-family", "Inter")
      .style("font-weight", "600")
      .text(formatFieldLabel(xField));

    svg.append("g")
      .call(d3.axisLeft(yScale).tickSize(0))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick text").attr("fill", "#374151").style("font-size", "10px").style("font-family", "Inter"));

    // Grid lines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisBottom(xScale).ticks(5).tickSize(height).tickFormat(() => ""))
      .attr("stroke-opacity", 0.06)
      .call(g => g.select(".domain").remove());

    // Bars with animation
    svg.selectAll(".bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("y", d => yScale(String(d[yField] || "")) || 0)
      .attr("height", yScale.bandwidth())
      .attr("x", d => {
        const v = Number(d[xField]) || 0;
        return v < 0 ? xScale(v) : xScale(0);
      })
      .attr("width", 0)
      .attr("rx", 4)
      .attr("fill", (d, i) => colorFn(d, i))
      .on("mouseover", function (event, d) {
        d3.select(this).style("opacity", 0.8);
        tooltip.style("opacity", "1")
          .html(`<strong>${d[yField]}</strong><br/>${xField}: ${formatValue(Number(d[xField]) || 0)}`)
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mousemove", function (event) {
        tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", function () {
        d3.select(this).style("opacity", 1);
        tooltip.style("opacity", "0");
      })
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr("width", d => Math.abs(xScale(Number(d[xField]) || 0) - xScale(0)));

    // Value labels
    svg.selectAll(".label")
      .data(data)
      .join("text")
      .attr("class", "label")
      .attr("y", d => (yScale(String(d[yField] || "")) || 0) + yScale.bandwidth() / 2 + 4)
      .attr("x", d => {
        const v = Number(d[xField]) || 0;
        return v >= 0 ? xScale(v) + 5 : xScale(v) - 5;
      })
      .attr("text-anchor", d => (Number(d[xField]) || 0) >= 0 ? "start" : "end")
      .attr("fill", "#6B7280")
      .style("font-size", "9px")
      .style("font-family", "Inter")
      .style("opacity", 0)
      .text(d => formatValue(Number(d[xField]) || 0))
      .transition()
      .delay(600)
      .duration(300)
      .style("opacity", 1);

  } else {
    // Vertical bar: x = categories, y = values
    const categories = data.map(d => String(d[xField] || ""));
    const values = data.map(d => Number(d[yField]) || 0);

    const xScale = d3.scaleBand().domain(categories).range([0, width]).padding(0.3);
    const yScale = d3.scaleLinear().domain([Math.min(0, d3.min(values) || 0), d3.max(values) || 0]).nice().range([height, 0]);

    let colorFn: (d: Record<string, unknown>, i: number) => string;
    if (colorField && data.some(d => d[colorField!] != null)) {
      const colorDomain = [...new Set(data.map(d => String(d[colorField!])))];
      const colorScale = d3.scaleOrdinal(PALETTE).domain(colorDomain);
      colorFn = (d) => colorScale(String(d[colorField!]));
    } else {
      const hasNeg = values.some(v => v < 0);
      colorFn = (_, i) => hasNeg ? (values[i] < 0 ? "#EF4444" : "#10B981") : PALETTE[0];
    }

    // Axes
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .call(g => g.select(".domain").attr("stroke", "#e5e7eb"))
      .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "10px").style("font-family", "Inter")
        .attr("transform", categories.length > 6 ? "rotate(-35)" : "")
        .style("text-anchor", categories.length > 6 ? "end" : "middle"));

    // X-axis label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + (categories.length > 6 ? 55 : 40))
      .attr("text-anchor", "middle")
      .attr("fill", "#6B7280")
      .style("font-size", "11px")
      .style("font-family", "Inter")
      .style("font-weight", "600")
      .text(formatFieldLabel(xField));

    svg.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => formatValue(Number(d))))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "#f3f4f6"))
      .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "10px").style("font-family", "Inter"));

    // Y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -55)
      .attr("text-anchor", "middle")
      .attr("fill", "#6B7280")
      .style("font-size", "11px")
      .style("font-family", "Inter")
      .style("font-weight", "600")
      .text(formatFieldLabel(yField));

    // Grid
    svg.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(() => ""))
      .attr("stroke-opacity", 0.06)
      .call(g => g.select(".domain").remove());

    // Bars
    svg.selectAll(".bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(String(d[xField] || "")) || 0)
      .attr("width", xScale.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("rx", 4)
      .attr("fill", (d, i) => colorFn(d, i))
      .on("mouseover", function (event, d) {
        d3.select(this).style("opacity", 0.8);
        tooltip.style("opacity", "1")
          .html(`<strong>${d[xField]}</strong><br/>${yField}: ${formatValue(Number(d[yField]) || 0)}`)
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mousemove", function (event) {
        tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", function () {
        d3.select(this).style("opacity", 1);
        tooltip.style("opacity", "0");
      })
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr("y", d => {
        const v = Number(d[yField]) || 0;
        return v >= 0 ? yScale(v) : yScale(0);
      })
      .attr("height", d => Math.abs(yScale(Number(d[yField]) || 0) - yScale(0)));

    // Dual-axis: overlay a line for secondaryYField if present
    if (parsed.secondaryYField) {
      const secField = parsed.secondaryYField;
      const secValues = data.map(d => Number(d[secField]) || 0);
      const secScale = d3.scaleLinear()
        .domain([Math.min(0, d3.min(secValues) || 0), d3.max(secValues) || 0])
        .nice()
        .range([height, 0]);

      // Right axis
      svg.append("g")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(secScale).ticks(5).tickFormat(d => `${Number(d)}%`))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick text").attr("fill", "#d9534f").style("font-size", "10px").style("font-family", "Inter"));

      // Right Y-axis label
      svg.append("text")
        .attr("transform", "rotate(90)")
        .attr("x", height / 2)
        .attr("y", -width - 45)
        .attr("text-anchor", "middle")
        .attr("fill", "#d9534f")
        .style("font-size", "11px")
        .style("font-family", "Inter")
        .style("font-weight", "600")
        .text(formatFieldLabel(secField));

      // Line
      const line = d3.line<Record<string, unknown>>()
        .x(d => (xScale(String(d[xField] || "")) || 0) + xScale.bandwidth() / 2)
        .y(d => secScale(Number(d[secField]) || 0))
        .curve(d3.curveMonotoneX);

      svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#d9534f")
        .attr("stroke-width", 2.5)
        .attr("d", line);

      // Dots on line
      svg.selectAll(".sec-dot")
        .data(data)
        .join("circle")
        .attr("cx", d => (xScale(String(d[xField] || "")) || 0) + xScale.bandwidth() / 2)
        .attr("cy", d => secScale(Number(d[secField]) || 0))
        .attr("r", 4)
        .attr("fill", "#d9534f")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .on("mouseover", function (event, d) {
          d3.select(this).attr("r", 6);
          tooltip.style("opacity", "1")
            .html(`<strong>${d[xField]}</strong><br/>${secField}: ${formatValue(Number(d[secField]) || 0)}%`)
            .style("left", `${event.pageX + 12}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", function () {
          d3.select(this).attr("r", 4);
          tooltip.style("opacity", "0");
        });
    }
  }
}

function renderWaterfallChart(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  parsed: ParsedSpec,
  width: number,
  height: number
) {
  const { data, xField, yField, y2Field } = parsed;
  if (!y2Field) return;

  const tooltip = createTooltip();
  const WATERFALL_COLORS = {
    positive: "#2E86AB",
    negative: "#EF4444",
    total: "#10B981",
  };

  const categories = data.map(d => String(d[xField] || ""));
  const xScale = d3.scaleBand().domain(categories).range([0, width]).padding(0.3);

  // y domain: 0 to max END value
  const maxEnd = d3.max(data, d => Math.max(Number(d[yField]) || 0, Number(d[y2Field]) || 0)) || 0;
  const yScale = d3.scaleLinear().domain([0, maxEnd * 1.1]).nice().range([height, 0]);

  // X axis
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .call(g => g.select(".domain").attr("stroke", "#e5e7eb"))
    .call(g => g.selectAll(".tick text").attr("fill", "#374151").style("font-size", "11px").style("font-family", "Inter").style("font-weight", "600"));

  // X-axis label
  svg.append("text")
    .attr("x", width / 2).attr("y", height + 40)
    .attr("text-anchor", "middle").attr("fill", "#6B7280")
    .style("font-size", "11px").style("font-family", "Inter").style("font-weight", "600")
    .text("Demand Driver");

  // Y axis
  svg.append("g")
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${Number(d)}pp`))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "10px").style("font-family", "Inter"));

  // Y-axis label
  svg.append("text")
    .attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", -55)
    .attr("text-anchor", "middle").attr("fill", "#6B7280")
    .style("font-size", "11px").style("font-family", "Inter").style("font-weight", "600")
    .text("Contribution (pp)");

  // Grid
  svg.append("g")
    .call(d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(() => ""))
    .attr("stroke-opacity", 0.06)
    .call(g => g.select(".domain").remove());

  // Waterfall bars
  svg.selectAll(".wf-bar")
    .data(data)
    .join("rect")
    .attr("class", "wf-bar")
    .attr("x", d => xScale(String(d[xField] || "")) || 0)
    .attr("width", xScale.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("rx", 4)
    .attr("fill", d => {
      const label = String(d[xField] || "").toLowerCase();
      if (label === "total" || label === "actual") return WATERFALL_COLORS.total;
      const val = (Number(d[yField]) || 0) - (Number(d[y2Field]) || 0);
      return val >= 0 ? WATERFALL_COLORS.positive : WATERFALL_COLORS.negative;
    })
    .on("mouseover", function (event, d) {
      d3.select(this).style("opacity", 0.8);
      const val = (Number(d[yField]) || 0) - (Number(d[y2Field]) || 0);
      tooltip.style("opacity", "1")
        .html(`<strong>${d[xField]}</strong><br/>+${formatValue(val)} pp`)
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mousemove", function (event) {
      tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", function () {
      d3.select(this).style("opacity", 1);
      tooltip.style("opacity", "0");
    })
    .transition()
    .duration(600)
    .ease(d3.easeCubicOut)
    .attr("y", d => yScale(Math.max(Number(d[yField]) || 0, Number(d[y2Field]) || 0)))
    .attr("height", d => Math.abs(yScale(Number(d[y2Field]) || 0) - yScale(Number(d[yField]) || 0)));

  // Value labels on bars
  svg.selectAll(".wf-label")
    .data(data)
    .join("text")
    .attr("class", "wf-label")
    .attr("x", d => (xScale(String(d[xField] || "")) || 0) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(Math.max(Number(d[yField]) || 0, Number(d[y2Field]) || 0)) - 6)
    .attr("text-anchor", "middle")
    .attr("fill", "#374151")
    .style("font-size", "10px")
    .style("font-family", "Inter")
    .style("font-weight", "600")
    .style("opacity", 0)
    .text(d => {
      const val = (Number(d[yField]) || 0) - (Number(d[y2Field]) || 0);
      return `+${formatValue(val)}`;
    })
    .transition()
    .delay(600)
    .duration(300)
    .style("opacity", 1);

  // Connector lines between bars
  for (let i = 0; i < data.length - 1; i++) {
    const curr = data[i];
    const next = data[i + 1];
    const currEnd = Number(curr[yField]) || 0;
    const nextStart = Number(next[y2Field]) || 0;
    if (Math.abs(currEnd - nextStart) < 0.01) {
      const x1 = (xScale(String(curr[xField] || "")) || 0) + xScale.bandwidth();
      const x2 = xScale(String(next[xField] || "")) || 0;
      svg.append("line")
        .attr("x1", x1).attr("x2", x2)
        .attr("y1", yScale(currEnd)).attr("y2", yScale(currEnd))
        .attr("stroke", "#9CA3AF")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3");
    }
  }
}

function renderStackedBar(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  parsed: ParsedSpec,
  width: number,
  height: number
) {
  const { data, xField, yField, colorField } = parsed;
  if (!colorField) return;

  const tooltip = createTooltip();

  // Get unique categories and series
  const categories = [...new Set(data.map(d => String(d[xField] || "")))];
  const series = [...new Set(data.map(d => String(d[colorField] || "")))];

  // Build stacked data: for each category, accumulate values per series
  const stackData: Record<string, Record<string, number>> = {};
  for (const cat of categories) {
    stackData[cat] = {};
    for (const s of series) {
      const row = data.find(d => String(d[xField]) === cat && String(d[colorField]) === s);
      stackData[cat][s] = row ? Number(row[yField]) || 0 : 0;
    }
  }

  // Calculate stack totals for y-scale domain
  const totals = categories.map(cat => series.reduce((sum, s) => sum + (stackData[cat][s] || 0), 0));

  const xScale = d3.scaleBand().domain(categories).range([0, width]).padding(0.25);
  const yScale = d3.scaleLinear().domain([0, d3.max(totals) || 0]).nice().range([height, 0]);
  const colorScale = d3.scaleOrdinal(PALETTE).domain(series);

  // X axis
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .call(g => g.select(".domain").attr("stroke", "#e5e7eb"))
    .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "10px").style("font-family", "Inter")
      .attr("transform", categories.length > 5 ? "rotate(-30)" : "")
      .style("text-anchor", categories.length > 5 ? "end" : "middle"));

  // X-axis label
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + (categories.length > 5 ? 55 : 40))
    .attr("text-anchor", "middle")
    .attr("fill", "#6B7280")
    .style("font-size", "11px").style("font-family", "Inter").style("font-weight", "600")
    .text(formatFieldLabel(xField));

  // Y axis
  svg.append("g")
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => formatValue(Number(d))))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "10px").style("font-family", "Inter"));

  // Y-axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -55)
    .attr("text-anchor", "middle")
    .attr("fill", "#6B7280")
    .style("font-size", "11px").style("font-family", "Inter").style("font-weight", "600")
    .text(formatFieldLabel(yField));

  // Grid
  svg.append("g")
    .call(d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(() => ""))
    .attr("stroke-opacity", 0.06)
    .call(g => g.select(".domain").remove());

  // Draw stacked bars
  for (const cat of categories) {
    let cumY = 0;
    for (const s of series) {
      const val = stackData[cat][s] || 0;
      if (val === 0) continue;

      const barY = yScale(cumY + val);
      const barHeight = yScale(cumY) - yScale(cumY + val);

      svg.append("rect")
        .attr("x", xScale(cat) || 0)
        .attr("y", height)
        .attr("width", xScale.bandwidth())
        .attr("height", 0)
        .attr("rx", 2)
        .attr("fill", colorScale(s))
        .on("mouseover", function (event) {
          d3.select(this).style("opacity", 0.8);
          tooltip.style("opacity", "1")
            .html(`<strong>${cat}</strong><br/>${s}: ${formatValue(val)} pp`)
            .style("left", `${event.pageX + 12}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mousemove", function (event) {
          tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", function () {
          d3.select(this).style("opacity", 1);
          tooltip.style("opacity", "0");
        })
        .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("y", barY)
        .attr("height", barHeight);

      cumY += val;
    }
  }

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(0, ${-30})`);

  let lx = 0;
  for (const s of series) {
    legend.append("rect")
      .attr("x", lx).attr("y", 0).attr("width", 12).attr("height", 12).attr("rx", 3)
      .attr("fill", colorScale(s));
    legend.append("text")
      .attr("x", lx + 16).attr("y", 10)
      .text(s)
      .style("font-size", "10px").style("font-family", "Inter").attr("fill", "#374151");
    lx += s.length * 7 + 30;
  }
}

function renderLineChart(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  parsed: ParsedSpec,
  width: number,
  height: number
) {
  const { data, xField, yField, colorField, xType } = parsed;
  const tooltip = createTooltip();

  // Determine if x is temporal
  const isTemporal = xType === "temporal";

  // Group by color if present
  const groups = colorField
    ? d3.group(data, d => String(d[colorField]))
    : new Map([["_all", data]]);

  // Scales
  let xScale: d3.ScaleTime<number, number> | d3.ScalePoint<string>;
  if (isTemporal) {
    const dates = data.map(d => new Date(String(d[xField])));
    xScale = d3.scaleTime().domain(d3.extent(dates) as [Date, Date]).range([0, width]);
  } else {
    const cats = [...new Set(data.map(d => String(d[xField])))];
    xScale = d3.scalePoint().domain(cats).range([0, width]).padding(0.5);
  }

  const allValues = data.map(d => Number(d[yField]) || 0);
  const yScale = d3.scaleLinear().domain([d3.min(allValues) || 0, d3.max(allValues) || 0]).nice().range([height, 0]);
  const colorScale = d3.scaleOrdinal(PALETTE).domain([...groups.keys()]);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale as d3.AxisScale<d3.AxisDomain>).ticks(6))
    .call(g => g.select(".domain").attr("stroke", "#e5e7eb"))
    .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "10px").style("font-family", "Inter"));

  svg.append("g")
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => formatValue(Number(d))))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "10px").style("font-family", "Inter"));

  // Grid
  svg.append("g")
    .call(d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(() => ""))
    .attr("stroke-opacity", 0.06)
    .call(g => g.select(".domain").remove());

  // Lines
  const line = d3.line<Record<string, unknown>>()
    .x(d => {
      if (isTemporal) return (xScale as d3.ScaleTime<number, number>)(new Date(String(d[xField])));
      return (xScale as d3.ScalePoint<string>)(String(d[xField])) || 0;
    })
    .y(d => yScale(Number(d[yField]) || 0))
    .curve(d3.curveMonotoneX);

  groups.forEach((groupData, key) => {
    const color = key === "_all" ? PALETTE[0] : colorScale(key);

    const path = svg.append("path")
      .datum(groupData)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2.5)
      .attr("d", line);

    // Animate line drawing
    const totalLength = (path.node() as SVGPathElement)?.getTotalLength() || 0;
    path.attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    // Dots
    svg.selectAll(`.dot-${key}`)
      .data(groupData)
      .join("circle")
      .attr("cx", d => {
        if (isTemporal) return (xScale as d3.ScaleTime<number, number>)(new Date(String(d[xField])));
        return (xScale as d3.ScalePoint<string>)(String(d[xField])) || 0;
      })
      .attr("cy", d => yScale(Number(d[yField]) || 0))
      .attr("r", 4)
      .attr("fill", color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("opacity", 0)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("r", 6).style("opacity", 1);
        tooltip.style("opacity", "1")
          .html(`<strong>${d[xField]}</strong><br/>${yField}: ${formatValue(Number(d[yField]) || 0)}${colorField ? `<br/>${colorField}: ${d[colorField]}` : ""}`)
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", function () {
        d3.select(this).attr("r", 4).style("opacity", 0);
        tooltip.style("opacity", "0");
      })
      .transition()
      .delay(800)
      .style("opacity", 0);
  });

  // Legend for multi-series
  if (colorField && groups.size > 1) {
    const legend = svg.append("g").attr("transform", `translate(${width - 120}, 0)`);
    let ly = 0;
    groups.forEach((_, key) => {
      legend.append("rect").attr("x", 0).attr("y", ly).attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", colorScale(key));
      legend.append("text").attr("x", 18).attr("y", ly + 10).text(key).style("font-size", "10px").style("font-family", "Inter").attr("fill", "#374151");
      ly += 18;
    });
  }
}

function renderAreaChart(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  parsed: ParsedSpec,
  width: number,
  height: number
) {
  const { data, xField, yField, xType } = parsed;

  const isTemporal = xType === "temporal";

  let xScale: d3.ScaleTime<number, number> | d3.ScalePoint<string>;
  if (isTemporal) {
    const dates = data.map(d => new Date(String(d[xField])));
    xScale = d3.scaleTime().domain(d3.extent(dates) as [Date, Date]).range([0, width]);
  } else {
    const cats = [...new Set(data.map(d => String(d[xField])))];
    xScale = d3.scalePoint().domain(cats).range([0, width]).padding(0.5);
  }

  const values = data.map(d => Number(d[yField]) || 0);
  const yScale = d3.scaleLinear().domain([0, d3.max(values) || 0]).nice().range([height, 0]);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale as d3.AxisScale<d3.AxisDomain>).ticks(6))
    .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "10px"));

  svg.append("g")
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => formatValue(Number(d))))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "10px"));

  // Area
  const area = d3.area<Record<string, unknown>>()
    .x(d => {
      if (isTemporal) return (xScale as d3.ScaleTime<number, number>)(new Date(String(d[xField])));
      return (xScale as d3.ScalePoint<string>)(String(d[xField])) || 0;
    })
    .y0(height)
    .y1(d => yScale(Number(d[yField]) || 0))
    .curve(d3.curveMonotoneX);

  // Gradient
  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient").attr("id", "area-gradient").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
  gradient.append("stop").attr("offset", "0%").attr("stop-color", PALETTE[1]).attr("stop-opacity", 0.4);
  gradient.append("stop").attr("offset", "100%").attr("stop-color", PALETTE[1]).attr("stop-opacity", 0.02);

  svg.append("path")
    .datum(data)
    .attr("fill", "url(#area-gradient)")
    .attr("d", area)
    .style("opacity", 0)
    .transition()
    .duration(600)
    .style("opacity", 1);

  // Line on top
  const line = d3.line<Record<string, unknown>>()
    .x(d => {
      if (isTemporal) return (xScale as d3.ScaleTime<number, number>)(new Date(String(d[xField])));
      return (xScale as d3.ScalePoint<string>)(String(d[xField])) || 0;
    })
    .y(d => yScale(Number(d[yField]) || 0))
    .curve(d3.curveMonotoneX);

  svg.append("path").datum(data).attr("fill", "none").attr("stroke", PALETTE[1]).attr("stroke-width", 2.5).attr("d", line);
}

function renderHeatmap(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  parsed: ParsedSpec,
  width: number,
  height: number
) {
  const { data, xField, yField, colorField } = parsed;
  const valueField = colorField || yField;

  const xCats = [...new Set(data.map(d => String(d[xField])))];
  const yCats = [...new Set(data.map(d => String(d[yField])))];
  const values = data.map(d => Number(d[valueField]) || 0);

  const xScale = d3.scaleBand().domain(xCats).range([0, width]).padding(0.05);
  const yScale = d3.scaleBand().domain(yCats).range([0, height]).padding(0.05);
  const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([d3.min(values) || 0, d3.max(values) || 0]);

  const tooltip = createTooltip();

  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "9px"));

  svg.append("g")
    .call(d3.axisLeft(yScale).tickSize(0))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "9px"));

  svg.selectAll(".cell")
    .data(data)
    .join("rect")
    .attr("x", d => xScale(String(d[xField])) || 0)
    .attr("y", d => yScale(String(d[yField])) || 0)
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("rx", 3)
    .attr("fill", d => colorScale(Number(d[valueField]) || 0))
    .style("opacity", 0)
    .on("mouseover", function (event, d) {
      d3.select(this).style("stroke", "#1E3A5F").style("stroke-width", "2");
      tooltip.style("opacity", "1")
        .html(`<strong>${d[xField]} × ${d[yField]}</strong><br/>Value: ${formatValue(Number(d[valueField]) || 0)}`)
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", function () {
      d3.select(this).style("stroke", "none");
      tooltip.style("opacity", "0");
    })
    .transition()
    .duration(400)
    .delay((_, i) => i * 10)
    .style("opacity", 1);
}

function renderScatterChart(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  parsed: ParsedSpec,
  width: number,
  height: number
) {
  const { data, xField, yField, colorField } = parsed;
  const tooltip = createTooltip();

  const xValues = data.map(d => Number(d[xField]) || 0);
  const yValues = data.map(d => Number(d[yField]) || 0);

  const xScale = d3.scaleLinear().domain(d3.extent(xValues) as [number, number]).nice().range([0, width]);
  const yScale = d3.scaleLinear().domain(d3.extent(yValues) as [number, number]).nice().range([height, 0]);

  const colorDomain = colorField ? [...new Set(data.map(d => String(d[colorField])))] : [];
  const colorScale = d3.scaleOrdinal(PALETTE).domain(colorDomain);

  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => formatValue(Number(d))))
    .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "10px"));

  svg.append("g")
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => formatValue(Number(d))))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text").attr("fill", "#6B7280").style("font-size", "10px"));

  svg.selectAll(".dot")
    .data(data)
    .join("circle")
    .attr("cx", d => xScale(Number(d[xField]) || 0))
    .attr("cy", d => yScale(Number(d[yField]) || 0))
    .attr("r", 0)
    .attr("fill", d => colorField ? colorScale(String(d[colorField])) : PALETTE[1])
    .attr("opacity", 0.75)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("r", 8).attr("opacity", 1);
      tooltip.style("opacity", "1")
        .html(`<strong>${xField}: ${formatValue(Number(d[xField]) || 0)}</strong><br/>${yField}: ${formatValue(Number(d[yField]) || 0)}${colorField ? `<br/>${colorField}: ${d[colorField]}` : ""}`)
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", function () {
      d3.select(this).attr("r", 5).attr("opacity", 0.75);
      tooltip.style("opacity", "0");
    })
    .transition()
    .duration(600)
    .delay((_, i) => i * 15)
    .attr("r", 5);
}

interface D3ChartProps {
  spec: Record<string, unknown>;
}

export default function D3Chart({ spec }: D3ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });

  // Parse spec
  const parsed = parseVegaSpec(spec);

  // Responsive resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setDimensions({ width: w, height: Math.min(400, Math.max(280, w * 0.5)) });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Render chart
  useEffect(() => {
    if (!svgRef.current || !parsed) return;

    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll("*").remove();

    const rightMargin = parsed.secondaryYField ? 60 : MARGIN.right;
    const width = dimensions.width - MARGIN.left - rightMargin;
    const height = dimensions.height - MARGIN.top - MARGIN.bottom;

    if (width <= 0 || height <= 0) return;

    const g = svgEl
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

    switch (parsed.chartType) {
      case "bar":
        // Detect waterfall: bar with y2Field present
        if (parsed.y2Field) {
          renderWaterfallChart(g, parsed, width, height);
        } else {
          renderBarChart(g, parsed, width, height);
        }
        break;
      case "line":
        renderLineChart(g, parsed, width, height);
        break;
      case "area":
        renderAreaChart(g, parsed, width, height);
        break;
      case "rect":
        renderHeatmap(g, parsed, width, height);
        break;
      case "point":
      case "circle":
        renderScatterChart(g, parsed, width, height);
        break;
      default:
        renderBarChart(g, parsed, width, height);
    }
  }, [parsed, dimensions]);

  if (!parsed) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
        Unable to render chart: invalid specification.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="rounded-xl p-5 mt-3 border border-[var(--border-color)]" style={{ background: "var(--hex-surface-1)" }}>
      {parsed.title && (
        <div className="mb-3">
          <div className="text-sm font-semibold text-[var(--hex-text)]">{parsed.title}</div>
        </div>
      )}
      <svg ref={svgRef} style={{ width: "100%", height: `${dimensions.height}px`, overflow: "visible" }} />
    </div>
  );
}
