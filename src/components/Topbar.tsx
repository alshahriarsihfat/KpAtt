"use client";

import { useMemo, useState } from "react";
import { usePortal, type TabKey } from "@/lib/client";
import { Avatar } from "./Avatar";
import { fmtTimeOfDay } from "@/lib/time";

const TAB_LABELS: Record<TabKey, string> = {
  dashboard: "Dashboard",
  punch: "Punch Clock",
  tasks: "Tasks & Announcements",
  supervisor: "Supervisor Control",
  ledger: "Payout & Ledger",
  announcements: "Announcements"
};

export function Topbar() {
  const { me, setActiveTab, activeTab, staff, live, serverNow } = usePortal();
  const [open, setOpen] = useState(false);

  const others = useMemo(
    () => staff.filter((s) => s.id !== me?.id).slice(0, 4),
    [staff, me]
  );

  const onDutyCount = useMemo(
    () =>
      Object.values(live).filter(
        (l) => l.status === "working" || l.status === "on_break"
      ).length,
    [live]
  );

  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#05070d]/70 border-b border-white/5">
      <div className="px-4 md:px-8 py-3.5 flex items-center gap-4">
        <div className="flex items-center gap-3 md:hidden">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #22e87f 0%, #10d977 100%)",
              boxShadow: "0 0 18px rgba(34,232,127,0.45)"
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="#04150c"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z" />
              <path d="M9 12h6M12 9v6" />
            </svg>
          </div>
        </div>

        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
            {TAB_LABELS[activeTab]}
          </div>
          <div className="text-base md:text-lg font-semibold text-white leading-tight">
            Hello, {me?.name.replace(/\(Supervisor\)/i, "").trim().split(" ")[0] || "—"}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 ml-4">
          {others.map((s) => {
            const l = live[s.id];
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full glass-thin text-xs"
                title={s.name}
              >
                <Avatar profile={s} size={22} />
                <span className="text-slate-200">
                  {s.name.split(" ")[1] ?? s.name}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    l?.status === "working"
                      ? "bg-neon-400"
                      : l?.status === "on_break"
                      ? "bg-amber-400"
                      : l?.status === "on_leave"
                      ? "bg-fuchsia-400"
                      : "bg-slate-500"
                  }`}
                />
              </div>
            );
          })}
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2 chip">
          <span className="chip-dot" />
          {onDutyCount} on duty
        </div>

        <div className="clock-mono text-sm md:text-base text-slate-200 tabular-nums">
          {fmtTimeOfDay(serverNow)}
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl glass-thin hover:bg-white/5"
          >
            {me ? <Avatar profile={me} size={26} /> : null}
            <span className="hidden md:inline text-sm">
              {me?.name.split(" ")[1] ?? me?.name ?? "—"}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {open ? (
            <div className="absolute right-0 mt-2 w-64 glass-strong p-3 z-30 animate-fadeIn">
              {me ? (
                <>
                  <div className="flex items-center gap-3 p-2">
                    <Avatar profile={me} size={42} />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {me.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {me.designation}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div className="glass-thin p-2">
                      <div className="text-slate-400">Base Shift</div>
                      <div className="text-white font-semibold">
                        {me.baseShiftHours}h
                      </div>
                    </div>
                    <div className="glass-thin p-2">
                      <div className="text-slate-400">Hourly</div>
                      <div className="text-white font-semibold">
                        ৳{me.hourlyRate}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
