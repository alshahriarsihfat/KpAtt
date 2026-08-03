import type { BreakKind } from "@/lib/types";

export {
  fmtBDT,
  fmtClockHMS,
  fmtDateInputLocal,
  fmtDateLong,
  fmtTimeOfDay,
  isoNow,
  liveStateFor,
  parseDateInputLocal,
  todayLocal
} from "@/lib/time";

export const BREAKS_ACCENT: Record<
  BreakKind,
  { bg: string; fg: string; border: string; dot: string }
> = {
  meal: {
    bg: "rgba(251,191,36,0.08)",
    fg: "#fde68a",
    border: "rgba(251,191,36,0.30)",
    dot: "#fbbf24"
  },
  short: {
    bg: "rgba(56,189,248,0.08)",
    fg: "#bae6fd",
    border: "rgba(56,189,248,0.30)",
    dot: "#38bdf8"
  },
  unpaid: {
    bg: "rgba(244,63,94,0.08)",
    fg: "#fecdd3",
    border: "rgba(244,63,94,0.30)",
    dot: "#f43f5e"
  },
  paid: {
    bg: "rgba(167,139,250,0.10)",
    fg: "#ddd6fe",
    border: "rgba(167,139,250,0.30)",
    dot: "#a78bfa"
  }
};

export const PRIORITY_ACCENT: Record<
  "low" | "normal" | "high" | "urgent",
  { fg: string; bg: string; border: string; label: string }
> = {
  low: {
    fg: "#bae6fd",
    bg: "rgba(56,189,248,0.10)",
    border: "rgba(56,189,248,0.30)",
    label: "Low"
  },
  normal: {
    fg: "#d6ffe8",
    bg: "rgba(34,232,127,0.10)",
    border: "rgba(34,232,127,0.30)",
    label: "Normal"
  },
  high: {
    fg: "#fde68a",
    bg: "rgba(251,191,36,0.10)",
    border: "rgba(251,191,36,0.30)",
    label: "High"
  },
  urgent: {
    fg: "#fecdd3",
    bg: "rgba(244,63,94,0.12)",
    border: "rgba(244,63,94,0.35)",
    label: "Urgent"
  }
};
