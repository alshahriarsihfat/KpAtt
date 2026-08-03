import { NextResponse } from "next/server";
import {
  ensureSchema,
  getAllAnnouncements,
  getAllAttendance,
  getAllStaff,
  getAllTasks
} from "@/lib/db";
import { isoNow, liveStateFor } from "@/lib/time";
import { getSession } from "@/lib/session";
import type { DashboardSnapshot, LiveState, StaffProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Minimal fallback profile used when the DB is unreachable so the
 * dashboard can still render with the seed data from the cookie.
 */
function fallbackMe(session: { staffId: string; name: string; role: "staff" | "supervisor" }): StaffProfile {
  return {
    id: session.staffId,
    name: session.name,
    role: session.role,
    pin: "****",
    designation: "Staff",
    baseShiftHours: 8,
    hourlyRate: 200,
    otRate: 300,
    avatarHue: 150,
    createdAt: isoNow()
  };
}

export async function GET() {
  // 1) Auth — never requires a DB.
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  // 2) Best-effort DB read. If the DB is reachable, use real data.
  //    If not, render a minimal dashboard from the cookie so the user
  //    is never bounced back to the login screen.
  try {
    await ensureSchema();
    const [staff, attendance, tasks, announcements] = await Promise.all([
      getAllStaff(),
      getAllAttendance(),
      getAllTasks(),
      getAllAnnouncements()
    ]);
    const me = staff.find((s) => s.id === session.staffId) ?? fallbackMe(session);
    const now = isoNow();
    const live: Record<string, LiveState> = {};
    for (const s of staff.length > 0 ? staff : [me]) {
      const log = attendance.find(
        (a) => a.staffId === s.id && a.date === todayLocal()
      );
      if (log) {
        live[s.id] = liveStateFor(log, now);
      } else {
        live[s.id] = {
          status: "clocked_out",
          currentBreak: null,
          currentBreakStartedAt: null,
          elapsedSeconds: 0,
          serverNow: now
        };
      }
    }
    const version = deriveVersion(attendance, tasks, announcements);
    const data: DashboardSnapshot = {
      me,
      staff: staff.length > 0 ? staff : [me],
      attendance,
      tasks,
      announcements,
      live,
      serverNow: now,
      version
    };
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    // DB unavailable — fall back to cookie-only state.
    const me = fallbackMe(session);
    const now = isoNow();
    const data: DashboardSnapshot = {
      me,
      staff: [me],
      attendance: [],
      tasks: [],
      announcements: [],
      live: {
        [me.id]: {
          status: "clocked_out",
          currentBreak: null,
          currentBreakStartedAt: null,
          elapsedSeconds: 0,
          serverNow: now
        }
      },
      serverNow: now,
      version: 0
    };
    return NextResponse.json(
      { ok: true, data, warning: (err as Error).message },
      { status: 200 }
    );
  }
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function deriveVersion(
  attendance: { updatedAt: string }[],
  tasks: { id: string; seenBy: string[] }[],
  announcements: { id: string }[]
): number {
  let v = 0;
  for (const a of attendance) {
    v += hash(a.updatedAt);
  }
  for (const t of tasks) {
    v += hash(`${t.id}:${t.seenBy.join("|")}`);
  }
  v += announcements.length * 17;
  return v;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
