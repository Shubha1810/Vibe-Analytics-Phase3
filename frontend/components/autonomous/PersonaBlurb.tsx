"use client";

import React from "react";

type PersonaKey = "Demand Planner" | "Supply Planner" | "Director of Demand Planning";

const BLURBS: Record<PersonaKey, { icon: string; text: string }> = {
  "Demand Planner": {
    icon: "query_stats",
    text: "The Demand Planning team oversees ~450 SKUs across Fresh & Grocery, Consumer Electronics, and Seasonal & Home. Their autonomous Morning Signal Pack scans all portfolios overnight against the latest signal refresh — POS, weather, competitor, promo, and digital signals — and surfaces anomalies ranked by revenue impact.",
  },
  "Supply Planner": {
    icon: "local_shipping",
    text: "The Supply Planner owns replenishment, DC allocation, and store-level flow across all departments. Their report projects how long detected anomalies will persist, predicts stockout and markdown risk, and recommends specific replenishment and sourcing actions within guardrails.",
  },
  "Director of Demand Planning": {
    icon: "supervisor_account",
    text: "The Director oversees all demand planners and the broader team. This Executive Briefing Pack consolidates signals from all three departments, highlights cross-department contentions, and stages the decisions that need sign-off before S&OP.",
  },
};

interface PersonaBlurbProps {
  persona: string;
}

export function PersonaBlurb({ persona }: PersonaBlurbProps) {
  const key = persona as PersonaKey;
  const blurb = BLURBS[key];
  if (!blurb) return null;

  return (
    <div
      className="rounded-xl border p-5 mb-8 flex items-start gap-4"
      style={{
        borderColor: "var(--hex-border, #334155)",
        background: "rgba(124,58,237,0.04)",
      }}
    >
      <span
        className="material-icons-outlined flex-shrink-0 mt-0.5"
        style={{ fontSize: "24px", color: "var(--hex-primary, #7c3aed)" }}
      >
        {blurb.icon}
      </span>
      <div>
        <p
          className="text-xs font-bold uppercase tracking-wider mb-1"
          style={{ color: "var(--hex-primary, #7c3aed)" }}
        >
          {persona}
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--hex-text-secondary, #94a3b8)" }}
        >
          {blurb.text}
        </p>
      </div>
    </div>
  );
}
