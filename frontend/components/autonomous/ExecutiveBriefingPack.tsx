"use client";

import React from "react";
import type { EnterpriseSummary, ReportSection, RecommendedAction } from "@/lib/orchestration-types";
import { HowToReadIt } from "./HowToReadIt";

interface ExecutiveBriefingPackProps {
  summary: EnterpriseSummary | null | undefined;
  sections: ReportSection[];
  contentions: unknown[];
  pendingApprovals: unknown[];
  narrative?: string | null;
}

const howToReadBullets = [
  "Enterprise roll-up across all departments.",
  "At Stake = total revenue exposure from all high-impact anomalies.",
  "Protected = revenue recovered by the team's recommended actions.",
  "Status separates decisions already within planner authority from those needing Director or Procurement sign-off.",
];

function formatUsd(v: number | null | undefined): string {
  if (v == null) return "\u2014";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function statusBadge(actions: RecommendedAction[]): { label: string; color: string; bg: string } {
  const needsApproval = actions.some(a => a.approval_required);
  if (needsApproval) return { label: "Needs Approval", color: "#f97316", bg: "rgba(249,115,22,0.12)" };
  if (actions.length > 0) return { label: "Within Authority", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
  return { label: "No Actions", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" };
}

export function ExecutiveBriefingPack({ summary, sections, contentions, pendingApprovals, narrative }: ExecutiveBriefingPackProps) {
  if (!summary && (!sections || sections.length === 0)) {
    return <div className="text-sm opacity-60 p-4">No executive briefing data available.</div>;
  }

  const kpis = [
    { label: "High-Impact Anomalies", value: summary?.anomalies_high_impact ?? "\u2014", color: "#ef4444" },
    { label: "Net Revenue at Stake", value: formatUsd(summary?.net_revenue_at_stake_usd), color: "#ef4444" },
    { label: "Protected / Recovered", value: formatUsd(summary?.protected_recovered_usd), color: "#22c55e" },
    { label: "Total Action Cost", value: formatUsd(summary?.total_action_cost_usd), color: "#f97316" },
    { label: "Pending Approvals", value: summary?.decisions_pending_approval ?? pendingApprovals.length, color: "#8b5cf6" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="rounded-xl border p-4" style={{ borderColor: "var(--hex-border, #334155)", background: "var(--hex-surface-1, #1e293b)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>{kpi.label}</p>
            <p className="text-lg font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4 items-start">
        {/* Consolidated Enterprise View */}
        <div className="flex-1 rounded-xl border overflow-hidden" style={{ borderColor: "var(--hex-border, #334155)", background: "var(--hex-surface-1, #1e293b)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--hex-surface-2, #0f172a)" }}>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Department</th>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Signal</th>
                  <th className="px-3 py-2.5 text-right font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>At Stake</th>
                  <th className="px-3 py-2.5 text-right font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Protected</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((sec, i) => {
                  const actions = sec.recommended_actions || [];
                  const badge = statusBadge(actions);
                  const atStake = sec.key_metrics?.find(m => m.metric?.toLowerCase().includes("risk") || m.metric?.toLowerCase().includes("stake"));
                  const protectedVal = sec.key_metrics?.find(m => m.metric?.toLowerCase().includes("protect") || m.metric?.toLowerCase().includes("recover"));
                  return (
                    <tr key={i} className="border-t" style={{ borderColor: "var(--hex-border, #334155)" }}>
                      <td className="px-3 py-2 font-medium" style={{ color: "var(--hex-text, #e2e8f0)" }}>{sec.department || sec.persona || `Dept ${i + 1}`}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>{sec.headline || "\u2014"}</td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: "#ef4444" }}>
                        {atStake?.value != null ? formatUsd(Number(atStake.value)) : "\u2014"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: "#22c55e" }}>
                        {protectedVal?.value != null ? formatUsd(Number(protectedVal.value)) : "\u2014"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* Enterprise total row */}
                {summary && (
                  <tr className="border-t-2" style={{ borderColor: "var(--hex-primary, #7c3aed)", background: "rgba(124,58,237,0.06)" }}>
                    <td className="px-3 py-2 font-bold" style={{ color: "var(--hex-text, #e2e8f0)" }} colSpan={2}>Enterprise Total</td>
                    <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: "#ef4444" }}>{formatUsd(summary.net_revenue_at_stake_usd)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: "#22c55e" }}>{formatUsd(summary.protected_recovered_usd)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs font-mono" style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>
                        {summary.decisions_within_authority ?? 0} approved / {summary.decisions_pending_approval ?? 0} pending
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <HowToReadIt bullets={howToReadBullets} />
      </div>

      {/* Cross-Department Contentions */}
      {contentions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--hex-text, #e2e8f0)" }}>
            <span className="material-icons-outlined text-amber-500" style={{ fontSize: "18px" }}>gavel</span>
            Cross-Department Contentions
          </h4>
          <div className="space-y-2">
            {contentions.map((c, i) => (
              <div key={i} className="rounded-xl border border-amber-200 p-4 text-sm" style={{ color: "var(--hex-text, #e2e8f0)", background: "rgba(245,158,11,0.05)" }}>
                {typeof c === "string" ? c : JSON.stringify(c)}
              </div>
            ))}
          </div>
        </div>
      )}

      {narrative && (
        <div className="rounded-xl border border-[var(--border-color)] p-4" style={{ background: "rgba(60,44,218,0.04)" }}>
          <p className="text-xs font-semibold text-[var(--hex-text-dim)] uppercase tracking-wider mb-2">AI Narrative</p>
          <p className="text-sm text-[var(--hex-text)] leading-relaxed">{narrative}</p>
        </div>
      )}
    </div>
  );
}
