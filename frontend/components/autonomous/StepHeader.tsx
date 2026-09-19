"use client";

import React from "react";

interface StepHeaderProps {
  stepNumber: number;
  title: string;
  subtitle: string;
  mode?: "Autonomous" | "Interactive";
}

export function StepHeader({ stepNumber, title, subtitle, mode = "Autonomous" }: StepHeaderProps) {
  return (
    <div className="flex items-start gap-4 mb-6 mt-10 border-l-4 pl-5 py-3" style={{ borderImage: "linear-gradient(180deg, var(--hex-primary, #7c3aed), var(--hex-accent, #a855f7)) 1" }}>
      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: "linear-gradient(135deg, var(--hex-primary, #7c3aed), var(--hex-accent, #a855f7))" }}>
        {stepNumber}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold" style={{ color: "var(--hex-text, #e2e8f0)" }}>{title}</h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: mode === "Autonomous" ? "rgba(124,58,237,0.15)" : "rgba(59,130,246,0.15)", color: mode === "Autonomous" ? "var(--hex-primary, #7c3aed)" : "#3b82f6" }}>
            {mode}
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>{subtitle}</p>
      </div>
    </div>
  );
}
