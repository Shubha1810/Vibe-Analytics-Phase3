"use client";

import React, { useMemo } from "react";
import type { RecommendationCard } from "@/lib/orchestration-types";
import { ChartExplainer } from "./ChartExplainer";

interface RecommendationCardsProps {
  data: RecommendationCard[];
  narrative?: string | null;
  mode?: "execution" | "communication";
}

const APPROVAL_COST_THRESHOLD = 250_000;

const SEVERITY_STYLE: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
  HIGH: { bg: "rgba(249,115,22,0.15)", text: "#f97316" },
  MEDIUM: { bg: "rgba(234,179,8,0.15)", text: "#eab308" },
  LOW: { bg: "rgba(99,102,241,0.15)", text: "#6366F1" },
};

function formatUSD(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function formatConf(val: number): string {
  const pct = val <= 1 ? val * 100 : val;
  return `${pct.toFixed(0)}%`;
}

function urgencyLabel(days: number): { label: string; color: string } {
  if (days <= 2) return { label: "Immediate", color: "#ef4444" };
  if (days <= 5) return { label: "Urgent", color: "#f97316" };
  return { label: "Monitor", color: "#eab308" };
}

function authorityStatus(cost: number): { label: string; bg: string; text: string } {
  if (cost > APPROVAL_COST_THRESHOLD) return { label: "Approval Required", bg: "rgba(249,115,22,0.15)", text: "#f97316" };
  return { label: "Direct Action", bg: "rgba(34,197,94,0.15)", text: "#22c55e" };
}

function driverAction(driver: string, l3: string, region: string): string {
  const d = driver.toLowerCase();
  if (d.includes("weather")) return `Weather-driven demand shift in ${l3} (${region}) \u2014 secure short-term replenishment without over-committing beyond the forecast window.`;
  if (d.includes("digital") || d.includes("social")) return `Digital/social signal spike driving demand for ${l3} (${region}) \u2014 monitor decay rate before large inventory commitments.`;
  if (d.includes("promo")) return `Promotional activity inflating demand for ${l3} (${region}) \u2014 validate whether lift is incremental or pulled-forward.`;
  if (d.includes("competitor")) return `Competitor disruption creating opportunity for ${l3} (${region}) \u2014 assess whether the effect is temporary or structural.`;
  if (d.includes("residual")) return `Unexplained demand deviation for ${l3} (${region}) \u2014 investigate missing variables, local effects, or data quality before committing resources.`;
  return `Address demand risk for ${l3} in ${region} \u2014 review supply positioning and replenishment priorities.`;
}

function sortCards(cards: RecommendationCard[]): RecommendationCard[] {
  return [...cards].sort((a, b) => {
    if (b.impact_usd !== a.impact_usd) return b.impact_usd - a.impact_usd;
    const key = (c: RecommendationCard) => `${c.category_l3}||${c.region}`;
    return key(a).localeCompare(key(b));
  });
}

export function RecommendationCards({ data, narrative, mode = "execution" }: RecommendationCardsProps) {
  const top5 = useMemo(() => sortCards(data).slice(0, 5), [data]);
  const isCommunication = mode === "communication";

  const computedInsight = useMemo(() => {
    if (!top5.length) return null;

    const totalImpact = top5.reduce((s, c) => s + c.impact_usd, 0);
    const totalCost = top5.reduce((s, c) => s + c.cost_usd, 0);
    const totalVAR = top5.reduce((s, c) => s + c.total_value_at_risk, 0);
    const avgBCR = top5.reduce((s, c) => s + c.benefit_cost_ratio, 0) / top5.length;
    const topCard = top5[0];
    const directCount = top5.filter((c) => c.cost_usd <= APPROVAL_COST_THRESHOLD).length;
    const approvalCount = top5.filter((c) => c.cost_usd > APPROVAL_COST_THRESHOLD).length;
    const regions = [...new Set(top5.map((c) => c.region))];
    const l3cats = [...new Set(top5.map((c) => c.category_l3))];

    const lines: string[] = [];
    if (isCommunication) {
      lines.push(`**${top5.length}** priority recommendations requiring leadership visibility across **${l3cats.length}** subcategories and **${regions.length}** regions. Total value at risk: **${formatUSD(totalVAR)}**. Total intervention cost: **${formatUSD(totalCost)}**. Average benefit-cost ratio: **${avgBCR.toFixed(1)}x**.`);
    } else {
      lines.push(`**${top5.length}** highest-impact prescriptive recommendations across **${l3cats.length}** subcategories and **${regions.length}** regions. Total impact: **${formatUSD(totalImpact)}**. Total value at risk: **${formatUSD(totalVAR)}**. Total intervention cost: **${formatUSD(totalCost)}**. Average benefit-cost ratio: **${avgBCR.toFixed(1)}x**.`);
    }
    if (topCard) {
      const topAuth = authorityStatus(topCard.cost_usd);
      lines.push(`Highest priority: **${topCard.category_l3}** in **${topCard.region}** (${topCard.category_l2}) \u2014 **${formatUSD(topCard.impact_usd)}** impact, **${formatUSD(topCard.cost_usd)}** cost, **${formatConf(topCard.confidence)}** confidence. Authority: **${topAuth.label}**.`);
    }
    if (directCount) lines.push(`**${directCount}** recommendations qualify for **Direct Action** (cost \u2264 $250K).`);
    if (approvalCount) lines.push(`**${approvalCount}** recommendations require **Approval** (cost > $250K).`);

    const implLines: string[] = [];
    if (isCommunication) {
      if (totalImpact > 1_000_000) {
        implLines.push(`**${formatUSD(totalImpact)}** total exposure across the top 5 recommendations demands cross-functional leadership alignment and resource commitment.`);
      }
      if (approvalCount > 0) {
        implLines.push(`**${approvalCount}** recommendations exceed the $250K authority threshold \u2014 leadership approval is required before execution can proceed.`);
      }
      if (directCount > 0) {
        implLines.push(`**${directCount}** recommendations are within the Supply Planner authority limit and can proceed through the Direct Action path.`);
      }
    } else {
      if (totalImpact > 1_000_000) {
        implLines.push(`**${formatUSD(totalImpact)}** total exposure across the top 5 interventions requires coordinated supply response at the subcategory level.`);
      }
      if (totalCost > 0 && avgBCR > 3) {
        implLines.push(`Average benefit-cost ratio of **${avgBCR.toFixed(1)}x** indicates strong ROI \u2014 intervention cost of **${formatUSD(totalCost)}** is well justified by **${formatUSD(totalImpact)}** in protected revenue.`);
      }
      if (approvalCount > 0) {
        implLines.push(`**${approvalCount}** high-cost interventions exceed the $250K authority threshold and require escalation before execution.`);
      }
    }
    if (!implLines.length) implLines.push("Recommendation portfolio is within standard operating parameters.");

    const actLines: string[] = [];
    if (isCommunication) {
      if (approvalCount) actLines.push(`Review and approve **${approvalCount}** recommendations that exceed the $250K threshold.`);
      if (directCount) actLines.push(`Confirm that **${directCount}** Direct Action recommendations are proceeding as planned.`);
      actLines.push("Communicate priority actions and expected outcomes to stakeholders at the next S&OP review.");
      actLines.push("Monitor execution progress and escalate any cross-department capacity conflicts.");
    } else {
      if (directCount) actLines.push(`Execute **${directCount}** Direct Action recommendations immediately \u2014 these are within the Supply Planner authority limit.`);
      if (approvalCount) actLines.push(`Submit **${approvalCount}** Approval Required recommendations for management sign-off before proceeding.`);
      actLines.push("Execute interventions in the displayed priority order (highest impact first).");
      actLines.push("Escalate cross-category capacity conflicts to the Director for S&OP resolution.");
    }

    return lines.join(" ") + ` |IMPLICATIONS| ${implLines.join(" ")} |ACTIONS| ${actLines.join(" ")}`;
  }, [top5, isCommunication]);

  if (!data.length) return <div className="text-sm opacity-60 p-4">No recommendation data available.</div>;

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        {top5.map((card, i) => {
          const sev = SEVERITY_STYLE[card.severity] || SEVERITY_STYLE.MEDIUM;
          const urg = urgencyLabel(card.days_to_impact);
          const auth = authorityStatus(card.cost_usd);
          return (
            <div
              key={`${card.category_l3}-${card.region}`}
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--hex-border, #334155)", background: "var(--hex-card-bg, #ffffff)" }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                    style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}>
                    #{i + 1}
                  </span>
                  <h4 className="text-sm font-bold" style={{ color: "var(--hex-text, #1e293b)" }}>
                    {card.category_l3} &mdash; {card.region}
                  </h4>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: sev.bg, color: sev.text }}>
                    {card.severity}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "rgba(124,58,237,0.08)", color: urg.color }}>
                    {urg.label} ({card.days_to_impact}d)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: auth.bg, color: auth.text }}>
                    {auth.label}
                  </span>
                </div>
              </div>

              {/* Scope */}
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--hex-text-secondary, #64748b)" }}>Scope:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc" style={{ color: "var(--hex-text, #334155)" }}>
                  <li>Parent Category (L2): <strong>{card.category_l2}</strong></li>
                  <li>Subcategory (L3): <strong>{card.category_l3}</strong></li>
                  <li>Region: <strong>{card.region}</strong></li>
                </ul>
              </div>

              {/* Findings */}
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--hex-text-secondary, #64748b)" }}>Findings:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc" style={{ color: "var(--hex-text, #334155)" }}>
                  <li><strong>{card.risk_count}</strong> active risk records for {card.category_l3} in {card.region}</li>
                  <li>Primary demand driver: <strong>{card.primary_driver}</strong></li>
                  <li>Severity: <strong>{card.severity}</strong> with <strong>{card.days_to_impact} days</strong> to impact</li>
                  <li>Total value at risk: <strong>{formatUSD(card.total_value_at_risk)}</strong></li>
                </ul>
              </div>

              {/* Recommended Action */}
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--hex-text-secondary, #64748b)" }}>Recommended Action:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc" style={{ color: "var(--hex-text, #334155)" }}>
                  <li>{driverAction(card.primary_driver, card.category_l3, card.region)}</li>
                  <li>Recommended posture: <strong>{card.posture}</strong></li>
                  <li>Monitor recovery trajectory and adjust within {Math.max(1, card.days_to_impact)} days</li>
                </ul>
              </div>

              {/* Approval / Authority */}
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--hex-text-secondary, #64748b)" }}>Approval / Authority:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc" style={{ color: "var(--hex-text, #334155)" }}>
                  <li>Implementation cost: <strong>{formatUSD(card.cost_usd)}</strong></li>
                  <li>Authority status: <strong style={{ color: auth.text }}>{auth.label}</strong></li>
                  {card.cost_usd <= APPROVAL_COST_THRESHOLD ? (
                    <>
                      <li>Execute within the defined Supply Planner authority limit</li>
                      <li>Record the action and monitor the outcome</li>
                    </>
                  ) : (
                    <>
                      <li>Submit for management approval before execution</li>
                      <li>Continue monitoring the risk while approval is pending</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Business Implications */}
              <div className="mb-4">
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--hex-text-secondary, #64748b)" }}>Business Implications:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc" style={{ color: "var(--hex-text, #334155)" }}>
                  <li>Estimated impact: <strong>{formatUSD(card.impact_usd)}</strong></li>
                  <li>Recoverable value: <strong>{formatUSD(card.recoverable_usd)}</strong></li>
                  <li>Benefit-cost ratio: <strong>{card.benefit_cost_ratio.toFixed(1)}x</strong> return per dollar invested</li>
                  {card.benefit_cost_ratio >= 5 && (
                    <li style={{ color: "#22c55e" }}>High-confidence investment \u2014 strong ROI justification</li>
                  )}
                  {card.benefit_cost_ratio < 2 && card.benefit_cost_ratio > 0 && (
                    <li style={{ color: "#f97316" }}>Marginal ROI \u2014 evaluate carefully before approval</li>
                  )}
                </ul>
              </div>

              {/* Metadata footer */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-3 text-xs"
                style={{ borderTop: "1px solid var(--hex-border, #e2e8f0)" }}>
                <div>
                  <span style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Parent Category: </span>
                  <span className="font-semibold" style={{ color: "var(--hex-text, #1e293b)" }}>{card.category_l2}</span>
                </div>
                <div>
                  <span style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Subcategory: </span>
                  <span className="font-semibold" style={{ color: "var(--hex-text, #1e293b)" }}>{card.category_l3}</span>
                </div>
                <div>
                  <span style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Region: </span>
                  <span className="font-semibold" style={{ color: "var(--hex-text, #1e293b)" }}>{card.region}</span>
                </div>
                <div>
                  <span style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Impact: </span>
                  <span className="font-bold" style={{ color: "#ef4444" }}>{formatUSD(card.impact_usd)}</span>
                </div>
                <div>
                  <span style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Total VAR: </span>
                  <span className="font-bold" style={{ color: "#ef4444" }}>{formatUSD(card.total_value_at_risk)}</span>
                </div>
                <div>
                  <span style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Cost: </span>
                  <span className="font-bold" style={{ color: "#f97316" }}>{formatUSD(card.cost_usd)}</span>
                </div>
                <div>
                  <span style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Confidence: </span>
                  <span className="font-bold" style={{ color: card.confidence >= 0.8 ? "#22c55e" : card.confidence >= 0.5 ? "#F59E0B" : "#6366F1" }}>
                    {formatConf(card.confidence)}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Authority: </span>
                  <span className="font-bold" style={{ color: auth.text }}>{auth.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ChartExplainer narrative={computedInsight || narrative} />
    </div>
  );
}
