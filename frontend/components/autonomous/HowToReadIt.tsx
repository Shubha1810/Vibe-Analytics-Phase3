"use client";

import React, { useState } from "react";

interface HowToReadItProps {
  bullets: string[];
}

export function HowToReadIt({ bullets }: HowToReadItProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="rounded-xl border p-4 flex-shrink-0 w-64 max-lg:w-full"
      style={{
        borderColor: "#e2e8f0",
        background: "#fafbfc",
      }}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span style={{ fontSize: "14px", lineHeight: 1 }}>ℹ️</span>
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--hex-primary, #7c3aed)" }}
        >
          How to Read It
        </span>
        <span
          className="ml-auto lg:hidden text-xs"
          style={{ color: "var(--hex-text-secondary, #94a3b8)" }}
        >
          {collapsed ? "▼" : "▲"}
        </span>
      </button>
      {/* Subtitle */}
      <p
        className="mt-1 mb-0"
        style={{ fontSize: "11px", color: "var(--hex-text-secondary, #94a3b8)" }}
      >
        Quick guide for business stakeholders
      </p>
      {!collapsed && (
        <ul className="mt-3 flex flex-col gap-2" style={{ paddingLeft: "6px" }}>
          {bullets.map((b, i) => (
            <li
              key={i}
              className="leading-relaxed flex items-start gap-2"
              style={{
                fontSize: "12px",
                lineHeight: "1.6",
                color: "var(--hex-text-secondary, #94a3b8)",
              }}
            >
              <span className="flex-shrink-0 mt-0.5" style={{ color: "var(--hex-primary, #7c3aed)" }}>•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
