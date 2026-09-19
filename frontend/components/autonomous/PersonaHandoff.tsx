"use client";

import React from "react";

type PersonaKey = "Demand Planner" | "Supply Planner" | "Director of Demand Planning";

interface HandoffConfig {
  message: string;
  linkText?: string;
  linkPersona?: PersonaKey;
}

const HANDOFFS: Record<PersonaKey, HandoffConfig> = {
  "Demand Planner": {
    message:
      "Analysis continues: the Supply Planner now projects availability risk and recommends actions to capture the opportunities detected above.",
    linkText: "Switch to Supply Planner",
    linkPersona: "Supply Planner",
  },
  "Supply Planner": {
    message:
      "Analysis continues: the Director of Demand Planning now receives the consolidated enterprise picture for S&OP.",
    linkText: "Switch to Director",
    linkPersona: "Director of Demand Planning",
  },
  "Director of Demand Planning": {
    message:
      "Closing the Loop: All signals detected, diagnosed, projected, and actioned in one morning. Realized outcomes are logged and fed back into the next detection cycle.",
  },
};

interface PersonaHandoffProps {
  persona: string;
  onSwitchPersona?: (persona: string) => void;
}

export function PersonaHandoff({ persona, onSwitchPersona }: PersonaHandoffProps) {
  const key = persona as PersonaKey;
  const handoff = HANDOFFS[key];
  if (!handoff) return null;

  return (
    <div
      className="rounded-xl border p-5 mt-10 mb-4"
      style={{
        borderColor: "var(--hex-border, #334155)",
        background: "linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(168,85,247,0.04) 100%)",
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-wider mb-2"
        style={{ color: "var(--hex-primary, #7c3aed)" }}
      >
        {handoff.linkPersona ? "Next" : "Complete"}
      </p>
      <p
        className="text-sm leading-relaxed mb-3"
        style={{ color: "var(--hex-text, #e2e8f0)" }}
      >
        {handoff.message}
      </p>
      {handoff.linkText && handoff.linkPersona && onSwitchPersona && (
        <button
          onClick={() => onSwitchPersona(handoff.linkPersona!)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
          style={{ color: "var(--hex-primary, #7c3aed)" }}
        >
          {handoff.linkText}
          <span className="material-icons-outlined" style={{ fontSize: "16px" }}>
            arrow_forward
          </span>
        </button>
      )}
    </div>
  );
}
