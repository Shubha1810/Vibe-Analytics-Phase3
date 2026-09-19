export const PERSONAS = [
  "Demand Planner",
  "Supply Planner",
  "Director of Demand Planning",
] as const;

export type Persona = (typeof PERSONAS)[number];

export const CHART_PALETTE = [
  "#3C2CDA", "#00D4AA", "#FF6B6B", "#FFB432", "#A855F7",
  "#06B6D4", "#F97316", "#EC4899", "#8B5CF6", "#10B981",
  "#F43F5E", "#0EA5E9", "#D946EF", "#14B8A6", "#EAB308",
  "#6366F1", "#84CC16", "#E11D48", "#22D3EE", "#FB923C",
];

export const NAV_ITEMS = [
  { id: "home", label: "Home", icon: "home", path: "/", disabled: false },
  { id: "data-management", label: "Data Management", icon: "cloud_upload", path: "/data-management", disabled: false },
  { id: "autonomous", label: "Autonomous Module", icon: "precision_manufacturing", path: "/autonomous", disabled: false },
  { id: "interactive", label: "Interactive Module", icon: "forum", path: "/interactive", disabled: false },
  { id: "observability", label: "AI Observability", icon: "visibility", path: "/observability", disabled: false },
  { id: "rag-pipeline", label: "Context Enhancement Layer", icon: "hub", path: "/rag-pipeline", disabled: false },
];

// Persona-specific module descriptions for homepage tiles
export const MODULE_BULLETS: Record<Persona, { autonomous: string[]; interactive: string[] }> = {
  "Demand Planner": {
    autonomous: [
      "Multi-agent anomaly detection across all department portfolios",
      "Automated root cause and driver attribution per region and category",
      "Revenue-at-stake quantification with ranked anomaly prioritization",
      "Cross-department signal awareness and coordination triggers",
    ],
    interactive: [
      "Conversational demand forecasting and scenario planning",
      "Drill-down into regional and SKU-level anomalies",
      "What-if simulations for demand shift responses",
      "Dynamic visualizations with confidence intervals",
    ],
  },
  "Supply Planner": {
    autonomous: [
      "End-to-end supply chain risk and availability prediction",
      "Stockout and markdown risk projections across affected lines",
      "Replenishment and expedite recommendations within guardrails",
      "Supplier reliability scoring and alternate sourcing triggers",
    ],
    interactive: [
      "Conversational AI for supply chain and logistics queries",
      "Supplier performance and capacity constraint analysis",
      "Scenario modeling for procurement and distribution",
      "Real-time tracking of supply chain health indicators",
    ],
  },
  "Director of Demand Planning": {
    autonomous: [
      "Enterprise-level executive briefing pack across all departments",
      "Cross-department contention identification and resolution",
      "Consolidated revenue at stake vs protected analysis",
      "Pending approval queue with cost-benefit recommendations",
    ],
    interactive: [
      "Enterprise portfolio oversight and strategic scenario planning",
      "Cross-functional impact analysis and resource allocation",
      "S&OP briefing preparation with automated data synthesis",
      "Dynamic executive dashboards with materiality-first framing",
    ],
  },
};
