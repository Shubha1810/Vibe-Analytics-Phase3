# D3 Chart Architecture — Data Transformation Flow

## Overview

This document explains how chart data flows from the Snowflake Cortex Agent through to rendered SVG pixels in the browser, using a specific example: **"Fresh & Grocery perishables — demand deviation vs lost revenue (last 7 days)"** (dual-axis bar + line chart).

---

## End-to-End Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  SNOWFLAKE (Agent)                                                  │
│                                                                     │
│  SQL Result: 17 rows × 13 columns                                   │
│  ↓                                                                  │
│  data_to_chart tool: picks CATEGORY_L3, LOST_REVENUE, DEV_PCT       │
│  ↓                                                                  │
│  Outputs: Vega-Lite JSON (spec with layer[bar, line] + data.values)  │
└────────────────────────────────────┬────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND (Python/Flask)                                             │
│                                                                     │
│  Extracts type:"chart" content item → chart_spec string             │
│  JSON.parse → vega_spec object                                      │
│  Returns: { text: "...", vega_spec: {...}, ... }                     │
└────────────────────────────────────┬────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND — parseVegaSpec()  [LAYER 1 → LAYER 2 translation]       │
│                                                                     │
│  INPUT: 100+ line Vega-Lite JSON with layer[], resolve, usermeta    │
│                                                                     │
│  EXTRACTS:                                                          │
│    chartType     = "bar"           (from layer[0].mark)             │
│    data          = [{...}×17]      (from spec.data.values)          │
│    xField        = "CATEGORY_L3"   (from layer[0].encoding.x.field) │
│    yField        = "LOST_REVENUE"  (from layer[0].encoding.y.field) │
│    secondaryYField = "DEV_PCT"     (from layer[1].encoding.y.field) │
│    title         = "Fresh & Grocery..." (from spec.title)           │
│                                                                     │
│  OUTPUT: Simple ParsedSpec object (9 fields)                        │
└────────────────────────────────────┬────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND — renderBarChart()  [D3 SVG Rendering]                    │
│                                                                     │
│  1. xScale = d3.scaleBand(17 categories → 600px width)              │
│  2. yScale = d3.scaleLinear(0..163K → 280px..0px)                   │
│  3. secScale = d3.scaleLinear(0..12 → 280px..0px)                   │
│  4. Draw left Y axis (Lost Revenue $)                               │
│  5. Draw bottom X axis (Category L3, rotated)                       │
│  6. Draw right Y axis (Dev %, red)                                  │
│  7. Draw 17 <rect> bars with 600ms animation                        │
│  8. Draw <path> line through DEV_PCT points (red, smooth curve)     │
│  9. Draw 17 <circle> dots on line                                   │
│  10. Attach mouseover handlers → tooltip                            │
│                                                                     │
│  FINAL OUTPUT: ~50 SVG elements in the DOM                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: What the Agent Produces (Vega-Lite JSON)

The agent calls `data_to_chart` and Snowflake returns this spec:

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": "Fresh & Grocery perishables — demand deviation vs lost revenue (last 7 days)",
  "data": {
    "values": [
      {"CATEGORY_L3": "Milk",              "DEV_PCT": 6.4,  "LOST_REVENUE": 162967},
      {"CATEGORY_L3": "Cold Beverages",    "DEV_PCT": 11.6, "LOST_REVENUE": 109990},
      {"CATEGORY_L3": "Packaged Bread",    "DEV_PCT": 6.3,  "LOST_REVENUE": 55719},
      {"CATEGORY_L3": "Snacks",            "DEV_PCT": 6.1,  "LOST_REVENUE": 50292},
      {"CATEGORY_L3": "Salads & Pre-Cut Greens", "DEV_PCT": 8.9, "LOST_REVENUE": 49128},
      {"CATEGORY_L3": "Butter & Eggs",     "DEV_PCT": 5.9,  "LOST_REVENUE": 48188},
      {"CATEGORY_L3": "Berries",           "DEV_PCT": 8.5,  "LOST_REVENUE": 43123},
      {"CATEGORY_L3": "Premium Yogurt",    "DEV_PCT": 9.5,  "LOST_REVENUE": 38375},
      {"CATEGORY_L3": "Cheese",            "DEV_PCT": 6.5,  "LOST_REVENUE": 36007},
      {"CATEGORY_L3": "Condiments & BBQ",  "DEV_PCT": 10.7, "LOST_REVENUE": 33147},
      {"CATEGORY_L3": "Avocados",          "DEV_PCT": 8.9,  "LOST_REVENUE": 20876},
      {"CATEGORY_L3": "Stone Fruit",       "DEV_PCT": 8.4,  "LOST_REVENUE": 19131},
      {"CATEGORY_L3": "Artisan Breads",    "DEV_PCT": 1.5,  "LOST_REVENUE": 18309},
      {"CATEGORY_L3": "Tomatoes",          "DEV_PCT": 10.9, "LOST_REVENUE": 16071},
      {"CATEGORY_L3": "Leafy Greens",      "DEV_PCT": 11.2, "LOST_REVENUE": 14503},
      {"CATEGORY_L3": "Bananas",           "DEV_PCT": 6.5,  "LOST_REVENUE": 12642},
      {"CATEGORY_L3": "Pastries",          "DEV_PCT": 1.6,  "LOST_REVENUE": 9214}
    ]
  },
  "layer": [
    {
      "mark": "bar",
      "encoding": {
        "x": {"field": "CATEGORY_L3", "type": "nominal", "sort": "-y"},
        "y": {"field": "LOST_REVENUE", "type": "quantitative", "axis": {"title": "Lost revenue ($)"}}
      }
    },
    {
      "mark": {"type": "line", "color": "#d9534f", "point": true},
      "encoding": {
        "x": {"field": "CATEGORY_L3", "type": "nominal", "sort": "-y"},
        "y": {"field": "DEV_PCT", "type": "quantitative", "axis": {"title": "Avg demand deviation (%)"}}
      }
    }
  ],
  "resolve": {"scale": {"y": "independent"}}
}
```

### What this spec describes:

| Property | Meaning |
|----------|---------|
| `data.values` | 17 rows of pre-aggregated data (already grouped by category) |
| `layer[0]` | Bar chart: `LOST_REVENUE` per category on left Y axis |
| `layer[1]` | Line chart: `DEV_PCT` per category on right Y axis |
| `resolve.scale.y: "independent"` | Two separate Y axes (different scales) |
| `sort: "-y"` | Sort bars descending by Y value |

This is a **declarative specification** — it describes *what* to show, not *how* to render it.

---

## The Translation Layer: `parseVegaSpec()`

Our function reads the Vega-Lite JSON and extracts a flat, renderer-friendly object:

```
INPUT (Vega-Lite spec ~100 lines)          OUTPUT (ParsedSpec — 9 fields)
──────────────────────────────────          ─────────────────────────────────
spec.layer[0].mark = "bar"            →    chartType: "bar"
spec.data.values = [{...} × 17]       →    data: [17 row objects]
layer[0].encoding.x.field             →    xField: "CATEGORY_L3"
layer[0].encoding.y.field             →    yField: "LOST_REVENUE"
layer[0].encoding.x.type              →    xType: "nominal"
layer[0].encoding.y.type              →    yType: "quantitative"
spec.title                            →    title: "Fresh & Grocery perishables..."
layer[1].encoding.y.field             →    secondaryYField: "DEV_PCT"
encoding.color (not present here)     →    colorField: null
```

### ParsedSpec output for this chart:

```typescript
{
  chartType: "bar",
  data: [
    {CATEGORY_L3: "Milk", DEV_PCT: 6.4, LOST_REVENUE: 162967},
    {CATEGORY_L3: "Cold Beverages", DEV_PCT: 11.6, LOST_REVENUE: 109990},
    ...15 more rows
  ],
  xField: "CATEGORY_L3",
  yField: "LOST_REVENUE",         // primary Y axis (bars)
  secondaryYField: "DEV_PCT",     // secondary Y axis (line, right side)
  colorField: null,
  title: "Fresh & Grocery perishables — demand deviation vs lost revenue (last 7 days)",
  xType: "nominal",
  yType: "quantitative"
}
```

### Key parsing logic for layered specs:

1. Detect `spec.layer` array exists → `isLayered = true`
2. Get `chartType` from `layer[0].mark` (primary visual = bars)
3. Find `data` at `spec.data.values` (shared across layers)
4. Get primary encoding from `layer[0].encoding`
5. Get `secondaryYField` from `layer[1].encoding.y.field`

---

## Layer 2: D3 SVG Rendering (`renderBarChart`)

D3 takes the `ParsedSpec` and builds SVG elements pixel by pixel.

### Step 1: Create Scales (data → pixel math)

```
X Scale (d3.scaleBand):
  Domain: ["Milk", "Cold Beverages", "Packaged Bread", ...] (17 categories)
  Range:  [0px → 600px]  (chart width)
  Padding: 0.3 (30% gap between bars)
  Output: "Milk" → 0px, "Cold Beverages" → 37px, etc.
  Each bar width: ~24px

Y Scale — LEFT (d3.scaleLinear):
  Domain: [0, 162967]  (min/max of LOST_REVENUE)
  Range:  [280px → 0px]  (inverted — SVG y=0 is top)
  Output: 162967 → 0px (tallest bar touches top)
          0 → 280px (baseline at bottom)
          55719 → ~185px

Y Scale — RIGHT (d3.scaleLinear):
  Domain: [0, 12]  (min/max of DEV_PCT)
  Range:  [280px → 0px]
  Output: 11.6% → ~10px (near top)
          6.4% → ~131px (middle)
          1.5% → ~245px (near bottom)
```

### Step 2: Draw Axes

```
Left Y axis (LOST_REVENUE):
  Tick marks: 0, 50.0K, 100.0K, 150.0K
  Label: "Lost Revenue" (rotated -90°, centered)
  Color: #6B7280 (gray)

Bottom X axis (CATEGORY_L3):
  17 category labels rotated -35° for readability
  Label: "Category L3" (centered below)

Right Y axis (DEV_PCT):
  Tick marks: 0%, 4%, 8%, 12%
  Label: "Dev %" (rotated 90°, red)
  Color: #d9534f (red — matches the line)
```

### Step 3: Draw Bars (17 `<rect>` elements)

For each data row, D3 creates an SVG rectangle:

```
"Milk":            x=0,   width=24, y=0,   height=280  → tallest (163K)
"Cold Beverages":  x=37,  width=24, y=90,  height=190  → 110K
"Packaged Bread":  x=74,  width=24, y=184, height=96   → 56K
"Snacks":          x=111, width=24, y=193, height=87   → 50K
...
"Pastries":        x=592, width=24, y=264, height=16   → 9K (shortest)
```

Each bar:
- `fill`: #1E3A5F (dark navy from brand palette)
- `rx`: 4px (rounded corners)
- **Animation**: starts at `height=0`, transitions to final height over 600ms (`d3.easeCubicOut`)

### Step 4: Draw Line (secondary axis — DEV_PCT)

A single `<path>` element connecting 17 points:

```
Point positions (x = bar center, y = secScale(DEV_PCT)):
  "Milk"           → (12px, 131px)    DEV_PCT = 6.4%
  "Cold Beverages" → (49px, 10px)     DEV_PCT = 11.6% (peak)
  "Packaged Bread" → (86px, 134px)    DEV_PCT = 6.3%
  ...
  "Pastries"       → (604px, 243px)   DEV_PCT = 1.6% (lowest)
```

Path attributes:
- `stroke`: #d9534f (red)
- `stroke-width`: 2.5px
- `curve`: `d3.curveMonotoneX` (smooth monotone interpolation — no overshooting)

### Step 5: Draw Dots on Line

17 `<circle>` elements at each line vertex:
- `r`: 4px (6px on hover)
- `fill`: #d9534f (red)
- `stroke`: #fff, `stroke-width`: 2px (white ring for contrast)

### Step 6: Interactivity

On **mouseover** any bar:
```
→ Bar opacity fades to 0.8 (highlight effect)
→ Custom tooltip <div> appears near cursor:
    ┌──────────────────────────┐
    │ Premium Yogurt           │
    │ LOST_REVENUE: 38.4K     │
    └──────────────────────────┘
→ Styled: dark bg (rgba(26,26,46,0.95)), white text, 8px border-radius
→ Positioned: event.pageX + 12px, event.pageY - 28px
```

On **mouseout**: opacity returns to 1.0, tooltip fades.

---

## Final SVG DOM Structure

```html
<svg width="700" height="380">
  <g transform="translate(70, 40)">
    <!-- Left Y axis -->
    <g class="axis-left">
      <text transform="rotate(-90)">Lost Revenue</text>
      <line .../> <text>0</text>
      <line .../> <text>50.0K</text>
      <line .../> <text>100.0K</text>
      <line .../> <text>150.0K</text>
    </g>

    <!-- Bottom X axis -->
    <g transform="translate(0, 280)">
      <text>Category L3</text>
      <text transform="rotate(-35)">Milk</text>
      <text transform="rotate(-35)">Cold Beverages</text>
      ...
    </g>

    <!-- Grid lines -->
    <g class="grid" stroke-opacity="0.06">...</g>

    <!-- 17 Bars -->
    <rect x="0" y="0" width="24" height="280" rx="4" fill="#1E3A5F"/>
    <rect x="37" y="90" width="24" height="190" rx="4" fill="#1E3A5F"/>
    ...

    <!-- Right Y axis (red) -->
    <g transform="translate(600, 0)">
      <text transform="rotate(90)" fill="#d9534f">Dev %</text>
      <text fill="#d9534f">0%</text>
      <text fill="#d9534f">4%</text>
      ...
    </g>

    <!-- Line path -->
    <path d="M12,131 C... L604,243" stroke="#d9534f" stroke-width="2.5" fill="none"/>

    <!-- 17 Dots -->
    <circle cx="12" cy="131" r="4" fill="#d9534f" stroke="#fff"/>
    <circle cx="49" cy="10" r="4" fill="#d9534f" stroke="#fff"/>
    ...
  </g>
</svg>
```

Total: ~50 SVG elements (vs Plotly's ~500+ DOM nodes for the same chart).

---

## Why D3 vs Plotly for This Use Case

| Aspect | Plotly | D3 (our implementation) |
|--------|--------|------------------------|
| **Bundle size** | ~3.5MB (plotly.js-dist-min) | ~250KB (d3 modular) |
| **Rendering** | Own layout engine, heavy DOM | Pure SVG — lightweight, inspectable |
| **Styling control** | Limited to Plotly templates | Pixel-level: every rect, line, text |
| **Animations** | Built-in but generic | Custom per chart type (600ms ease) |
| **Tooltips** | Plotly built-in (hard to customize) | Custom HTML — matches app design system |
| **Responsiveness** | `useResizeHandler` (laggy) | ResizeObserver — instant, no flicker |
| **SSR compatibility** | Requires `dynamic()` + `ssr: false` | Works with `"use client"` naturally |
| **Version issues** | None | None (D3 is stable, no spec versioning) |
| **Theming** | Override Plotly defaults | Brand palette baked in from start |
| **Dual-axis** | Awkward (secondary_y param) | Native — just add another scale |
| **First render** | Slow (parses full Plotly runtime) | <16ms after animation starts |
| **DOM weight** | ~500+ nodes per chart | ~50 nodes per chart |

---

## Supported Chart Types

| Agent generates (mark type) | D3 renders as |
|----------------------------|---------------|
| `"bar"` | Vertical or horizontal bars (auto-detected from encoding types) |
| `"bar"` + `layer[1].line` | Dual-axis: bars (left Y) + line (right Y) |
| `"line"` | Multi-series line chart with animated drawing |
| `"area"` | Gradient-filled area with line overlay |
| `"rect"` | Heatmap with sequential color scale |
| `"point"` / `"circle"` | Scatter plot with animated dot entry |

---

## Key Design Decision

The agent still uses Snowflake's **built-in `data_to_chart` tool** — we don't fight the platform. That tool outputs a Vega-Lite spec with embedded data. Our `parseVegaSpec()` acts as a **translation layer** that extracts the intent (chart type, fields, data) and feeds it to D3 renderers producing pixel-perfect, branded, animated SVG charts.

This means:
- **No agent changes needed** (ever)
- **No Snowflake procedure calls** for charting (faster)
- **Full design control** on the frontend
- **Easy to extend** — add a new chart type by writing one renderer function
