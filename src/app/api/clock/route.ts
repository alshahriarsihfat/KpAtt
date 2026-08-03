import { NextRequest, NextResponse } from "next/server";
import {
  ensureSchema,
  getAttendanceFor,
  upsertAttendanceCAS
} from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  doClockIn,
  doClockOut,
  doEndBreak,
  doStartBreak,
  isoNow,
  todayLocal
} from "@/lib/time";
import type { AttendanceLog, BreakKind } from "@/lib/types";

export const runtime = "nodejs";

const VALID_KINDS: BreakKind[] = ["meal", "short", "unpaid", "paid"];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 }
      );
    }
    await ensureSchema();
    const body = (await req.json().catch(() => ({}))) as {
      action?: "in" | "out" | "break_start" | "break_end";
      breakKind?: BreakKind;
    };
    const { action, breakKind } = body;
    if (!action) {
      return NextResponse.json(
        { ok: false, error: "Missing action." },
        { status: 400 }
      );
    }
    const today = todayLocal();
    const now = isoNow();

    // Read-modify-write loop with optimistic locking. We retry up to
    // 3 times to absorb concurrent writes (e.g. two break buttons
    // clicked within a few ms).
    let attempt = 0;
    let next: AttendanceLog | null = null;
    while (attempt < 3) {
      attempt++;
      let log = await getAttendanceFor(session.staffId, today);
      if (!log) {
        log = makeBlankLog(session.staffId, today);
      }
      if (log.onLeave && session.role === "staff") {
        return NextResponse.json(
          {
            ok: false,
            error: "Staff is on leave today. Supervisor must clear it first."
          },
          { status: 409 }
        );
      }
      switch (action) {
        case "in":
          next = doClockIn(log, now);
          break;
        case "out":
          next = doClockOut(log, now);
          break;
        case "break_start":
          if (!breakKind || !VALID_KINDS.includes(breakKind)) {
            return NextResponse.json(
              { ok: false, error: "Invalid break kind." },
              { status: 400 }
            );
          }
          next = doStartBreak(log, breakKind, now);
          break;
        case "break_end":
          next = doEndBreak(log, now);
          break;
        default:
          return NextResponse.json(
            { ok: false, error: "Unknown action." },
            { status: 400 }
          );
      }
      if (!next) break;
      const result = await upsertAttendanceCAS(next, log.updatedAt);
      if (!result.conflict) {
        return NextResponse.json({
          ok: true,
          data: result.log,
          serverNow: now,
          version: Date.now()
        });
      }
      // Conflict — re-read and retry
    }
    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not save attendance after multiple retries. Please try again."
      },
      { status: 409 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

function makeBlankLog(staffId: string, date: string): AttendanceLog {
  return {
    id: `${staffId}-${date}`,
    staffId,
    date,
    checkInAt: null,
    checkOutAt: null,
    breaks: [],
    latePunch: false,
    onLeave: false,
    manuallyAdjusted: false,
    updatedAt: isoNow()
  };
}
