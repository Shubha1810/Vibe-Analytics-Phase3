"use client";

import React from "react";

interface ChartExplainerProps {
  narrative?: string | null;
}

/** Bold dollar amounts, percentages, basis-point values, AND **markdown bold** in a text segment. */
function boldMetrics(text: string): React.ReactNode[] {
  // Combined pattern: **markdown bold** (non-greedy) OR $-amounts OR percentages OR pp values
  const pattern = /(\*\*(.+?)\*\*|\$[\d,.]+[KMB]?|\d+\.?\d*%|\d+\.?\d*pp)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    // match[2] is the capture group inside ** **, if present
    const display = match[2] ?? match[0];
    parts.push(
      <strong key={`m${idx++}`} style={{ color: "var(--hex-text, #1e293b)", fontWeight: 700 }}>
        {display}
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

    findings.sort((a, b) => a.severity - b.severity);

    return {
      lead,
      findings: findings.map((f) => f.text),
    };
  } catch {
    return null;
  }
}

/** Parse delimited sections: |IMPLICATIONS| and |ACTIONS| markers split the narrative. */
function parseDelimitedSections(text: string): {
  main: string;
  implications: string[];
  actions: string[];
} {
  const implMatch = text.indexOf("|IMPLICATIONS|");
  const actMatch = text.indexOf("|ACTIONS|");

  let mainText = text;
  let implText = "";
  let actText = "";

  if (implMatch >= 0 || actMatch >= 0) {
    const firstSplit = Math.min(
      implMatch >= 0 ? implMatch : Infinity,
      actMatch >= 0 ? actMatch : Infinity,
    );
    mainText = text.slice(0, firstSplit).trim();

    if (implMatch >= 0) {
      const implStart = implMatch + "|IMPLICATIONS|".length;
      const implEnd = actMatch > implMatch ? actMatch : text.length;
      implText = text.slice(implStart, implEnd).trim();
    }

    if (actMatch >= 0) {
      const actStart = actMatch + "|ACTIONS|".length;
      const actEnd = implMatch > actMatch ? implMatch : text.length;
      actText = text.slice(actStart, actEnd).trim();
    }
  }

  return {
    main: mainText,
    implications: implText ? splitSentences(implText) : [],
    actions: actText ? splitSentences(actText) : [],
  };
}

function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-wider mt-4 mb-1.5 flex items-center gap-1.5"
      style={{ color }}
    >
      <span className="material-icons-outlined" style={{ fontSize: "14px" }}>{icon}</span>
      {label}
    </p>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((b, i) => (
        <li
          key={i}
          className="text-sm leading-relaxed flex items-start gap-2"
          style={{ color: "var(--hex-text, #1e293b)" }}
        >
          <span className="mt-0.5 flex-shrink-0" style={{ color: "#6366F1" }}>•</span>
          <span>{boldMetrics(b)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ChartExplainer({ narrative }: ChartExplainerProps) {
  if (!narrative) return null;

  // First, extract delimited sections (|IMPLICATIONS|, |ACTIONS|)
  const { main, implications, actions } = parseDelimitedSections(narrative);

  // Then parse the main body
  const parsed = tryParseReport(main);
  let lead: string;
  let bullets: string[];

  if (parsed) {
    lead = parsed.lead;
    bullets = parsed.findings;
  } else {
    const sentences = splitSentences(main);
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
          style={{ color: "var(--hex-text, #1e293b)" }}
        >
          <strong style={{ color: "#6366F1" }}>Strategic Insight: </strong>
          {boldMetrics(lead)}
        </p>
      )}

      {/* Key Findings */}
      {bullets.length > 0 && (
        <>
          <SectionHeader icon="analytics" label="Key Findings" color="var(--hex-text-secondary, #94a3b8)" />
          <BulletList items={bullets} />
        </>
      )}

      {/* Business Implications */}
      {implications.length > 0 && (
        <>
          <SectionHeader icon="trending_up" label="Business Implications" color="#D97706" />
          <BulletList items={implications} />
        </>
      )}

      {/* Recommended Actions */}
      {actions.length > 0 && (
        <>
          <SectionHeader icon="task_alt" label="Recommended Actions" color="#059669" />
          <BulletList items={actions} />
        </>
      )}
    </div>
  );
}
