"use client";

import { useState } from "react";

interface Props {
  onAgree: () => void;
  onDisagree: (feedback: string) => void;
}

export default function AgreeDisagreeCard({ onAgree, onDisagree }: Props) {
  const [feedback, setFeedback] = useState("");

  const handleDisagree = () => {
    onDisagree(feedback.trim());
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-[var(--hex-primary)]/20 p-4 mb-3 animate-scale-in"
      style={{ background: "linear-gradient(135deg, rgba(60,44,218,0.03), rgba(0,184,148,0.03))" }}>
      <div className="text-xs font-semibold text-[var(--hex-text)] mb-1">
        Do you agree with the agent&apos;s approach?
      </div>
      <div className="text-[11px] text-[var(--hex-text-dim)] mb-3 leading-relaxed">
        Click Agree to generate the full answer, or enter feedback next to Disagree to refine — the agent will go straight to output.
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onAgree}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-medium cursor-pointer border-none transition-all hover:opacity-90 hover:-translate-y-px"
          style={{ background: "linear-gradient(135deg, var(--hex-accent), var(--hex-accent-dark))", boxShadow: "0 2px 8px rgba(0,184,148,0.25)" }}
        >
          <span className="material-icons-outlined" style={{ fontSize: "14px" }}>check_circle</span>
          Agree
        </button>
        <button
          onClick={handleDisagree}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer border border-[var(--hex-error)]/30 bg-white text-[var(--hex-error)] transition-all hover:bg-[var(--hex-error)]/5 hover:-translate-y-px"
        >
          <span className="material-icons-outlined" style={{ fontSize: "14px" }}>cancel</span>
          Disagree
        </button>
        <input
          type="text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleDisagree();
            }
          }}
          placeholder="e.g., focus on West region, show by SKU category..."
          className="flex-1 min-w-[200px] px-3 py-2 text-xs border border-[var(--border-color)] rounded-lg outline-none bg-white text-[var(--hex-text)] placeholder:text-[var(--hex-text-muted)] focus:border-[var(--hex-primary)] focus:ring-2 focus:ring-[var(--hex-primary)]/10 transition-all"
        />
      </div>
    </div>
  );
}
