"use client";

import { useMemo } from "react";
import { usePortal } from "@/lib/client";
import { Avatar } from "./Avatar";
import { BigClock } from "./BigClock";
import { Donut } from "./Donut";
import { StatusChip } from "./StatusChip";
import { computePayout, todayLocal } from "@/lib/time";
import { fmtBDT, fmtTimeOfDay } from "./ui-helpers";

export function DashboardOverview() {
  const {
    me,
    staff,
    attendance,
    live,
    tasks,
    announcements,
    serverNow
  } = usePortal();
  const today = todayLocal();
  const now = serverNow || new Date().toISOString();

  const meLog = useMemo(
    () => attendance.find((a) => a.staffId === me?.id && a.date === today),
    [attendance, me, today]
  );
  const myLive = me ? live[me.id] : undefined;
  const myPayout = me && meLog ? computePayout(meLog, me, now) : null;

  const onDuty = useMemo(
    () =>
      Object.values(live).filter(
        (l) => l.status === "working" || l.status === "on_break"
      ).length,
    [live]
  );
  const myUnreadTasks = me
    ? tasks.filter((t) => !t.seenBy.includes(me.id)).length
    : 0;

  // Donut for current shift
  const slices = useMemo(() => {
    if (!meLog || !myPayout) {
      return [
        { value: 0, color: "#22e87f", label: "Worked" },
        { value: 0, color: "#facc15", label: "Breaks" }
      ];
    }
    const totalWorked = myPayout.totalWorkedSeconds;
    let breakSec = 0;
    for (const b of meLog.breaks) {
      breakSec += Math.max(
        0,
        Math.floor(
          (new Date(b.endedAt ?? now).getTime() -
            new Date(b.startedAt).getTime()) /
            1000
        )
      );
    }
    return [
      { value: totalWorked, color: "#22e87f", label: "Worked" },
      { value: breakSec, color: "#facc15", label: "Breaks" }
    ];
  }, [meLog, myPayout, now]);

  if (!me) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 glass-strong p-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-neon-500/15 blur-3xl pointer-events-none" />
          <div className="flex flex-wrap items-start gap-3">
            <Avatar profile={me} size={48} ring />
            <div className="flex-1 min-w-0">
              <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
                Today&apos;s Overview
              </div>
              <div className="text-xl font-semibold text-white">
                {me.name}
              </div>
              <div className="text-sm text-slate-400">
                {me.designation} · {today}
              </div>
            </div>
            {myLive ? <StatusChip status={myLive.status} /> : null}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-6 items-center">
            <div>
              <div className="label mb-1.5">
                {myLive?.status === "on_break"
                  ? "Break Timer"
                  : myLive?.status === "working"
                  ? "Active Shift Timer"
                  : "Total"}
              </div>
              <BigClock
                startIso={
                  myLive?.status === "on_break"
                    ? myLive.currentBreakStartedAt
                    : meLog?.checkInAt
                }
                size="xl"
              />
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Small label="In" value={fmtTimeOfDay(meLog?.checkInAt)} />
                <Small label="Out" value={fmtTimeOfDay(meLog?.checkOutAt)} />
                <Small
                  label="Breaks"
                  value={String(meLog?.breaks.length ?? 0)}
                />
                <Small
                  label="Pay"
                  value={myPayout ? fmtBDT(myPayout.netPay) : "৳0"}
                />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <Donut
                slices={slices}
                size={210}
                thickness={20}
                centerValue={`${myPayout ? myPayout.effectiveWorkedHours.toFixed(1) : "0"}h`}
                centerLabel="Worked"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="On Duty" value={`${onDuty}/${staff.filter((s) => s.role === "staff").length}`} />
          <Stat label="Tasks Open" value={`${myUnreadTasks}`} />
          <Stat label="Announcements" value={`${announcements.length}`} />
          <Stat
            label="OT Earned"
            value={`${myPayout ? myPayout.overtimeHours.toFixed(1) : "0"}h`}
          />
        </div>
      </div>

      <div className="glass-strong p-6">
        <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400 mb-3">
          Live Staff Status
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {staff
            .filter((s) => s.role === "staff")
            .map((s) => {
              const l = live[s.id];
              return (
                <div
                  key={s.id}
                  className="glass p-4 flex items-center gap-3"
                >
                  <Avatar profile={s} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {s.name}
                    </div>
                    <div className="text-[0.7rem] text-slate-400 truncate">
                      {s.designation}
                    </div>
                  </div>
                  <div className="text-right">
                    {l ? <StatusChip status={l.status} /> : null}
                    <div className="clock-mono text-xs text-slate-300 mt-1">
                      {l ? fmtTimeOfDay(
                        l.status === "on_break"
                          ? l.currentBreakStartedAt
                          : attendance.find(
                              (a) => a.staffId === s.id && a.date === today
                            )?.checkInAt ?? null
                      ) : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function Small({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-thin p-2.5">
      <div className="text-[0.6rem] uppercase tracking-[0.15em] text-slate-400">
        {label}
      </div>
      <div className="text-sm font-mono text-white mt-0.5">{value}</div>
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
