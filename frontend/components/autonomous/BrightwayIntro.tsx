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

// Get Monday of ISO week (week 1 = week containing Jan 4)
function weekStartDate(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Mon=1..Sun=7
  const monday1 = new Date(jan4);
  monday1.setDate(jan4.getDate() - dayOfWeek + 1); // Monday of week 1
  const target = new Date(monday1);
  target.setDate(monday1.getDate() + (week - 1) * 7);
  return target;
}

function weekEndDate(year: number, week: number): Date {
  const start = weekStartDate(year, week);
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Sunday
  return end;
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function fwToDateRange(fw: string): string {
  const parsed = parseFiscalWeek(fw);
  if (!parsed) return fw;
  const start = weekStartDate(parsed.year, parsed.week);
  const end = weekEndDate(parsed.year, parsed.week);
  return `${formatDate(start)} \u2013 ${formatDate(end)}`;
}

function fwToLabel(fw: string): string {
  const parsed = parseFiscalWeek(fw);
  if (!parsed) return fw;
  return `Week ${parsed.week}, ${parsed.year}`;
}

function prevFWString(fw: string): string {
  const parsed = parseFiscalWeek(fw);
  if (!parsed) return fw;
  if (parsed.week <= 1) {
    return `FW${parsed.year - 1}52`;
  }
  return `FW${parsed.year}${String(parsed.week - 1).padStart(2, "0")}`;
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
      {timeContext && timeContext.currentWeek && (() => {
        const prevFW = prevFWString(timeContext.currentWeek);
        return (
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
                  value: fwToDateRange(timeContext.currentWeek),
                  sub: fwToLabel(timeContext.currentWeek),
                  icon: "calendar_today",
                },
                {
                  label: "Last Week",
                  value: fwToDateRange(prevFW),
                  sub: fwToLabel(prevFW),
                  icon: "history",
                },
                {
                  label: "Historical Range",
                  value: `${formatDate(weekStartDate(parseFiscalWeek(timeContext.earliestWeek)!.year, parseFiscalWeek(timeContext.earliestWeek)!.week))} \u2192 ${formatDate(weekEndDate(parseFiscalWeek(timeContext.currentWeek)!.year, parseFiscalWeek(timeContext.currentWeek)!.week))}`,
                  sub: `${fwToLabel(timeContext.earliestWeek)} \u2192 ${fwToLabel(timeContext.currentWeek)}`,
                  icon: "date_range",
                },
                {
                  label: "Data Depth",
                  value: `${timeContext.totalWeeks} weeks`,
                  sub: null,
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
                  {item.sub && (
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "var(--hex-text-secondary, #94a3b8)" }}
                    >
                      {item.sub}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
