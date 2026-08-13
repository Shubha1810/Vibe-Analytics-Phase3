"use client";

import { ReactNode } from "react";

interface HexagonProgressProps {
  /** Progress value, 0–100. Values outside this range are clamped.
   *  Ignored when `loop` is true. */
  progress: number;
  /** When true, the fill animates continuously in a loop (perimeter draws
   *  from 0% → 100% over `loopCycleMs`, then restarts). Useful for showing
   *  ongoing activity of indeterminate length. */
  loop?: boolean;
  /** Duration of one fill loop cycle in ms when `loop` is true. Default 2400. */
  loopCycleMs?: number;
  /** Outer width in pixels (height is auto-calculated to preserve aspect). */
  size?: number;
  /** Stroke thickness in SVG units (the SVG viewBox is 776×628). Default 60. */
  strokeWidth?: number;
  /** Foreground stroke colour (the part that animates as it fills). */
  fillColor?: string;
  /** Background stroke colour (the dim outline behind the fill). */
  trackColor?: string;
  /** Optional content rendered inside the hexagon (e.g. an icon). */
  children?: ReactNode;
  /** Transition duration in ms for the static fill animation. Default 600. */
  transitionMs?: number;
  /** Extra wrapper class names. */
  className?: string;
  /** Aria label for screen readers. */
  ariaLabel?: string;
}

// SVG path total length (computed via getTotalLength on the original path).
// Used to convert progress percentage into stroke-dashoffset.
const PATH_LENGTH = 2160;

const HEX_PATH = "M723 314L543 625.77 183 625.77 3 314 183 2.23 543 2.23 723 314z";

export default function HexagonProgress({
  progress,
  loop = false,
  loopCycleMs = 2400,
  size = 60,
  strokeWidth = 60,
  fillColor = "var(--hex-primary, #6366f1)",
  trackColor = "rgba(120, 130, 145, 0.25)",
  children,
  transitionMs = 600,
  className = "",
  ariaLabel,
}: HexagonProgressProps) {
  const pct = Math.max(0, Math.min(100, progress));
  const offset = ((100 - pct) / 100) * PATH_LENGTH;
  const height = (size * 628) / 776;

  const sharedPathStyle: React.CSSProperties = {
    transform: "translate(290px, 800px) rotate(-120deg)",
  };

  const fillStyle: React.CSSProperties = loop
    ? {
        ...sharedPathStyle,
        animation: `hexFillLoop ${loopCycleMs}ms linear infinite`,
      }
    : {
        ...sharedPathStyle,
        transition: `stroke-dashoffset ${transitionMs}ms ease-out`,
      };

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height }}
      role="progressbar"
      aria-valuenow={loop ? undefined : pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel ?? "Progress"}
    >
      <svg
        viewBox="0 0 776 628"
        className="absolute inset-0 overflow-visible"
        style={{ width: "100%", height: "100%" }}
      >
        <path
          d={HEX_PATH}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          style={sharedPathStyle}
        />
        <path
          d={HEX_PATH}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={PATH_LENGTH}
          strokeDashoffset={loop ? undefined : offset}
          style={fillStyle}
        />
      </svg>
      {children && (
        <div className="relative flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
