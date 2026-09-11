export const PERSONAS = [
  "Director of Demand Planning",
  "Supply Chain Director",
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
  { id: "rag-pipeline", label: "RAG Pipeline", icon: "model_training", path: "/rag-pipeline", disabled: false },
];

// Persona-specific module descriptions for homepage tiles
export const MODULE_BULLETS: Record<Persona, { autonomous: string[]; interactive: string[] }> = {
  "Director of Demand Planning": {
    autonomous: [
      "Multi-agent anomaly detection across demand signals",
      "Automated root cause and driver analysis per region",
      "Revenue-at-stake quantification with prescribed actions",
      "Executive briefing pack with cross-department contentions",
    ],
    interactive: [
      "Conversational demand forecasting and scenario planning",
      "Drill-down into regional and SKU-level anomalies",
      "What-if simulations for demand shift responses",
      "Dynamic visualizations with confidence intervals",
    ],
  },
  "Supply Chain Director": {
    autonomous: [
      "End-to-end supply chain risk and disruption detection",
      "Predictive lead-time and inventory optimization scoring",
      "Cross-functional impact analysis across sourcing and logistics",
      "Automated action plans with cost-benefit trade-offs",
    ],
    interactive: [
      "Conversational AI for supply chain and logistics queries",
      "Supplier performance and capacity constraint analysis",
      "Scenario modeling for procurement and distribution",
      "Real-time tracking of supply chain health indicators",
    ],
  },
};
