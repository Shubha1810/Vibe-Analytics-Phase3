"use client";

import React from "react";

interface ClosingTheLoopProps {
  stepsCompleted?: number;
}

const steps = [
  { label: "Detect", icon: "search" },
  { label: "Explain", icon: "psychology" },
  { label: "Predict", icon: "timeline" },
  { label: "Act", icon: "task_alt" },
  { label: "Communicate", icon: "campaign" },
];

const feedbackItems = [
  "Weather elasticity coefficients refined from this cycle's actuals",
  "Days-of-supply corridors updated with latest lead-time data",
  "Promotional lift factors fed back to baseline forecast model",
];

export function ClosingTheLoop({ stepsCompleted = 5 }: ClosingTheLoopProps) {
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: "var(--hex-border, #334155)", background: "var(--hex-surface-1, #1e293b)" }}>
      {/* 5-step progress bar */}
      <div className="flex items-center justify-between mb-8 px-4">
        {steps.map((step, i) => {
          const completed = i < stepsCompleted;
          const isLast = i === steps.length - 1;
          return (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{
                    background: completed
                      ? "linear-gradient(135deg, var(--hex-primary, #7c3aed), var(--hex-accent, #a855f7))"
                      : "var(--hex-surface-2, #0f172a)",
                    border: completed ? "none" : "2px solid var(--hex-border, #334155)",
                    color: completed ? "white" : "var(--hex-text-secondary, #94a3b8)",
                  }}
                >
                  {completed ? (
                    <span className="material-icons-outlined" style={{ fontSize: "20px" }}>check</span>
                  ) : (
                    <span className="material-icons-outlined" style={{ fontSize: "18px" }}>{step.icon}</span>
                  )}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: completed ? "var(--hex-primary, #7c3aed)" : "var(--hex-text-secondary, #94a3b8)" }}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 rounded-full" style={{ background: i < stepsCompleted - 1 ? "var(--hex-primary, #7c3aed)" : "var(--hex-border, #334155)" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* S&OP headline */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--hex-text, #e2e8f0)" }}>
          Closing the Loop
        </h3>
        <p className="text-sm" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>
          All signals detected, diagnosed, projected, and actioned in one morning.
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--hex-primary, #7c3aed)" }}>
          7-14 days of analysis condensed into one Tuesday morning
        </p>
      </div>

      {/* Feedback items */}
      <div className="rounded-xl border p-4" style={{ borderColor: "var(--hex-border, #334155)", background: "rgba(124,58,237,0.04)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--hex-primary, #7c3aed)" }}>
          Fed Back Into Next Cycle
        </p>
        <ul className="space-y-2">
          {feedbackItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>
              <span className="material-icons-outlined mt-0.5 flex-shrink-0" style={{ fontSize: "14px", color: "var(--hex-primary, #7c3aed)" }}>sync</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
