// Strict TypeScript domain types for the Khan Pharmacy Staff Portal.
// All shared types are exported from this file so the entire codebase
// (UI, API routes, DB layer) uses the same canonical definitions.

export type Role = "staff" | "supervisor";

export type BreakKind =
  | "meal" // খাবার বিরতি (paid, capped 30m)
  | "short" // স্বল্প বিরতি (paid, capped 15m)
  | "unpaid" // ব্যক্তিগত/অবৈতনিক বিরতি
  | "paid"; // অফিসিয়াল/বৈতনিক বিরতি

export type AttendanceStatus =
  | "clocked_out"
  | "working"
  | "on_break"
  | "on_leave"
  | "clocked_out_for_day";

export interface BreakPolicy {
  /** Allowed maximum minutes; if null, the break is open-ended. */
  maxMinutes: number | null;
  /** Whether this break reduces paid work hours. */
  paid: boolean;
  /** Human label in English. */
  label: string;
  /** Bengali label. */
  labelBn: string;
  /** Tailwind accent color for chips/buttons. */
  accent: "amber" | "sky" | "rose" | "violet";
}

export const BREAK_POLICIES: Record<BreakKind, BreakPolicy> = {
  meal: {
    maxMinutes: 30,
    paid: true,
    label: "Meal Break",
    labelBn: "খাবার বিরতি",
    accent: "amber"
  },
  short: {
    maxMinutes: 15,
    paid: true,
    label: "Short Break",
    labelBn: "স্বল্প বিরতি",
    accent: "sky"
  },
  unpaid: {
    maxMinutes: null,
    paid: false,
    label: "Unpaid Out",
    labelBn: "ব্যক্তিগত/অবৈতনিক বিরতি",
    accent: "rose"
  },
  paid: {
    maxMinutes: null,
    paid: true,
    label: "Paid Out",
    labelBn: "অফিসিয়াল/বৈতনিক বিরতি",
    accent: "violet"
  }
};

export interface BreakRecord {
  id: string;
  kind: BreakKind;
  startedAt: string; // ISO
  /** Set when the break is resumed. Null while active. */
  endedAt: string | null;
  /** Actual minutes, computed once ended. */
  minutes: number;
}

export interface AttendanceLog {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD (local)
  checkInAt: string | null; // ISO
  checkOutAt: string | null; // ISO
  breaks: BreakRecord[];
  latePunch: boolean;
  onLeave: boolean;
  /** Set by supervisor to flag a manual edit was performed. */
  manuallyAdjusted: boolean;
  updatedAt: string;
}

export interface StaffProfile {
  id: string;
  name: string;
  role: Role;
  /** Plaintext seed-only; never used for auth in production. */
  pin: string;
  designation: string;
  baseShiftHours: number; // e.g. 8
  hourlyRate: number; // BDT
  otRate: number; // BDT per OT hour
  avatarHue: number; // 0-360 for the procedural avatar
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  body: string;
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  /** Per-staff read tracking. Keyed by staffId. */
  seenBy: string[];
  createdBy: string; // supervisor id or name
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  createdBy: string;
}

export interface PayoutBreakdown {
  totalWorkedSeconds: number;
  totalUnpaidBreakSeconds: number;
  effectiveWorkedSeconds: number;
  overtimeSeconds: number;
  netPay: number;
  overtimePay: number;
  basePay: number;
  /** Decimal-hour figures for the UI. */
  totalWorkedHours: number;
  totalUnpaidBreakHours: number;
  effectiveWorkedHours: number;
  overtimeHours: number;
}

/** A snapshot of the live runtime for a single staff member. */
export interface LiveState {
  status: AttendanceStatus;
  currentBreak: BreakKind | null;
  currentBreakStartedAt: string | null;
  /** Elapsed seconds since the active state began (clock-in or break start). */
  elapsedSeconds: number;
  /** Convenience: server time for client clock alignment. */
  serverNow: string;
}

export interface StaffSession {
  staffId: string;
  name: string;
  role: Role;
  loggedInAt: string;
}

/** API envelope. */
export interface ApiOk<T> {
  ok: true;
  data: T;
  serverNow: string;
  /** Monotonic version used to detect no-op broadcasts. */
  version: number;
}

export interface ApiErr {
  ok: false;
  error: string;
}

export type ApiResult<T> = ApiOk<T> | ApiErr;

export interface DashboardSnapshot {
  me: StaffProfile;
  staff: StaffProfile[];
  attendance: AttendanceLog[];
  tasks: Task[];
  announcements: Announcement[];
  /** Live presence for every staff member. */
  live: Record<string, LiveState>;
  serverNow: string;
  version: number;
}

export interface DashboardMutation<T = unknown> {
  ok: true;
  data: T;
  serverNow: string;
  version: number;
}
