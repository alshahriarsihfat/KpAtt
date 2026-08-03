"use client";

import { useEffect, useMemo, useState } from "react";
import { usePortal } from "@/lib/client";
import { BigClock } from "./BigClock";
import { Donut } from "./Donut";
import { StatusChip } from "./StatusChip";
import {
  BREAK_POLICIES,
  type AttendanceLog,
  type BreakKind
} from "@/lib/types";
import { BREAKS_ACCENT, fmtTimeOfDay, isoNow } from "./ui-helpers";

export function PunchClock() {
  const {
    me,
    attendance,
    live,
    serverNow,
    apiPost,
    notify
  } = usePortal();

  // Recompute the date string at most once a minute so that crossing
  // midnight doesn't leave the UI stuck on yesterday's record.
  const [today, setToday] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      setToday((prev) => (prev === next ? prev : next));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const log: AttendanceLog | undefined = useMemo(
    () => attendance.find((a) => a.staffId === me?.id && a.date === today),
    [attendance, me, today]
  );
  const l = me ? live[me.id] : undefined;
  const status = l?.status ?? "clocked_out";

  const onClockIn = async () => {
    try {
      await apiPost("/api/clock", { action: "in" });
      notify("Clocked in — welcome to your shift.", "ok");
    } catch (e) {
      notify((e as Error).message, "err");
    }
  };
  const onClockOut = async () => {
    try {
      await apiPost("/api/clock", { action: "out" });
      notify("Clocked out — great work today.", "ok");
    } catch (e) {
      notify((e as Error).message, "err");
    }
  };
  const onStartBreak = async (kind: BreakKind) => {
    try {
      await apiPost("/api/clock", { action: "break_start", breakKind: kind });
      const p = BREAK_POLICIES[kind];
      notify(`Started: ${p.labelBn}`, "info");
    } catch (e) {
      notify((e as Error).message, "err");
    }
  };
  const onEndBreak = async () => {
    try {
      await apiPost("/api/clock", { action: "break_end" });
      notify("Break ended — back to work.", "ok");
    } catch (e) {
      notify((e as Error).message, "err");
    }
  };

  // Donut chart: working vs breaks
  const now = serverNow || isoNow();
  const effectiveLog = log ?? null;
  const totalWorked = effectiveLog ? elapsedWorked(effectiveLog, now) : 0;
  const totalBreak = effectiveLog
    ? effectiveLog.breaks.reduce(
        (s, b) =>
          s + Math.max(0, Math.floor((new Date(b.endedAt ?? now).getTime() - new Date(b.startedAt).getTime()) / 1000)),
        0
      )
    : 0;
  const total = Math.max(1, totalWorked + totalBreak);
  const slices = [
    { value: totalWorked, color: "#22e87f", label: "Worked" },
    { value: totalBreak, color: "#facc15", label: "Breaks" }
  ];

  const isOnLeave = !!log?.onLeave;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* Main Timer Card */}
      <div className="xl:col-span-2 glass-strong p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-neon-500/15 blur-3xl pointer-events-none" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
              Live Duty Tracking
            </div>
            <div className="text-2xl font-semibold text-white mt-1">
              {me?.name}
            </div>
            <div className="text-sm text-slate-400">
              {me?.designation} · {today}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusChip status={status} />
            {log?.latePunch ? (
              <span className="chip text-amber-300 border-amber-500/30 bg-amber-500/10">
                Late Punch
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-[1fr_240px] gap-6 items-center">
          <div>
            <div className="label mb-2">
              {status === "on_break" ? "Current Break Timer" : "Active Shift Timer"}
            </div>
            <BigClock
              startIso={
                status === "on_break"
                  ? l?.currentBreakStartedAt ?? null
                  : log?.checkInAt ?? null
              }
              size="xl"
              className="text-white"
            />
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div>
                <div className="label">Check In</div>
                <div className="text-white font-mono">
                  {fmtTimeOfDay(log?.checkInAt ?? null)}
                </div>
              </div>
              <div>
                <div className="label">Check Out</div>
                <div className="text-white font-mono">
                  {fmtTimeOfDay(log?.checkOutAt ?? null)}
                </div>
              </div>
              <div>
                <div className="label">Breaks Taken</div>
                <div className="text-white font-mono">
                  {log?.breaks.filter((b) => b.endedAt).length ?? 0}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <Donut
              slices={slices}
              size={200}
              thickness={20}
              centerValue={`${Math.round((totalWorked / total) * 100)}%`}
              centerLabel="Worked"
            />
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-neon-500" />
                Worked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                Breaks
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {!log?.checkInAt ? (
            <button
              className="btn btn-primary h-14 text-base sm:col-span-3"
              onClick={onClockIn}
              disabled={isOnLeave || status === "clocked_out_for_day"}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v10l4 4" />
                <circle cx="12" cy="13" r="10" />
              </svg>
              Clock In
            </button>
          ) : (
            <button
              className="btn btn-danger h-14 text-base sm:col-span-3"
              onClick={onClockOut}
              disabled={status === "on_break"}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Clock Out
            </button>
          )}
        </div>
      </div>

      {/* Break System */}
      <div className="glass-strong p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
              Multiple Break System
            </div>
            <div className="text-lg font-semibold text-white">
              Break Controls
            </div>
          </div>
          {status === "on_break" ? (
            <span className="chip text-amber-200 border-amber-500/30 bg-amber-500/10">
              {BREAK_POLICIES[l?.currentBreak ?? "meal"].labelBn}
            </span>
          ) : (
            <span className="chip">Idle</span>
          )}
        </div>

        {status === "on_break" ? (
          <div className="mt-4">
            <div className="label mb-1.5">Active break elapsed</div>
            <BigClock
              startIso={l?.currentBreakStartedAt ?? null}
              size="lg"
              className="text-amber-200"
            />
            <button
              onClick={onEndBreak}
              className="btn btn-primary w-full mt-5 h-12"
            >
              End Break
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-2.5">
            <BreakButton
              kind="meal"
              disabled={!log?.checkInAt || !!log?.checkOutAt || isOnLeave}
              onClick={() => onStartBreak("meal")}
            />
            <BreakButton
              kind="short"
              disabled={!log?.checkInAt || !!log?.checkOutAt || isOnLeave}
              onClick={() => onStartBreak("short")}
            />
            <BreakButton
              kind="unpaid"
              disabled={!log?.checkInAt || !!log?.checkOutAt || isOnLeave}
              onClick={() => onStartBreak("unpaid")}
            />
            <BreakButton
              kind="paid"
              disabled={!log?.checkInAt || !!log?.checkOutAt || isOnLeave}
              onClick={() => onStartBreak("paid")}
            />
          </div>
        )}

        <div className="mt-5 text-[0.7rem] text-slate-500 leading-relaxed">
          {BREAK_POLICIES.meal.maxMinutes
            ? `Meal auto-caps at ${BREAK_POLICIES.meal.maxMinutes} min. `
            : ""}
          {BREAK_POLICIES.short.maxMinutes
            ? `Short auto-caps at ${BREAK_POLICIES.short.maxMinutes} min. `
            : ""}
          Unpaid Out deducts from payable hours; Paid Out doesn&apos;t.
        </div>
      </div>

      {/* Today&apos;s Breaks Ledger */}
      <div className="xl:col-span-3 glass-strong p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
              Today&apos;s Breaks
            </div>
            <div className="text-lg font-semibold text-white">
              Break History
            </div>
          </div>
          <div className="text-xs text-slate-400">
            {log?.breaks.length ?? 0} entries
          </div>
        </div>
        {!log || log.breaks.length === 0 ? (
          <div className="text-sm text-slate-500 py-6 text-center">
            No breaks taken yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[0.7rem] uppercase tracking-[0.15em] text-slate-400">
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Started</th>
                  <th className="py-2 pr-3">Ended</th>
                  <th className="py-2 pr-3">Duration</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {log.breaks.map((b) => {
                  const p = BREAK_POLICIES[b.kind];
                  return (
                    <tr
                      key={b.id}
                      className="border-t border-white/5 hover:bg-white/3"
                    >
                      <td className="py-3 pr-3">
                        <span
                          className="chip"
                          style={{
                            background: BREAKS_ACCENT[b.kind].bg,
                            color: BREAKS_ACCENT[b.kind].fg,
                            borderColor: BREAKS_ACCENT[b.kind].border
                          }}
                        >
                          {p.labelBn}
                        </span>
                      </td>
                      <td className="py-3 pr-3 font-mono text-slate-200">
                        {fmtTimeOfDay(b.startedAt)}
                      </td>
                      <td className="py-3 pr-3 font-mono text-slate-200">
                        {fmtTimeOfDay(b.endedAt)}
                      </td>
                      <td className="py-3 pr-3 font-mono text-white">
                        {b.endedAt
                          ? `${b.minutes}m`
                          : `${Math.floor(
                              (Date.now() - new Date(b.startedAt).getTime()) /
                                60000
                            )}m (live)`}
                      </td>
                      <td className="py-3 pr-3">
                        {b.endedAt ? (
                          <span className="chip">Closed</span>
                        ) : (
                          <span className="chip text-neon-300 border-neon-500/40 bg-neon-500/10 animate-pulseGlow">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function BreakButton({
  kind,
  disabled,
  onClick
}: {
  kind: BreakKind;
  disabled?: boolean;
  onClick: () => void;
}) {
  const p = BREAK_POLICIES[kind];
  const accent = BREAKS_ACCENT[kind];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 p-3.5 rounded-xl border text-left transition hover:translate-y-[-1px]"
      style={{
        background: accent.bg,
        borderColor: accent.border
      }}
    >
      <span
        className="w-9 h-9 rounded-lg flex items-center justify-center font-semibold"
        style={{ background: accent.dot, color: "#0b0f17" }}
      >
        {kind === "meal"
          ? "🍽"
          : kind === "short"
          ? "⏱"
          : kind === "unpaid"
          ? "↗"
          : "★"}
      </span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-white">{p.label}</div>
        <div className="text-xs" style={{ color: accent.fg }}>
          {p.labelBn}
          {p.maxMinutes ? ` · max ${p.maxMinutes}m` : ` · open`} ·{" "}
          {p.paid ? "Paid" : "Unpaid"}
        </div>
      </div>
      <span className="text-xs" style={{ color: accent.fg }}>
        Start →
      </span>
    </button>
  );
}

function elapsedWorked(log: AttendanceLog, nowIso: string): number {
  if (!log.checkInAt) return 0;
  const end = log.checkOutAt ?? nowIso;
  const total = Math.max(
    0,
    Math.floor(
      (new Date(end).getTime() - new Date(log.checkInAt).getTime()) / 1000
    )
  );
  let paidBreaks = 0;
  let unpaidBreaks = 0;
  for (const b of log.breaks) {
    const dur = Math.max(
      0,
      Math.floor(
        (new Date(b.endedAt ?? nowIso).getTime() -
          new Date(b.startedAt).getTime()) /
          1000
      )
    );
    if (BREAK_POLICIES[b.kind].paid) paidBreaks += dur;
    else unpaidBreaks += dur;
  }
  // For the donut "Worked" slice we want the actual time on-task
  // (excluding all breaks).
  return Math.max(0, total - paidBreaks - unpaidBreaks);
}
