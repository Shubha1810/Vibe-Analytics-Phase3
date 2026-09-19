"use client";

import React from "react";

const FORCES = [
  {
    label: "Heat Wave",
    detail: "Record-breaking temperatures across the Southwest are shifting purchase patterns for hydration, cooling, and perishables.",
    icon: "thermostat",
    color: "#ef4444",
  },
  {
    label: "Back-to-School",
    detail: "The annual back-to-school surge is driving demand spikes in electronics, stationery, and seasonal home goods.",
    icon: "school",
    color: "#f59e0b",
  },
  {
    label: "Viral Trend",
    detail: "A trending social-media recipe has caused a 4× spike in specific produce categories within 72 hours.",
    icon: "trending_up",
    color: "#8b5cf6",
  },
];

export function BrightwayIntro() {
  return (
    <div
      className="rounded-xl border p-6 mb-8"
      style={{
        borderColor: "var(--hex-border, #334155)",
        background: "var(--hex-surface-1, #1e293b)",
      }}
    >
      {/* Company overview */}
      <div className="mb-5">
        <h2
          className="text-lg font-bold mb-1"
          style={{ color: "var(--hex-text, #e2e8f0)" }}
        >
          Brightway Retail
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--hex-text-secondary, #94a3b8)" }}
        >
          $2.2B revenue &middot; 40 stores &middot; 5 regions &middot; 3
          departments (Fresh &amp; Grocery, Consumer Electronics, Seasonal &amp;
          Home)
        </p>
      </div>

      {/* Three converging forces */}
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--hex-text-dim, #64748b)" }}
      >
        Three converging forces this week
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {FORCES.map((f) => (
          <div
            key={f.label}
            className="rounded-lg border p-4"
            style={{
              borderColor: "var(--hex-border, #334155)",
              background: "rgba(124,58,237,0.03)",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="material-icons-outlined"
                style={{ fontSize: "18px", color: f.color }}
              >
                {f.icon}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--hex-text, #e2e8f0)" }}
              >
                {f.label}
              </span>
            </div>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--hex-text-secondary, #94a3b8)" }}
            >
              {f.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Value prop */}
      <div
        className="rounded-lg px-4 py-3 text-center"
        style={{ background: "rgba(124,58,237,0.08)" }}
      >
        <p
          className="text-sm font-medium"
          style={{ color: "var(--hex-text, #e2e8f0)" }}
        >
          What would normally take{" "}
          <span className="font-bold" style={{ color: "var(--hex-primary, #7c3aed)" }}>
            7–14 days
          </span>{" "}
          of cross-team analysis is condensed into{" "}
          <span className="font-bold" style={{ color: "var(--hex-primary, #7c3aed)" }}>
            one morning
          </span>
          .
        </p>
      </div>
    </div>
  );
}
