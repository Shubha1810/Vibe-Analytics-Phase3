"use client";

import type { TraceSpan } from "@/lib/api";
import SpanNode from "./SpanNode";

interface SpanTreeProps {
  spans: TraceSpan[];
}

export default function SpanTree({ spans }: SpanTreeProps) {
  if (!spans.length) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)] text-sm">
        No trace spans available for this thread.
      </div>
    );
  }

  // Build a parent→children map and find root spans
  const childrenMap: Record<string, TraceSpan[]> = {};
  const rootSpans: TraceSpan[] = [];
  const allSpanIds = new Set(spans.map((s) => s.span_id));

  for (const span of spans) {
    if (!span.parent_span_id || !allSpanIds.has(span.parent_span_id)) {
      rootSpans.push(span);
    } else {
      const pid = span.parent_span_id!;
      if (!childrenMap[pid]) childrenMap[pid] = [];
      childrenMap[pid].push(span);
    }
  }

  // Filter out meta-spans that don't add much value at the top level
  const filteredRoots = rootSpans.filter(
    (s) => s.span_name !== "CORTEX_AGENT_REQUEST" && s.span_name !== "AgentV2RequestResponseInfo"
  );
  const displayRoots = filteredRoots.length > 0 ? filteredRoots : rootSpans;

  function renderSpan(span: TraceSpan, depth: number, index: number): React.ReactNode {
    const key = `${span.span_id}-${index}`;
    const children = childrenMap[span.span_id] || [];
    // For the "Agent" root span, render children directly instead of nesting deeply
    if (span.span_name === "Agent" && depth === 0 && children.length > 0) {
      return (
        <div key={key} className="space-y-1">
          <SpanNode span={span} depth={depth} />
          {children.map((child, i) => renderSpan(child, depth + 1, i))}
        </div>
      );
    }
    return (
      <div key={key} className="space-y-1">
        <SpanNode span={span} depth={depth}>
          {children.length > 0 && (
            <div className="space-y-1">
              {children.map((child, i) => renderSpan(child, depth + 1, i))}
            </div>
          )}
        </SpanNode>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {displayRoots.map((span, i) => renderSpan(span, 0, i))}
    </div>
  );
}
