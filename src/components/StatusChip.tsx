"use client";

import type { LiveState } from "@/lib/types";

const STATUS_LABEL: Record<LiveState["status"], string> = {
  working: "On Duty",
  on_break: "On Break",
  clocked_out: "Off Duty",
  clocked_out_for_day: "Shift Ended",
  on_leave: "On Leave"
};

const STATUS_COLOR: Record<LiveState["status"], string> = {
  working: "bg-neon-500",
  on_break: "bg-amber-400",
  clocked_out: "bg-slate-500",
  clocked_out_for_day: "bg-sky-400",
  on_leave: "bg-fuchsia-400"
};

export function StatusChip({ status }: { status: LiveState["status"] }) {
  return (
    <span className="chip">
      <span
        className={`inline-block w-2 h-2 rounded-full ${STATUS_COLOR[status]} ${
          status === "working" ? "animate-pulseGlow" : ""
        }`}
        style={{
          boxShadow:
            status === "working"
              ? "0 0 8px rgba(34,232,127,0.7)"
              : status === "on_break"
              ? "0 0 8px rgba(251,191,36,0.7)"
              : "none"
        }}
      />
      <span>{STATUS_LABEL[status]}</span>
    </span>
  );
}
