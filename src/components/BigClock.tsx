"use client";

import { fmtClockHMS } from "@/lib/time";
import { useSecondTick } from "@/lib/client";

interface BigClockProps {
  /** Anchor ISO; rendered elapsed from this. */
  startIso: string | null | undefined;
  /** Optional offset in seconds to add (for edits). */
  initialSeconds?: number;
  /** Cap at a value (for breaks). */
  capSeconds?: number | null;
  size?: "lg" | "xl" | "md";
  className?: string;
  /** When provided, shows this exact value instead of recomputing. */
  staticSeconds?: number;
}

export function BigClock({
  startIso,
  initialSeconds = 0,
  capSeconds = null,
  size = "xl",
  className = "",
  staticSeconds
}: BigClockProps) {
  useSecondTick();
  let elapsed = staticSeconds ?? 0;
  if (staticSeconds == null && startIso) {
    const ms = Date.now() - new Date(startIso).getTime();
    elapsed = Math.max(0, Math.floor(ms / 1000)) + initialSeconds;
  } else if (staticSeconds == null) {
    elapsed = initialSeconds;
  }
  if (capSeconds != null) elapsed = Math.min(elapsed, capSeconds);
  const text = fmtClockHMS(elapsed);

  const sizeClass =
    size === "xl"
      ? "text-[3.4rem] sm:text-[4.2rem] md:text-[5rem]"
      : size === "lg"
      ? "text-[2.6rem] sm:text-[3.2rem]"
      : "text-[1.6rem]";

  return (
    <div
      className={`clock-mono tracking-tight tabular-nums font-mono ${sizeClass} leading-none ${className}`}
    >
      {text}
    </div>
  );
}
