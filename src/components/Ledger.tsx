"use client";

import { useMemo, useState } from "react";
import { usePortal } from "@/lib/client";
import { Avatar } from "./Avatar";
import { BigClock } from "./BigClock";
import { Donut } from "./Donut";
import { StatusChip } from "./StatusChip";
import { BREAK_POLICIES } from "@/lib/types";
import { computePayout, diffSeconds } from "@/lib/time";
import {
  fmtBDT,
  fmtClockHMS,
  fmtTimeOfDay,
  todayLocal
} from "./ui-helpers";
import type { StaffProfile } from "@/lib/types";

export function Ledger() {
  const { me, staff, attendance, live, serverNow } = usePortal();
  const [selectedId, setSelectedId] = useState<string | null>(
    me?.id ?? null
  );

  const target: StaffProfile | null = useMemo(() => {
    if (me?.role === "supervisor") {
      return staff.find((s) => s.id === selectedId) ?? null;
    }
    return me ?? null;
  }, [me, staff, selectedId]);

  const today = todayLocal();
  const log = useMemo(
    () => attendance.find((a) => a.staffId === target?.id && a.date === today),
    [attendance, target, today]
  );
  const l = target ? live[target.id] : undefined;
  const now = serverNow || new Date().toISOString();
  const breakdown = target && log ? computePayout(log, target, now) : null;

  // Donut slices: paid breaks, worked, unpaid breaks
  // (matches the spec formula: Total Worked - Unpaid = Effective)
  const slices = useMemo(() => {
    if (!breakdown || !log) {
      return [
        { value: 0, color: "#22e87f", label: "Worked" },
        { value: 0, color: "#a78bfa", label: "Paid Breaks" },
        { value: 0, color: "#f43f5e", label: "Unpaid Breaks" }
      ];
    }
    // Sum paid break seconds for the donut
    let paidBreakSec = 0;
    for (const b of log.breaks) {
      if (!b.endedAt) continue;
      if (BREAK_POLICIES[b.kind].paid) {
        paidBreakSec += diffSeconds(b.startedAt, b.endedAt);
      }
    }
    return [
      { value: breakdown.totalWorkedSeconds, color: "#22e87f", label: "Worked" },
      { value: paidBreakSec, color: "#a78bfa", label: "Paid Breaks" },
      {
        value: breakdown.totalUnpaidBreakSeconds,
        color: "#f43f5e",
        label: "Unpaid Breaks"
      }
    ];
  }, [breakdown, log]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
      {me?.role === "supervisor" ? (
        <div className="glass-strong p-4">
          <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400 mb-2">
            View Ledger For
          </div>
          <div className="text-lg font-semibold text-white mb-3">
            Pick a staff
          </div>
          <div className="space-y-1.5 max-h-[36rem] overflow-auto pr-1">
            {staff
              .filter((s) => s.role === "staff")
              .map((s) => {
                const ls = live[s.id];
                const isSel = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
                      isSel
                        ? "border-neon-500/40 bg-neon-500/5 glow"
                        : "border-white/5 bg-white/3 hover:bg-white/5"
                    }`}
                  >
                    <Avatar profile={s} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {s.name}
                      </div>
                      <div className="text-[0.7rem] text-slate-400 truncate">
                        {s.designation}
                      </div>
                    </div>
                    {ls ? <StatusChip status={ls.status} /> : null}
                  </button>
                );
              })}
          </div>
        </div>
      ) : null}

      {target && breakdown ? (
        <div className="space-y-5">
          {/* Header card */}
          <div className="glass-strong p-6">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar profile={target} size={56} ring />
              <div className="flex-1 min-w-0">
                <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
                  Real-Time Payout
                </div>
                <div className="text-xl font-semibold text-white">
                  {target.name}
                </div>
                <div className="text-sm text-slate-400">
                  {target.designation} · {today}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
                  Net Pay
                </div>
                <div className="text-3xl md:text-4xl font-semibold text-neon-300 clock-mono tracking-tight">
                  {fmtBDT(breakdown.netPay)}
                </div>
                <div className="text-[0.7rem] text-slate-400">
                  {breakdown.effectiveWorkedHours.toFixed(2)} paid hrs · OT{" "}
                  {breakdown.overtimeHours.toFixed(2)}h
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_240px] gap-6 items-center">
              <div>
                <div className="label mb-1.5">
                  {l?.status === "on_break"
                    ? "Active Break Timer"
                    : l?.status === "working"
                    ? "Active Shift Timer"
                    : "Total Recorded"}
                </div>
                <BigClock
                  startIso={
                    l?.status === "on_break"
                      ? l.currentBreakStartedAt
                      : log?.checkInAt
                  }
                  size="xl"
                />
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Metric
                    label="Check In"
                    value={fmtTimeOfDay(log?.checkInAt)}
                  />
                  <Metric
                    label="Check Out"
                    value={fmtTimeOfDay(log?.checkOutAt)}
                  />
                  <Metric
                    label="Worked"
                    value={`${breakdown.totalWorkedHours.toFixed(2)}h`}
                  />
                  <Metric
                    label="Effective"
                    value={`${breakdown.effectiveWorkedHours.toFixed(2)}h`}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <Donut
                  slices={slices}
                  size={210}
                  thickness={22}
                  centerValue={`${breakdown.effectiveWorkedHours.toFixed(1)}h`}
                  centerLabel="Effective"
                />
                <div className="mt-3 text-[0.7rem] text-slate-400">
                  Worked vs Unpaid breaks
                </div>
              </div>
            </div>
          </div>

          {/* Payout breakdown */}
          <div className="glass-strong p-6">
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
              Calculation
            </div>
            <div className="text-lg font-semibold text-white mb-4">
              Formula walkthrough
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <Row
                  label="Total Worked Hours"
                  value={`${breakdown.totalWorkedHours.toFixed(2)}h`}
                />
                <Row
                  label="− Unpaid Break Hours"
                  value={`${breakdown.totalUnpaidBreakHours.toFixed(2)}h`}
                />
                <Row
                  label="= Effective Paid Hours"
                  value={`${breakdown.effectiveWorkedHours.toFixed(2)}h`}
                  highlight
                />
                <Row
                  label="× Hourly Rate"
                  value={fmtBDT(target.hourlyRate)}
                />
                <Row
                  label="= Base Pay"
                  value={fmtBDT(breakdown.basePay)}
                  highlight
                />
              </div>
              <div className="space-y-3">
                <Row
                  label="Base Shift"
                  value={`${target.baseShiftHours}h`}
                />
                <Row
                  label="Overtime Hours"
                  value={`${breakdown.overtimeHours.toFixed(2)}h`}
                />
                <Row
                  label="× OT Rate"
                  value={fmtBDT(target.otRate)}
                />
                <Row
                  label="= Overtime Pay"
                  value={fmtBDT(breakdown.overtimePay)}
                  highlight
                />
                <Row
                  label="Net Pay (Base + OT)"
                  value={fmtBDT(breakdown.netPay)}
                  highlight
                  big
                />
              </div>
            </div>
          </div>

          {/* Live counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              label="Total Worked"
              value={`${breakdown.totalWorkedHours.toFixed(2)}h`}
            />
            <Stat
              label="Unpaid Breaks"
              value={`${breakdown.totalUnpaidBreakHours.toFixed(2)}h`}
            />
            <Stat
              label="Effective Paid"
              value={`${breakdown.effectiveWorkedHours.toFixed(2)}h`}
            />
            <Stat
              label="OT"
              value={`${breakdown.overtimeHours.toFixed(2)}h`}
            />
          </div>
        </div>
      ) : (
        <div className="glass p-8 text-center text-slate-400">
          Select a staff to see their live payout.
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-thin p-3">
      <div className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-400">
        {label}
      </div>
      <div className="text-sm font-mono text-white mt-0.5">{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  big
}: {
  label: string;
  value: string;
  highlight?: boolean;
  big?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
        highlight ? "bg-white/5 border border-white/8" : ""
      } ${big ? "border border-neon-500/30 bg-neon-500/5" : ""}`}
    >
      <span
        className={`text-sm ${
          big ? "text-white font-semibold" : "text-slate-300"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-mono ${
          big ? "text-neon-300 text-lg" : "text-white text-sm"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass p-4">
      <div className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-400">
        {label}
      </div>
      <div className="text-2xl font-semibold text-white mt-1 clock-mono">
        {value}
      </div>
    </div>
  );
}
