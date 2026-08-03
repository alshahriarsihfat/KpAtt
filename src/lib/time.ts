import {
  BREAK_POLICIES,
  type AttendanceLog,
  type BreakKind,
  type BreakRecord,
  type LiveState,
  type PayoutBreakdown,
  type StaffProfile
} from "./types";

/** Now() in ms, abstracted for testability. */
export function nowMs(): number {
  return Date.now();
}

export function isoNow(): string {
  return new Date(nowMs()).toISOString();
}

export function diffSeconds(from: string | null, to: string | null): number {
  if (!from || !to) return 0;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.floor((b - a) / 1000));
}

export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDateInputLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Format: yyyy-MM-ddTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function parseDateInputLocal(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function fmtClockHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    sec
  ).padStart(2, "0")}`;
}

export function fmtTimeOfDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

export function fmtDateLong(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function fmtBDT(n: number): string {
  if (!Number.isFinite(n)) return "৳0";
  return `৳${Math.round(n).toLocaleString("en-IN")}`;
}

/** A break is "active" if it was started and never ended. */
export function activeBreak(log: AttendanceLog): BreakRecord | null {
  for (const b of log.breaks) {
    if (!b.endedAt) return b;
  }
  return null;
}

/** Returns the active break kind, if any. */
export function activeBreakKind(log: AttendanceLog): BreakKind | null {
  return activeBreak(log)?.kind ?? null;
}

export function attendanceStatus(
  log: AttendanceLog,
  now: string
): LiveState["status"] {
  if (log.onLeave) return "on_leave";
  if (activeBreak(log)) return "on_break";
  if (log.checkOutAt) return "clocked_out_for_day";
  if (log.checkInAt) {
    return "working";
  }
  return "clocked_out";
}

/**
 * Compute the live state for a staff member.
 * The "elapsedSeconds" is the active counter for the UI:
 *   - working: time since clock-in minus paid break minutes
 *   - on_break: time since the active break started
 *   - clocked_out_for_day: 0
 *   - clocked_out: 0
 */
export function liveStateFor(
  log: AttendanceLog,
  now: string
): LiveState {
  const status = attendanceStatus(log, now);
  const ab = activeBreak(log);

  if (status === "on_break" && ab) {
    return {
      status,
      currentBreak: ab.kind,
      currentBreakStartedAt: ab.startedAt,
      elapsedSeconds: diffSeconds(ab.startedAt, now),
      serverNow: now
    };
  }

  if (status === "working" && log.checkInAt) {
    // Subtract already-completed (closed) breaks.
    let subSeconds = 0;
    for (const b of log.breaks) {
      if (b.endedAt) {
        subSeconds += diffSeconds(b.startedAt, b.endedAt);
      }
    }
    const raw = diffSeconds(log.checkInAt, now);
    return {
      status,
      currentBreak: null,
      currentBreakStartedAt: null,
      elapsedSeconds: Math.max(0, raw - subSeconds),
      serverNow: now
    };
  }

  if (status === "clocked_out_for_day" && log.checkInAt && log.checkOutAt) {
    let subSeconds = 0;
    for (const b of log.breaks) {
      if (b.endedAt) subSeconds += diffSeconds(b.startedAt, b.endedAt);
    }
    const raw = diffSeconds(log.checkInAt, log.checkOutAt);
    return {
      status,
      currentBreak: null,
      currentBreakStartedAt: null,
      elapsedSeconds: Math.max(0, raw - subSeconds),
      serverNow: now
    };
  }

  return {
    status,
    currentBreak: null,
    currentBreakStartedAt: null,
    elapsedSeconds: 0,
    serverNow: now
  };
}

/**
 * Returns the list of break actions that are legal RIGHT NOW.
 * You can only start another break when no break is active and the staff
 * is currently working (or starting the very first break right after
 * clock-in). You can only end the active break.
 */
export function legalActions(log: AttendanceLog): {
  canClockIn: boolean;
  canClockOut: boolean;
  canStartBreak: boolean;
  canEndBreak: boolean;
} {
  if (log.onLeave) {
    return {
      canClockIn: false,
      canClockOut: false,
      canStartBreak: false,
      canEndBreak: false
    };
  }
  const ab = activeBreak(log);
  if (ab) {
    return {
      canClockIn: false,
      canClockOut: false,
      canStartBreak: false,
      canEndBreak: true
    };
  }
  const checkedIn = !!log.checkInAt;
  const checkedOut = !!log.checkOutAt;
  return {
    canClockIn: !checkedIn && !checkedOut,
    canClockOut: checkedIn && !checkedOut,
    canStartBreak: checkedIn && !checkedOut,
    canEndBreak: false
  };
}

/**
 * Apply a clock-in. Idempotent if already clocked in.
 */
export function doClockIn(log: AttendanceLog, now: string): AttendanceLog {
  if (log.onLeave) return log;
  if (log.checkInAt && !log.checkOutAt) return log;
  if (log.checkOutAt) return log;
  return { ...log, checkInAt: now, updatedAt: now };
}

/**
 * Apply a clock-out. Forces the active break (if any) to close first.
 * If the staff member never clocked in, we still record a check-in at
 * the same instant to keep totals well-defined.
 */
export function doClockOut(log: AttendanceLog, now: string): AttendanceLog {
  if (log.onLeave) return log;
  const closedBreaks = log.breaks.map((b) =>
    b.endedAt
      ? b
      : {
          ...b,
          endedAt: now,
          minutes: Math.max(
            0,
            Math.floor(diffSeconds(b.startedAt, now) / 60)
          )
        }
  );
  const checkIn = log.checkInAt ?? now;
  return {
    ...log,
    checkInAt: checkIn,
    breaks: closedBreaks,
    checkOutAt: now,
    updatedAt: now
  };
}

export function doStartBreak(
  log: AttendanceLog,
  kind: BreakKind,
  now: string
): AttendanceLog {
  if (!log.checkInAt || log.checkOutAt) return log;
  if (log.onLeave) return log;
  if (activeBreak(log)) return log;
  const id = `brk-${log.staffId}-${now.slice(11, 19).replace(/[:.]/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const br: BreakRecord = {
    id,
    kind,
    startedAt: now,
    endedAt: null,
    minutes: 0
  };
  return { ...log, breaks: [...log.breaks, br], updatedAt: now };
}

export function doEndBreak(
  log: AttendanceLog,
  now: string
): AttendanceLog {
  const ab = activeBreak(log);
  if (!ab) return log;
  const minutes = Math.max(0, Math.floor(diffSeconds(ab.startedAt, now) / 60));
  const next = log.breaks.map((b) =>
    b.id === ab.id ? { ...b, endedAt: now, minutes } : b
  );
  return { ...log, breaks: next, updatedAt: now };
}

/** Enforce a maximum duration on a break (used by supervisor edits). */
export function setBreakMinutes(
  log: AttendanceLog,
  breakId: string,
  minutes: number
): AttendanceLog {
  const next = log.breaks.map((b) => {
    if (b.id !== breakId) return b;
    const safe = Math.max(0, Math.floor(minutes));
    const endedAt = new Date(
      new Date(b.startedAt).getTime() + safe * 60_000
    ).toISOString();
    return { ...b, endedAt, minutes: safe };
  });
  return { ...log, breaks: next, updatedAt: isoNow() };
}

/** Supervisor: directly patch check-in / check-out times. */
export function setCheckInOut(
  log: AttendanceLog,
  checkInAt: string | null,
  checkOutAt: string | null
): AttendanceLog {
  return {
    ...log,
    checkInAt,
    checkOutAt,
    manuallyAdjusted: true,
    updatedAt: isoNow()
  };
}

export function setLatePunch(
  log: AttendanceLog,
  late: boolean
): AttendanceLog {
  return { ...log, latePunch: late, manuallyAdjusted: true, updatedAt: isoNow() };
}

export function setOnLeave(
  log: AttendanceLog,
  onLeave: boolean
): AttendanceLog {
  if (onLeave) {
    // Toggling ON clears open shift state.
    return {
      ...log,
      onLeave: true,
      checkInAt: null,
      checkOutAt: null,
      breaks: [],
      manuallyAdjusted: true,
      updatedAt: isoNow()
    };
  }
  // Toggling OFF keeps any existing closed state; only onLeave flips.
  return {
    ...log,
    onLeave: false,
    manuallyAdjusted: true,
    updatedAt: isoNow()
  };
}

/**
 * Final payroll math.
 *   (Total Worked Hours - Total Unpaid Break Hours) * Hourly Rate
 *   + (Overtime Hours * OT Rate)
 *
 * Definitions (matching the spec):
 *   - Total Worked Hours = elapsed from clock-in to clock-out
 *                          minus all PAID break durations.
 *                          (Unpaid breaks are NOT subtracted here because
 *                          the formula subtracts them in a second step.)
 *   - Total Unpaid Break Hours = sum of all unpaid-break durations.
 *   - Effective Paid Hours = Total Worked - Total Unpaid
 *                            (= hours the employee gets paid for)
 *   - Overtime Hours = max(0, Effective Paid - base shift)
 */
export function computePayout(
  log: AttendanceLog,
  profile: StaffProfile,
  now: string
): PayoutBreakdown {
  let totalElapsed = 0;
  let totalUnpaid = 0;
  let totalPaidBreak = 0;

  const startIso = log.checkInAt;
  const endIso = log.checkOutAt ?? (log.checkInAt ? now : null);
  if (startIso && endIso) {
    totalElapsed = diffSeconds(startIso, endIso);
    for (const b of log.breaks) {
      if (!b.endedAt) continue;
      const dur = diffSeconds(b.startedAt, b.endedAt);
      const policy = BREAK_POLICIES[b.kind];
      if (policy.paid) {
        totalPaidBreak += dur;
      } else {
        totalUnpaid += dur;
      }
    }
  }

  // Step 1: Total Worked = elapsed − paid breaks (unpaid NOT subtracted yet)
  const totalWorked = Math.max(0, totalElapsed - totalPaidBreak);

  // Step 2: Effective Paid = Total Worked − unpaid breaks (per formula)
  const effective = Math.max(0, totalWorked - totalUnpaid);

  // Step 3: Overtime
  const baseSeconds = profile.baseShiftHours * 3600;
  const otSeconds = Math.max(0, effective - baseSeconds);

  // Step 4: Money
  const basePay = (effective / 3600) * profile.hourlyRate;
  const otPay = (otSeconds / 3600) * profile.otRate;
  const netPay = basePay + otPay;

  return {
    totalWorkedSeconds: totalWorked,
    totalUnpaidBreakSeconds: totalUnpaid,
    effectiveWorkedSeconds: effective,
    overtimeSeconds: otSeconds,
    netPay,
    overtimePay: otPay,
    basePay,
    totalWorkedHours: round1(totalWorked / 3600),
    totalUnpaidBreakHours: round1(totalUnpaid / 3600),
    effectiveWorkedHours: round1(effective / 3600),
    overtimeHours: round1(otSeconds / 3600)
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
