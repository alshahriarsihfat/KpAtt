"use client";

import { useMemo } from "react";

interface DonutProps {
  /** Slices as percentages (will be normalized). */
  slices: { value: number; color: string; label: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

/**
 * Pure-SVG donut. No external chart lib.
 */
export function Donut({
  slices,
  size = 220,
  thickness = 22,
  centerLabel,
  centerValue
}: DonutProps) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  const arcs = useMemo(() => {
    let offset = 0;
    return slices.map((s, i) => {
      const value = Math.max(0, s.value);
      const len = (value / total) * circumference;
      const arc = (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={s.color}
          strokeWidth={thickness}
          strokeDasharray={`${len} ${circumference - len}`}
          strokeDashoffset={-offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeLinecap="butt"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      );
      offset += len;
      return arc;
    });
  }, [slices, total, radius, circumference, size, thickness]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={thickness}
        />
        {arcs}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {centerValue ? (
          <div className="clock-mono text-2xl md:text-3xl font-semibold tracking-tight">
            {centerValue}
          </div>
        ) : null}
        {centerLabel ? (
          <div className="text-[0.7rem] uppercase tracking-[0.15em] text-slate-400 mt-1">
            {centerLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}
