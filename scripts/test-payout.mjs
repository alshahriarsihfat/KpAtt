#!/usr/bin/env node
/**
 * Smoke test for the payout formula. Pure-JS so it runs without a DB.
 * Mirrors the implementation in src/lib/time.ts.
 *
 * Formula (matches the spec):
 *   Total Worked = elapsed - paid breaks
 *   Effective Paid = Total Worked - unpaid breaks
 *   OT = max(0, Effective Paid - base shift)
 *   Net Pay = Effective Paid * hourlyRate + OT * otRate
 */
function diffSeconds(from, to) {
  if (!from || !to) return 0;
  return Math.max(
    0,
    Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000)
  );
}

const BREAKS = {
  meal: { paid: true },
  short: { paid: true },
  unpaid: { paid: false },
  paid: { paid: true }
};

function computePayout(log, profile, now) {
  const startIso = log.checkInAt;
  const endIso = log.checkOutAt ?? (log.checkInAt ? now : null);
  if (!startIso || !endIso) {
    return { netPay: 0, ot: 0, base: 0, eff: 0, unpaid: 0, worked: 0 };
  }
  const totalElapsed = diffSeconds(startIso, endIso);
  let totalUnpaid = 0;
  let totalPaid = 0;
  for (const b of log.breaks) {
    if (!b.endedAt) continue;
    const dur = diffSeconds(b.startedAt, b.endedAt);
    if (BREAKS[b.kind].paid) totalPaid += dur;
    else totalUnpaid += dur;
  }
  const totalWorked = Math.max(0, totalElapsed - totalPaid);
  const eff = Math.max(0, totalWorked - totalUnpaid);
  const baseSec = profile.baseShiftHours * 3600;
  const otSec = Math.max(0, eff - baseSec);
  const basePay = (eff / 3600) * profile.hourlyRate;
  const otPay = (otSec / 3600) * profile.otRate;
  return {
    netPay: basePay + otPay,
    ot: otSec / 3600,
    base: basePay,
    eff: eff / 3600,
    unpaid: totalUnpaid / 3600,
    worked: totalWorked / 3600
  };
}

const checks = [
  {
    name: "8h shift, 30m paid meal, base 8h, rate 200",
    log: {
      checkInAt: "2025-01-01T09:00:00Z",
      checkOutAt: "2025-01-01T17:00:00Z",
      breaks: [
        { startedAt: "2025-01-01T12:00:00Z", endedAt: "2025-01-01T12:30:00Z", kind: "meal" }
      ]
    },
    profile: { baseShiftHours: 8, hourlyRate: 200, otRate: 300 },
    expect: { totalWorked: 7.5, unpaid: 0, eff: 7.5, ot: 0, netPay: 7.5 * 200 }
  },
  {
    name: "8h shift, 1h unpaid, no OT",
    log: {
      checkInAt: "2025-01-01T09:00:00Z",
      checkOutAt: "2025-01-01T17:00:00Z",
      breaks: [
        { startedAt: "2025-01-01T14:00:00Z", endedAt: "2025-01-01T15:00:00Z", kind: "unpaid" }
      ]
    },
    profile: { baseShiftHours: 8, hourlyRate: 200, otRate: 300 },
    expect: { totalWorked: 8, unpaid: 1, eff: 7, ot: 0, netPay: 7 * 200 }
  },
  {
    name: "10h shift, 30m meal paid + 30m unpaid",
    log: {
      checkInAt: "2025-01-01T09:00:00Z",
      checkOutAt: "2025-01-01T19:00:00Z",
      breaks: [
        { startedAt: "2025-01-01T12:00:00Z", endedAt: "2025-01-01T12:30:00Z", kind: "meal" },
        { startedAt: "2025-01-01T15:00:00Z", endedAt: "2025-01-01T15:30:00Z", kind: "unpaid" }
      ]
    },
    profile: { baseShiftHours: 8, hourlyRate: 100, otRate: 150 },
    expect: { totalWorked: 9.5, unpaid: 0.5, eff: 9, ot: 1, netPay: 9 * 100 + 1 * 150 }
  },
  {
    name: "12h shift, 15m short paid, base 8h",
    log: {
      checkInAt: "2025-01-01T09:00:00Z",
      checkOutAt: "2025-01-01T21:00:00Z",
      breaks: [
        { startedAt: "2025-01-01T13:00:00Z", endedAt: "2025-01-01T13:15:00Z", kind: "short" }
      ]
    },
    profile: { baseShiftHours: 8, hourlyRate: 200, otRate: 400 },
    expect: {
      totalWorked: 11.75,
      unpaid: 0,
      eff: 11.75,
      ot: 3.75,
      netPay: 11.75 * 200 + 3.75 * 400
    }
  },
  {
    name: "no clock-in returns zero pay",
    log: { breaks: [] },
    profile: { baseShiftHours: 8, hourlyRate: 200, otRate: 300 },
    expect: { totalWorked: 0, unpaid: 0, eff: 0, ot: 0, netPay: 0 }
  }
];

let failed = 0;
for (const c of checks) {
  const r = computePayout(c.log, c.profile, c.log.checkOutAt);
  const effOk = Math.abs(r.eff - c.expect.eff) < 0.01;
  const otOk = Math.abs(r.ot - c.expect.ot) < 0.01;
  const payOk = Math.abs(r.netPay - c.expect.netPay) < 0.5;
  const workedOk = Math.abs(r.worked - c.expect.totalWorked) < 0.01;
  const unpaidOk = Math.abs(r.unpaid - c.expect.unpaid) < 0.01;
  const ok = effOk && otOk && payOk && workedOk && unpaidOk;
  console.log(
    `${ok ? "✓" : "✗"} ${c.name}\n` +
      `    worked=${r.worked.toFixed(2)}h unpaid=${r.unpaid.toFixed(2)}h eff=${r.eff.toFixed(2)}h ot=${r.ot.toFixed(2)}h pay=৳${r.netPay.toFixed(2)}`
  );
  if (!ok) {
    failed++;
    console.log(
      `    EXPECT: worked=${c.expect.totalWorked} unpaid=${c.expect.unpaid} eff=${c.expect.eff} ot=${c.expect.ot} pay=৳${c.expect.netPay}`
    );
  }
}
if (failed) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All payout tests passed.");
