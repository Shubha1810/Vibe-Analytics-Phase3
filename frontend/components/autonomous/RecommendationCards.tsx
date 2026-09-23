"use client";

import React, { useMemo } from "react";
import type { RecommendationCard } from "@/lib/orchestration-types";
import { ChartExplainer } from "./ChartExplainer";

interface RecommendationCardsProps {
  data: RecommendationCard[];
  narrative?: string | null;
  vizNumber?: string;
}

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

function driverAction(driver: string, category: string, region: string): string {
  const d = driver.toLowerCase();
  if (d.includes("weather")) return `Weather-driven demand shift in ${category} (${region}) — secure short-term replenishment without over-committing beyond the forecast window.`;
  if (d.includes("digital") || d.includes("social")) return `Digital/social signal spike driving demand in ${category} (${region}) — monitor decay rate before large inventory commitments.`;
  if (d.includes("promo")) return `Promotional activity inflating demand for ${category} (${region}) — validate whether lift is incremental or pulled-forward.`;
  if (d.includes("competitor")) return `Competitor disruption creating opportunity in ${category} (${region}) — assess whether the effect is temporary or structural.`;
  if (d.includes("residual")) return `Unexplained demand deviation in ${category} (${region}) — investigate missing variables, local effects, or data quality before committing resources.`;
  return `Address demand risk in ${category} (${region}) — review supply positioning and replenishment priorities.`;
}

function sortCards(cards: RecommendationCard[]): RecommendationCard[] {
  return [...cards].sort((a, b) => {
    if (b.impact_usd !== a.impact_usd) return b.impact_usd - a.impact_usd;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const catCmp = a.category_l2.localeCompare(b.category_l2);
    if (catCmp !== 0) return catCmp;
    return a.region.localeCompare(b.region);
  });
}

export function RecommendationCards({ data, narrative, vizNumber }: RecommendationCardsProps) {
  const top10 = useMemo(() => sortCards(data).slice(0, 10), [data]);

  const computedInsight = useMemo(() => {
    if (!top10.length) return null;

    const totalImpact = top10.reduce((s, c) => s + c.impact_usd, 0);
    const totalCost = top10.reduce((s, c) => s + c.cost_usd, 0);
    const avgConf = top10.reduce((s, c) => s + c.confidence, 0) / top10.length;
    const avgBCR = top10.reduce((s, c) => s + c.benefit_cost_ratio, 0) / top10.length;
    const topCard = top10[0];
    const criticalCount = top10.filter((c) => c.severity === "CRITICAL").length;
    const immediateCount = top10.filter((c) => c.days_to_impact <= 2).length;
    const regions = [...new Set(top10.map((c) => c.region))];
    const categories = [...new Set(top10.map((c) => c.category_l2))];

    const lines: string[] = [];
    lines.push(`**${top10.length}** highest-impact prescriptive recommendations across **${categories.length}** categories and **${regions.length}** regions. Total value at risk: **${formatUSD(totalImpact)}**. Total intervention cost: **${formatUSD(totalCost)}**. Average benefit-cost ratio: **${avgBCR.toFixed(1)}x**.`);
    if (topCard) {
      lines.push(`Highest priority: **${topCard.category_l2}** in **${topCard.region}** \u2014 **${formatUSD(topCard.impact_usd)}** impact, **${formatUSD(topCard.cost_usd)}** cost, **${formatConf(topCard.confidence)}** confidence.`);
    }
    if (criticalCount) lines.push(`**${criticalCount}** recommendations at CRITICAL severity.`);
    if (immediateCount) lines.push(`**${immediateCount}** require immediate action (\u22642 days to impact).`);

    const implLines: string[] = [];
    if (totalImpact > 1_000_000) {
      implLines.push(`**${formatUSD(totalImpact)}** total exposure across the top 10 interventions requires coordinated supply response \u2014 individual category-level actions alone are insufficient.`);
    }
    if (totalCost > 0 && avgBCR > 3) {
      implLines.push(`Average benefit-cost ratio of **${avgBCR.toFixed(1)}x** indicates strong ROI \u2014 intervention cost of **${formatUSD(totalCost)}** is well justified by **${formatUSD(totalImpact)}** in protected revenue.`);
    } else if (totalCost > 0) {
      implLines.push(`Total intervention cost of **${formatUSD(totalCost)}** against **${formatUSD(totalImpact)}** exposure \u2014 evaluate cost-benefit on a per-card basis before blanket approval.`);
    }
    if (criticalCount >= 3) {
      implLines.push(`**${criticalCount}** CRITICAL-severity items suggest systemic supply stress \u2014 escalate to S&OP for cross-functional resource allocation.`);
    }
    if (!implLines.length) implLines.push("Recommendation portfolio is within standard operating parameters.");

    const actLines: string[] = [];
    if (immediateCount) actLines.push(`Approve replenishment for **${immediateCount}** immediate-action items today.`);
    actLines.push(`Execute interventions in the displayed priority order (highest impact first).`);
    actLines.push(`Monitor benefit-cost ratios \u2014 cards with BCR > 5x are high-confidence investments.`);
    actLines.push("Escalate cross-category capacity conflicts to the Director for S&OP resolution.");

    return lines.join(" ") + ` |IMPLICATIONS| ${implLines.join(" ")} |ACTIONS| ${actLines.join(" ")}`;
  }, [top10]);

  if (!data.length) return <div className="text-sm opacity-60 p-4">No recommendation data available.</div>;

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        {top10.map((card, i) => {
          const sev = SEVERITY_STYLE[card.severity] || SEVERITY_STYLE.MEDIUM;
          const urg = urgencyLabel(card.days_to_impact);
          return (
            <div
              key={`${card.category_l2}-${card.region}`}
              className="rounded-xl border p-5"
              style={{
                borderColor: "var(--hex-border, #334155)",
                background: "var(--hex-card-bg, #ffffff)",
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                    style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}>
                    #{i + 1}
                  </span>
                  <h4 className="text-sm font-bold" style={{ color: "var(--hex-text, #1e293b)" }}>
                    {card.category_l2} &mdash; {card.region}
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
                </div>
              </div>

              {/* Findings */}
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--hex-text-secondary, #64748b)" }}>Findings:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc" style={{ color: "var(--hex-text, #334155)" }}>
                  <li><strong>{card.risk_count}</strong> active risk records identified in {card.category_l2} across the {card.region} region</li>
                  <li>Primary demand driver: <strong>{card.primary_driver}</strong></li>
                  <li>Severity classification: <strong>{card.severity}</strong> with <strong>{card.days_to_impact} days</strong> to impact</li>
                  <li>Total value at risk: <strong>{formatUSD(card.impact_usd)}</strong>, recoverable value: <strong>{formatUSD(card.recoverable_usd)}</strong></li>
                </ul>
              </div>

              {/* Recommended Action */}
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--hex-text-secondary, #64748b)" }}>Recommended Action:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc" style={{ color: "var(--hex-text, #334155)" }}>
                  <li>{driverAction(card.primary_driver, card.category_l2, card.region)}</li>
                  <li>Recommended posture: <strong>{card.posture}</strong></li>
                  <li>Monitor recovery trajectory and adjust within {Math.max(1, card.days_to_impact)} days</li>
                </ul>
              </div>

              {/* Business Implications */}
              <div className="mb-4">
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--hex-text-secondary, #64748b)" }}>Business Implications:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc" style={{ color: "var(--hex-text, #334155)" }}>
                  <li>Estimated business impact: <strong>{formatUSD(card.impact_usd)}</strong></li>
                  <li>Intervention cost: <strong>{formatUSD(card.cost_usd)}</strong></li>
                  <li>Benefit-cost ratio: <strong>{card.benefit_cost_ratio.toFixed(1)}x</strong> return per dollar invested</li>
                  {card.benefit_cost_ratio >= 5 && (
                    <li style={{ color: "#22c55e" }}>High-confidence investment — strong ROI justification</li>
                  )}
                  {card.benefit_cost_ratio < 2 && card.benefit_cost_ratio > 0 && (
                    <li style={{ color: "#f97316" }}>Marginal ROI — evaluate carefully before approval</li>
                  )}
                </ul>
              </div>

              {/* Metadata footer */}
              <div
                className="flex flex-wrap gap-x-6 gap-y-2 pt-3 text-xs"
                style={{ borderTop: "1px solid var(--hex-border, #e2e8f0)" }}
              >
                <div>
                  <span style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Category: </span>
                  <span className="font-semibold" style={{ color: "var(--hex-text, #1e293b)" }}>{card.category_l2}</span>
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
                  <span style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Cost: </span>
                  <span className="font-bold" style={{ color: "#f97316" }}>{formatUSD(card.cost_usd)}</span>
                </div>
                <div>
                  <span style={{ color: "var(--hex-text-secondary, #94a3b8)" }}>Confidence: </span>
                  <span className="font-bold" style={{ color: card.confidence >= 0.8 ? "#22c55e" : card.confidence >= 0.5 ? "#F59E0B" : "#6366F1" }}>
                    {formatConf(card.confidence)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cortex AI Insight — after all cards */}
      <ChartExplainer narrative={computedInsight || narrative} />
    </div>
  );
}
