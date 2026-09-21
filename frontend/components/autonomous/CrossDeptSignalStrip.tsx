"use client";

import React from "react";
import type { AnomalyRow } from "@/lib/orchestration-types";
import { HowToReadIt } from "./HowToReadIt";
import { ChartExplainer } from "./ChartExplainer";

interface CrossDeptSignalStripProps {
  anomalies: AnomalyRow[];
  narrative?: string | null;
}

const HOW_TO_READ = [
  "One card per department showing their top anomaly.",
  "The common signal forces row at the bottom shows which external drivers are active across multiple departments — these are coordination triggers.",
];

const SIGNAL_ICONS: Record<string, string> = {
  Weather: "thermostat",
  Promotion: "campaign",
  Competitor: "storefront",
  Digital: "trending_up",
};

export function CrossDeptSignalStrip({ anomalies, narrative }: CrossDeptSignalStripProps) {
  if (!anomalies.length) return null;

  // Group by department (use risk_type or category root as department proxy)
  const deptMap = new Map<string, AnomalyRow[]>();
  for (const a of anomalies) {
    const dept = a.category.split(" > ")[0] || a.category;
    if (!deptMap.has(dept)) deptMap.set(dept, []);
    deptMap.get(dept)!.push(a);
  }

  const departments = [...deptMap.entries()].map(([dept, rows]) => {
    const sorted = [...rows].sort((a, b) => b.value_at_risk - a.value_at_risk);
    const high = rows.filter((r) => r.severity === "CRITICAL" || r.severity === "HIGH").length;
    const medium = rows.filter((r) => r.severity === "MEDIUM").length;
    const calm = rows.filter((r) => r.severity === "LOW").length;
    return { dept, total: rows.length, high, medium, calm, top: sorted[0] };
  });

  // Common signal forces: extract from primary_driver across all anomalies
  const driverCounts = new Map<string, number>();
  for (const a of anomalies) {
    if (a.primary_driver) {
      const d = a.primary_driver;
      driverCounts.set(d, (driverCounts.get(d) || 0) + 1);
    }
  }
  const commonSignals = [...driverCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "var(--hex-text, #1e293b)" }}>
        <span className="material-icons-outlined" style={{ fontSize: "20px", color: "#F59E0B" }}>hub</span>
        Cross-Department Signal Awareness
      </h3>
      <div className="flex gap-4 max-lg:flex-col">
        <div className="flex-1 flex flex-col gap-3">
          {/* Department cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {departments.map(({ dept, total, high, medium, calm, top }) => (
              <div
                key={dept}
                className="rounded-xl border p-4"
                style={{
                  borderColor: "var(--hex-border, #334155)",
                  background: "var(--hex-surface-1, #1e293b)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold" style={{ color: "var(--hex-text, #e2e8f0)" }}>
                    {dept}
                  </h4>
                  <span
                    className="text-xs font-mono"
                    style={{ color: "var(--hex-text-secondary, #94a3b8)" }}
                  >
                    {total} SKUs
                  </span>
                </div>

                {/* Anomaly counts */}
                <div className="flex gap-2 mb-3">
                  {high > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
                    >
                      {high} high
                    </span>
                  )}
                  {medium > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}
                    >
                      {medium} med
                    </span>
                  )}
                  {calm > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}
                    >
                      {calm} calm
                    </span>
                  )}
                </div>

                {/* Top anomaly */}
                {top && (
                  <div
                    className="rounded-lg p-2.5 text-xs"
                    style={{ background: "var(--hex-surface-2, #0f172a)" }}
                  >
                    <div className="font-semibold mb-1" style={{ color: "var(--hex-text, #e2e8f0)" }}>
                      {top.category}
                    </div>
                    <div className="flex items-center gap-3" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>
                      <span>
                        {top.deviation_pct > 0 ? "+" : ""}
                        {top.deviation_pct.toFixed(1)}%
                      </span>
                      <span>{top.region}</span>
                      <span className="font-mono">
                        {top.value_at_risk >= 1000
                          ? `$${(top.value_at_risk / 1000).toFixed(0)}K`
                          : `$${top.value_at_risk.toFixed(0)}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Common Signal Forces */}
          {commonSignals.length > 0 && (
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: "var(--hex-border, #334155)",
                background: "var(--hex-surface-1, #1e293b)",
              }}
            >
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--hex-text-secondary, #94a3b8)" }}
              >
                Common Signal Forces
              </div>
              <div className="flex flex-wrap gap-3">
                {commonSignals.map(([driver, count]) => (
                  <div key={driver} className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-base"
                      style={{ color: "var(--hex-primary, #7c3aed)" }}
                    >
                      {SIGNAL_ICONS[driver] || "sensors"}
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--hex-text, #e2e8f0)" }}>
                      {driver}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                      style={{
                        background: "rgba(124,58,237,0.1)",
                        color: "var(--hex-primary, #7c3aed)",
                      }}
                    >
                      {count} depts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* HOW TO READ IT sidebar */}
        <HowToReadIt bullets={HOW_TO_READ} />
      </div>

      <ChartExplainer narrative={narrative} />
    </div>
  );
}
