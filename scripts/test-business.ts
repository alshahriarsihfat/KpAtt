/**
 * Offline test of the business logic (clock actions + payout + break enforcement).
 * Uses tsx so we can import the .ts source directly without a build step.
 */
import {
  computePayout,
  doClockIn,
  doClockOut,
  doEndBreak,
  doStartBreak,
  liveStateFor,
  setBreakMinutes,
  setOnLeave
} from "../src/lib/time";
import type { AttendanceLog, StaffProfile } from "../src/lib/types";

const baseProfile: StaffProfile = {
  id: "stf-test",
  name: "Test User",
  role: "staff",
  pin: "0000",
  designation: "Tester",
  baseShiftHours: 8,
  hourlyRate: 100,
  otRate: 150,
  avatarHue: 120,
  createdAt: new Date().toISOString()
};

function expect(name: string, cond: boolean) {
  if (!cond) {
    console.error(`✗ ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${name}`);
  }
}

// 1) Fresh day → no breaks
let log: AttendanceLog = {
  id: "stf-test-2025-01-01",
  staffId: "stf-test",
  date: "2025-01-01",
  checkInAt: null,
  checkOutAt: null,
  breaks: [],
  latePunch: false,
  onLeave: false,
  manuallyAdjusted: false,
  updatedAt: new Date().toISOString()
};

log = doClockIn(log, "2025-01-01T09:00:00Z");
expect("clock-in sets checkInAt", log.checkInAt === "2025-01-01T09:00:00Z");
expect("clock-in is idempotent", doClockIn(log, "2025-01-01T09:01:00Z").checkInAt === "2025-01-01T09:00:00Z");

log = doStartBreak(log, "meal", "2025-01-01T12:00:00Z");
log = doStartBreak(log, "short", "2025-01-01T12:00:00Z");
expect("cannot start a second break while one is active", log.breaks.length === 1);

log = doEndBreak(log, "2025-01-01T12:30:00Z");
expect("ended break has minutes=30", log.breaks[0].minutes === 30);
log = doStartBreak(log, "unpaid", "2025-01-01T15:00:00Z");
log = doEndBreak(log, "2025-01-01T15:30:00Z");
expect("unpaid break minutes=30", log.breaks[1].minutes === 30 && log.breaks[1].kind === "unpaid");

log = doClockOut(log, "2025-01-01T19:00:00Z");
expect("clock-out populated", log.checkOutAt === "2025-01-01T19:00:00Z");

const p = computePayout(log, baseProfile, "2025-01-01T19:00:00Z");
// Formula:
//   Total Worked = elapsed - paid breaks = 10 - 0.5 = 9.5h
//   Effective    = Total Worked - unpaid breaks = 9.5 - 0.5 = 9h
//   OT           = max(0, Effective - base shift) = max(0, 9 - 8) = 1h
//   Net Pay      = 9 * 100 + 1 * 150 = 1050
expect("payout totalWorked=9.5h", Math.abs(p.totalWorkedHours - 9.5) < 0.01);
expect("payout unpaid=0.5h", Math.abs(p.totalUnpaidBreakHours - 0.5) < 0.01);
expect("payout effective=9h", Math.abs(p.effectiveWorkedHours - 9) < 0.01);
expect("payout OT=1h", Math.abs(p.overtimeHours - 1) < 0.01);
expect("payout netPay=1050", Math.abs(p.netPay - 1050) < 0.5);

// 2) Live state while working
const l1 = liveStateFor(log, "2025-01-01T19:00:00Z");
expect("after clock-out, status=clocked_out_for_day", l1.status === "clocked_out_for_day");

// 3) Supervisor edit: change a break's minutes
const edited = setBreakMinutes(log, log.breaks[0].id, 45);
expect("supervisor break edit minutes=45", edited.breaks[0].minutes === 45);

// 4) Set on leave wipes open state
const onLeave = setOnLeave(log, true);
expect("onLeave=true clears checkIn", onLeave.onLeave && onLeave.checkInAt === null && onLeave.breaks.length === 0);

console.log("\nDone.");
