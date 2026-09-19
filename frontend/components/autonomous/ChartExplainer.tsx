"use client";

import React from "react";

interface ChartExplainerProps {
  narrative?: string | null;
}

/** Bold dollar amounts, percentages, and basis-point values in a text segment. */
function boldMetrics(text: string): React.ReactNode[] {
  const pattern = /(\$[\d,.]+[KMB]?|\d+\.?\d*%|\d+\.?\d*pp)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <strong key={`m${idx++}`} style={{ color: "var(--hex-text, #e2e8f0)", fontWeight: 700 }}>
        {match[0]}
      </strong>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Split narrative into sentences on periods or semicolons. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface ParsedReport {
  lead: string;
  findings: string[];
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function tryParseReport(raw: string): ParsedReport | null {
  const trimmed = raw.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.includes('"report":'))) {
    return null;
  }
  try {
    const obj = JSON.parse(trimmed);
    const report = obj.report ?? obj;

    const lead =
      report.enterprise_summary ??
      (Array.isArray(report.sections) && report.sections.length > 0
        ? report.sections[0].headline
        : "") ??
      "";

    const findings: { text: string; severity: number }[] = [];

    if (Array.isArray(report.sections)) {
      for (const sec of report.sections) {
        const secSev =
          SEVERITY_ORDER[(sec.severity ?? "low").toString().toLowerCase()] ?? 3;

        if (sec.headline && sec.headline !== lead) {
          findings.push({ text: sec.headline, severity: secSev });
        }
        if (Array.isArray(sec.key_metrics)) {
          for (const m of sec.key_metrics) {
            const label = typeof m === "string" ? m : m.label ?? m.metric ?? JSON.stringify(m);
            findings.push({ text: label, severity: secSev });
          }
        }
        if (Array.isArray(sec.anomalies)) {
          for (const a of sec.anomalies) {
            const label = typeof a === "string" ? a : a.description ?? a.label ?? JSON.stringify(a);
            const aSev =
              SEVERITY_ORDER[(a.severity ?? sec.severity ?? "low").toString().toLowerCase()] ?? secSev;
            findings.push({ text: label, severity: aSev });
          }
        }
      }
    }

    // Sort by severity (high impact first)
    findings.sort((a, b) => a.severity - b.severity);

    return {
      lead,
      findings: findings.map((f) => f.text),
    };
  } catch {
    return null;
  }
}

export function ChartExplainer({ narrative }: ChartExplainerProps) {
  if (!narrative) return null;

  const parsed = tryParseReport(narrative);
  let lead: string;
  let bullets: string[];

  if (parsed) {
    lead = parsed.lead;
    bullets = parsed.findings;
  } else {
    const sentences = splitSentences(narrative);
    lead = sentences[0] ?? "";
    bullets = sentences.slice(1);
  }

  return (
    <div
      className="rounded-xl p-4 mt-3"
      style={{
        borderLeft: "3px solid #6366F1",
        background: "rgba(99, 102, 241, 0.04)",
      }}
    >
      {/* Header badge */}
      <span
        style={{
          display: "inline-block",
          background: "#6366F1",
          color: "#fff",
          fontWeight: 700,
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "3px 10px",
          borderRadius: "9999px",
          marginBottom: "12px",
        }}
      >
        CORTEX AI INSIGHT
      </span>

      {/* Strategic lead sentence */}
      {lead && (
        <p
          className="text-sm leading-relaxed mb-2"
          style={{ color: "var(--hex-text, #e2e8f0)" }}
        >
          <strong style={{ color: "#6366F1" }}>Strategic Insight: </strong>
          {boldMetrics(lead)}
        </p>
      )}

      {/* Bullet findings */}
      {bullets.length > 0 && (
        <>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mt-3 mb-1.5"
            style={{ color: "var(--hex-text-secondary, #94a3b8)" }}
          >
            Key Findings
          </p>
          <ul className="space-y-1">
            {bullets.map((b, i) => (
              <li
                key={i}
                className="text-sm leading-relaxed flex items-start gap-2"
                style={{ color: "var(--hex-text, #e2e8f0)" }}
              >
                <span className="mt-0.5 flex-shrink-0" style={{ color: "#6366F1" }}>•</span>
                <span>{boldMetrics(b)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
