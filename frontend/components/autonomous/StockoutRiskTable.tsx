"use client";

import React from "react";
import { HowToReadIt } from "./HowToReadIt";
import type { AnomalyRow } from "@/lib/orchestration-types";

interface StockoutRiskTableProps {
  data: AnomalyRow[];
  narrative?: string | null;
}

const howToReadBullets = [
  "Each row is a high-risk SKU category with imminent impact (within 7 days).",
  "Days to Impact = how soon this anomaly affects revenue or availability.",
  "Value at Risk = dollar exposure if no action is taken.",
  "Confidence reflects how many independent signals confirm the risk.",
  "Rows are sorted by urgency (days to impact ascending).",
];

function riskColor(days: number): { bg: string; text: string; label: string } {
  if (days <= 2) return { bg: "rgba(239,68,68,0.15)", text: "#ef4444", label: "Critical" };
  if (days <= 5) return { bg: "rgba(249,115,22,0.15)", text: "#f97316", label: "Urgent" };
  return { bg: "rgba(234,179,8,0.15)", text: "#eab308", label: "Watch" };
}

export function StockoutRiskTable({ data, narrative }: StockoutRiskTableProps) {
  const sorted = [...data].sort((a, b) => a.days_to_impact - b.days_to_impact);

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--border-color)] p-5 mb-6" style={{ background: "var(--hex-card-bg)" }}>
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[var(--hex-text)] mb-1">Stockout & Availability Risk</h3>
          <p className="text-xs text-[var(--hex-text-dim)] mb-4">
            {sorted.length} SKU categories at risk within 7 days — sorted by urgency
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--hex-text-dim)]">Category</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--hex-text-dim)]">Region</th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--hex-text-dim)]">Days to Impact</th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--hex-text-dim)]">Value at Risk</th>
                  <th className="px-3 py-2 text-center font-semibold text-[var(--hex-text-dim)]">Risk Level</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--hex-text-dim)]">Primary Driver</th>
                  <th className="px-3 py-2 text-center font-semibold text-[var(--hex-text-dim)]">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => {
                  const risk = riskColor(row.days_to_impact);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td className="px-3 py-2 font-medium text-[var(--hex-text)]">{row.category}</td>
                      <td className="px-3 py-2 text-[var(--hex-text)]">{row.region}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: risk.text }}>
                        {row.days_to_impact}d
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--hex-text)]">
                        ${row.value_at_risk.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: risk.bg, color: risk.text }}>
                          {risk.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[var(--hex-text-dim)]">{row.primary_driver}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-[10px] font-bold ${row.confidence >= 0.8 ? "text-green-600" : row.confidence >= 0.5 ? "text-amber-600" : "text-red-500"}`}>
                          {(row.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="hidden lg:block w-56 flex-shrink-0">
          <HowToReadIt bullets={howToReadBullets} />
        </div>
      </div>
      {narrative && (
        <div className="mt-4 rounded-xl border border-[var(--border-color)] p-4" style={{ background: "rgba(60,44,218,0.04)" }}>
          <p className="text-xs font-semibold text-[var(--hex-text-dim)] uppercase tracking-wider mb-2">AI Narrative</p>
          <p className="text-sm text-[var(--hex-text)] leading-relaxed">{narrative}</p>
        </div>
      )}
    </div>
  );
}

