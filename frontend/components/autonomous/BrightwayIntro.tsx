"use client";

import React from "react";

interface BrightwayIntroProps {
  timeContext?: { currentWeek: string; earliestWeek: string; totalWeeks: number } | null;
}

function parseFiscalWeek(fw: string): { week: number; year: number } | null {
  const m = fw.match(/^FW(\d{4})(\d{2})$/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), week: parseInt(m[2], 10) };
}

function formatFW(fw: string): string {
  const parsed = parseFiscalWeek(fw);
  if (!parsed) return fw;
  return `Week ${parsed.week}, ${parsed.year}`;
}

function prevFW(fw: string): string {
  const parsed = parseFiscalWeek(fw);
  if (!parsed) return fw;
  if (parsed.week <= 1) {
    return `Week 52, ${parsed.year - 1}`;
  }
  return `Week ${parsed.week - 1}, ${parsed.year}`;
}

export function BrightwayIntro({ timeContext }: BrightwayIntroProps) {
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
          className="text-lg font-bold mb-2"
          style={{ color: "var(--hex-text, #e2e8f0)" }}
        >
          Brightway Retail
        </h2>
        <div
          className="rounded-lg px-4 py-2.5 inline-block"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(99,102,241,0.10))",
            border: "1px solid rgba(124,58,237,0.2)",
          }}
        >
          <p
            className="text-base font-bold leading-relaxed"
            style={{ color: "var(--hex-text, #e2e8f0)" }}
          >
            $2.2B revenue &middot; 40 stores &middot; 5 regions &middot; 3
            departments{" "}
            <span style={{ color: "var(--hex-text-secondary, #94a3b8)", fontWeight: 500, fontSize: "0.875rem" }}>
              (Fresh &amp; Grocery, Consumer Electronics, Seasonal &amp; Home)
            </span>
          </p>
        </div>
      </div>

      {/* Time Context */}
      {timeContext && timeContext.currentWeek && (
        <div className="mb-5">
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--hex-text-dim, #64748b)", letterSpacing: "0.1em" }}
          >
            Data Coverage
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Current Period",
                value: formatFW(timeContext.currentWeek),
                icon: "calendar_today",
              },
              {
                label: "Last Week",
                value: prevFW(timeContext.currentWeek),
                icon: "history",
              },
              {
                label: "Historical Range",
                value: `${formatFW(timeContext.earliestWeek)} \u2192 ${formatFW(timeContext.currentWeek)}`,
                icon: "date_range",
              },
              {
                label: "Data Depth",
                value: `${timeContext.totalWeeks} weeks`,
                icon: "layers",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border p-3"
                style={{
                  borderColor: "var(--hex-border, #334155)",
                  background: "rgba(124,58,237,0.03)",
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="material-icons-outlined"
                    style={{ fontSize: "14px", color: "var(--hex-primary, #7c3aed)" }}
                  >
                    {item.icon}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold"
                    style={{ color: "var(--hex-text-dim, #64748b)" }}
                  >
                    {item.label}
                  </span>
                </div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--hex-text, #e2e8f0)" }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

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
            7-14 days
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
