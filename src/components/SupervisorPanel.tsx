"use client";

import { useEffect, useMemo, useState } from "react";
import { usePortal } from "@/lib/client";
import { Avatar } from "./Avatar";
import { StatusChip } from "./StatusChip";
import {
  BREAK_POLICIES,
  type AttendanceLog,
  type StaffProfile
} from "@/lib/types";
import {
  BREAKS_ACCENT,
  fmtClockHMS,
  fmtDateInputLocal,
  fmtTimeOfDay
} from "./ui-helpers";
import { todayLocal } from "@/lib/time";

export function SupervisorPanel() {
  const {
    me,
    staff,
    attendance,
    live,
    serverNow,
    apiPost,
    notify,
    refresh
  } = usePortal();

  const staffOnly = useMemo(
    () => staff.filter((s) => s.role === "staff"),
    [staff]
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    staffOnly[0]?.id ?? null
  );
  const selected = useMemo(
    () => staffOnly.find((s) => s.id === selectedId) ?? null,
    [staffOnly, selectedId]
  );
  const today = todayLocal();
  const selLog: AttendanceLog | undefined = useMemo(
    () => attendance.find((a) => a.staffId === selected?.id && a.date === today),
    [attendance, selected, today]
  );

  if (me?.role !== "supervisor") {
    return (
      <div className="glass-strong p-8 text-center text-slate-300">
        <div className="text-lg font-semibold text-white mb-1">
          Supervisor only
        </div>
        <p className="text-sm text-slate-400">
          This module is restricted to users with supervisor privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
      {/* Staff list */}
      <div className="glass-strong p-4">
        <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400 mb-2">
          Staff Directory
        </div>
        <div className="text-lg font-semibold text-white mb-3">
          All Staff
        </div>
        <div className="space-y-1.5 max-h-[36rem] overflow-auto pr-1">
          {staffOnly.map((s) => {
            const l = live[s.id];
            const log = attendance.find(
              (a) => a.staffId === s.id && a.date === today
            );
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
                <Avatar profile={s} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {s.name}
                  </div>
                  <div className="text-[0.7rem] text-slate-400 truncate">
                    {s.designation}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {l ? <StatusChip status={l.status} /> : null}
                  {log?.latePunch ? (
                    <span className="chip text-[0.62rem] text-amber-300 border-amber-500/30 bg-amber-500/10">
                      Late
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      {selected ? (
        <StaffEditor
          staff={selected}
          log={selLog ?? null}
          today={today}
          onChange={async () => {
            await refresh();
          }}
          onNotify={(msg, tone) => notify(msg, tone)}
          apiPost={apiPost}
        />
      ) : (
        <div className="glass p-8 text-center text-slate-400">
          Select a staff member to manage their record.
        </div>
      )}
    </div>
  );
}

interface EditorProps {
  staff: StaffProfile;
  log: AttendanceLog | null;
  today: string;
  onChange: () => Promise<void>;
  onNotify: (msg: string, tone: "ok" | "err" | "info") => void;
  apiPost: <T = unknown>(path: string, body?: unknown) => Promise<T>;
}

function StaffEditor({ staff, log, today, onChange, onNotify, apiPost }: EditorProps) {
  const [checkIn, setCheckIn] = useState<string>(fmtDateInputLocal(log?.checkInAt));
  const [checkOut, setCheckOut] = useState<string>(fmtDateInputLocal(log?.checkOutAt));
  const [late, setLate] = useState<boolean>(!!log?.latePunch);
  const [onLeave, setOnLeave] = useState<boolean>(!!log?.onLeave);
  const [hourly, setHourly] = useState<number>(staff.hourlyRate);
  const [ot, setOt] = useState<number>(staff.otRate);
  const [shift, setShift] = useState<number>(staff.baseShiftHours);
  const [saving, setSaving] = useState<string | null>(null);

  // Refresh local form whenever the selected staff or their log changes.
  // Without this, switching to another staff would keep the previous
  // staff's check-in/out/break times in the form.
  useEffect(() => {
    setCheckIn(fmtDateInputLocal(log?.checkInAt));
    setCheckOut(fmtDateInputLocal(log?.checkOutAt));
    setLate(!!log?.latePunch);
    setOnLeave(!!log?.onLeave);
    setHourly(staff.hourlyRate);
    setOt(staff.otRate);
    setShift(staff.baseShiftHours);
  }, [staff.id, staff.hourlyRate, staff.otRate, staff.baseShiftHours,
      log?.id, log?.checkInAt, log?.checkOutAt, log?.latePunch, log?.onLeave]);

  const send = async (body: Record<string, unknown>, key: string, success: string) => {
    setSaving(key);
    try {
      await apiPost("/api/supervisor", { staffId: staff.id, ...body });
      onNotify(success, "ok");
      await onChange();
    } catch (e) {
      onNotify((e as Error).message, "err");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="glass-strong p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar profile={staff} size={56} ring />
          <div className="flex-1 min-w-0">
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
              Editing
            </div>
            <div className="text-xl font-semibold text-white">{staff.name}</div>
            <div className="text-sm text-slate-400">
              {staff.designation} · {today}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onLeave ? (
              <span className="chip text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10">
                On Leave
              </span>
            ) : null}
            {late ? (
              <span className="chip text-amber-300 border-amber-500/30 bg-amber-500/10">
                Late Punch
              </span>
            ) : null}
            {log?.manuallyAdjusted ? (
              <span className="chip text-sky-300 border-sky-500/30 bg-sky-500/10">
                Manually Adjusted
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="label mb-1.5">Check-In (date & time)</div>
            <input
              type="datetime-local"
              className="input"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              disabled={onLeave}
            />
          </div>
          <div>
            <div className="label mb-1.5">Check-Out (date & time)</div>
            <input
              type="datetime-local"
              className="input"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              disabled={onLeave}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="btn btn-primary"
            disabled={saving === "times" || onLeave}
            onClick={() =>
              send(
                {
                  action: "edit_check_in_out",
                  date: today,
                  checkInAt: checkIn || null,
                  checkOutAt: checkOut || null
                },
                "times",
                "Check-in / check-out saved."
              )
            }
          >
            {saving === "times" ? "Saving…" : "Save Times"}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Late Punch</span>
            <button
              type="button"
              aria-pressed={late}
              className={`toggle ${late ? "on" : ""}`}
              onClick={async () => {
                const next = !late;
                setLate(next);
                await send(
                  {
                    action: "toggle_late",
                    date: today,
                    late: next
                  },
                  "late",
                  next ? "Marked as Late Punch." : "Late Punch cleared."
                );
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">On Leave</span>
            <button
              type="button"
              aria-pressed={onLeave}
              className={`toggle ${onLeave ? "on" : ""}`}
              onClick={async () => {
                const next = !onLeave;
                setOnLeave(next);
                await send(
                  {
                    action: "toggle_leave",
                    date: today,
                    onLeave: next
                  },
                  "leave",
                  next ? "Marked as On Leave." : "Returned from leave."
                );
              }}
            />
          </div>
        </div>
      </div>

      <div className="glass-strong p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
              Breaks
            </div>
            <div className="text-lg font-semibold text-white">
              Edit each break&apos;s duration
            </div>
          </div>
          <div className="text-xs text-slate-400">
            {log?.breaks.length ?? 0} breaks recorded
          </div>
        </div>
        {!log || log.breaks.length === 0 ? (
          <div className="text-sm text-slate-500 py-4 text-center">
            No breaks recorded for today.
          </div>
        ) : (
          <div className="space-y-3">
            {log.breaks.map((b) => {
              const p = BREAK_POLICIES[b.kind];
              const accent = BREAKS_ACCENT[b.kind];
              return (
                <div
                  key={b.id}
                  className="rounded-xl border p-4 flex flex-wrap items-center gap-4"
                  style={{
                    background: accent.bg,
                    borderColor: accent.border
                  }}
                >
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-sm font-semibold text-white">
                      {p.labelBn}
                    </div>
                    <div className="text-xs text-slate-300">
                      {fmtTimeOfDay(b.startedAt)} →{" "}
                      {fmtTimeOfDay(b.endedAt) || "active"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300">Duration</span>
                    <input
                      type="number"
                      min={0}
                      max={600}
                      defaultValue={b.minutes}
                      className="input w-24 text-right clock-mono"
                      onBlur={async (e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        await send(
                          {
                            action: "edit_break",
                            date: today,
                            breakId: b.id,
                            minutes: v
                          },
                          `brk-${b.id}`,
                          `${p.labelBn} set to ${v} minute(s).`
                        );
                      }}
                    />
                    <span className="text-xs text-slate-400">min</span>
                  </div>
                  <div className="text-sm font-mono text-white w-20 text-right">
                    {fmtClockHMS(b.minutes * 60)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-strong p-6">
        <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400 mb-1">
          Fixed Shift & Rate
        </div>
        <div className="text-lg font-semibold text-white mb-4">
          Set the base shift and hourly rates
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="label mb-1.5">Base Shift (hours)</div>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              className="input"
              value={shift}
              onChange={(e) => setShift(Number(e.target.value))}
            />
            <button
              className="btn btn-ghost mt-2 w-full"
              onClick={() =>
                send(
                  { action: "edit_shift", baseShiftHours: shift },
                  "shift",
                  `Base shift set to ${shift}h.`
                )
              }
            >
              {saving === "shift" ? "Saving…" : "Save Shift"}
            </button>
          </div>
          <div>
            <div className="label mb-1.5">Hourly Rate (৳)</div>
            <input
              type="number"
              min={0}
              className="input"
              value={hourly}
              onChange={(e) => setHourly(Number(e.target.value))}
            />
            <button
              className="btn btn-ghost mt-2 w-full"
              onClick={() =>
                send(
                  { action: "edit_rates", hourlyRate: hourly, otRate: ot },
                  "rates",
                  `Rates updated.`
                )
              }
            >
              {saving === "rates" ? "Saving…" : "Save Rates"}
            </button>
          </div>
          <div>
            <div className="label mb-1.5">OT Rate (৳/hr)</div>
            <input
              type="number"
              min={0}
              className="input"
              value={ot}
              onChange={(e) => setOt(Number(e.target.value))}
            />
            <div className="text-[0.7rem] text-slate-500 mt-2 leading-relaxed">
              Effective today. Used in the real-time payout calculator on the
              Ledger tab.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
