import { NextRequest, NextResponse } from "next/server";
import {
  ensureSchema,
  getAttendanceFor,
  getStaffById,
  updateStaffProfile,
  upsertAttendanceCAS
} from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  isoNow,
  parseDateInputLocal,
  setBreakMinutes,
  setCheckInOut,
  setLatePunch,
  setOnLeave,
  todayLocal
} from "@/lib/time";
import type { AttendanceLog } from "@/lib/types";

export const runtime = "nodejs";

interface SupervisorBody {
  action:
    | "edit_check_in_out"
    | "edit_break"
    | "toggle_late"
    | "toggle_leave"
    | "edit_rates"
    | "edit_shift";
  staffId: string;
  date?: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  breakId?: string;
  minutes?: number;
  late?: boolean;
  onLeave?: boolean;
  baseShiftHours?: number;
  hourlyRate?: number;
  otRate?: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 }
      );
    }
    if (session.role !== "supervisor") {
      return NextResponse.json(
        { ok: false, error: "Supervisor privilege required." },
        { status: 403 }
      );
    }
    await ensureSchema();
    const body = (await req.json().catch(() => ({}))) as SupervisorBody;
    if (!body.staffId) {
      return NextResponse.json(
        { ok: false, error: "staffId required." },
        { status: 400 }
      );
    }
    const target = await getStaffById(body.staffId);
    if (!target) {
      return NextResponse.json(
        { ok: false, error: "Target staff not found." },
        { status: 404 }
      );
    }

    // Rate / shift edits don't touch attendance — handle them first
    // and return early.
    if (body.action === "edit_rates") {
      if (
        typeof body.hourlyRate !== "number" ||
        typeof body.otRate !== "number" ||
        body.hourlyRate < 0 ||
        body.otRate < 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Hourly rate and OT rate must be non-negative numbers."
          },
          { status: 400 }
        );
      }
      await updateStaffProfile(target.id, {
        hourlyRate: body.hourlyRate,
        otRate: body.otRate
      });
      return NextResponse.json({
        ok: true,
        data: { staffId: target.id },
        serverNow: isoNow(),
        version: Date.now()
      });
    }
    if (body.action === "edit_shift") {
      if (
        typeof body.baseShiftHours !== "number" ||
        body.baseShiftHours < 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Base shift hours must be a non-negative number."
          },
          { status: 400 }
        );
      }
      await updateStaffProfile(target.id, {
        baseShiftHours: body.baseShiftHours
      });
      return NextResponse.json({
        ok: true,
        data: { staffId: target.id },
        serverNow: isoNow(),
        version: Date.now()
      });
    }

    // For all attendance edits, use optimistic locking.
    const date = body.date ?? todayLocal();
    let attempt = 0;
    while (attempt < 3) {
      attempt++;
      const existing = await getAttendanceFor(target.id, date);
      const log: AttendanceLog = existing ?? blankLog(target.id, date);
      let next: AttendanceLog;

      switch (body.action) {
        case "edit_check_in_out": {
          const ci = body.checkInAt
            ? parseDateInputLocal(body.checkInAt)
            : null;
          const co = body.checkOutAt
            ? parseDateInputLocal(body.checkOutAt)
            : null;
          if (ci && co && new Date(ci).getTime() > new Date(co).getTime()) {
            return NextResponse.json(
              {
                ok: false,
                error: "Check-out cannot be earlier than check-in."
              },
              { status: 400 }
            );
          }
          next = setCheckInOut(log, ci, co);
          break;
        }
        case "edit_break": {
          if (!body.breakId) {
            return NextResponse.json(
              { ok: false, error: "breakId required." },
              { status: 400 }
            );
          }
          if (typeof body.minutes !== "number" || body.minutes < 0) {
            return NextResponse.json(
              { ok: false, error: "minutes must be a non-negative number." },
              { status: 400 }
            );
          }
          next = setBreakMinutes(log, body.breakId, body.minutes);
          break;
        }
        case "toggle_late": {
          next = setLatePunch(log, !!body.late);
          break;
        }
        case "toggle_leave": {
          next = setOnLeave(log, !!body.onLeave);
          break;
        }
        default:
          return NextResponse.json(
            { ok: false, error: "Unknown supervisor action." },
            { status: 400 }
          );
      }

      const result = await upsertAttendanceCAS(
        next,
        existing?.updatedAt ?? null
      );
      if (!result.conflict) {
        return NextResponse.json({
          ok: true,
          data: result.log,
          serverNow: isoNow(),
          version: Date.now()
        });
      }
      // Conflict — retry
    }
    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not save after multiple retries. Another supervisor may be editing the same record."
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

function blankLog(staffId: string, date: string): AttendanceLog {
  return {
    id: `${staffId}-${date}`,
    staffId,
    date,
    checkInAt: null,
    checkOutAt: null,
    breaks: [],
    latePunch: false,
    onLeave: false,
    manuallyAdjusted: true,
    updatedAt: isoNow()
  };
}
