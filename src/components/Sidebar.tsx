"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePortal, type TabKey } from "@/lib/client";
import { Avatar } from "./Avatar";

interface NavItem {
  key: TabKey;
  label: string;
  bn: string;
  icon: JSX.Element;
  roles: Array<"staff" | "supervisor">;
}

const NAV: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    bn: "ড্যাশবোর্ড",
    roles: ["staff", "supervisor"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    )
  },
  {
    key: "punch",
    label: "Punch Clock",
    bn: "পিঞ্চ ক্লক",
    roles: ["staff", "supervisor"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  },
  {
    key: "tasks",
    label: "Tasks",
    bn: "টাস্ক",
    roles: ["staff", "supervisor"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 11l3 3 8-8" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    )
  },
  {
    key: "announcements",
    label: "Announcements",
    bn: "ঘোষণা",
    roles: ["staff", "supervisor"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 11l18-7v16L3 13z" />
        <path d="M11 19l1 2 2-4" />
      </svg>
    )
  },
  {
    key: "supervisor",
    label: "Supervisor",
    bn: "সুপারভাইজার",
    roles: ["supervisor"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
        <path d="M9 12h6" />
      </svg>
    )
  },
  {
    key: "ledger",
    label: "Payout & Ledger",
    bn: "ফিন্যান্স ও উপস্থিতি",
    roles: ["staff", "supervisor"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 1v22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    )
  }
];

export function Sidebar() {
  const router = useRouter();
  const {
    me,
    activeTab,
    setActiveTab,
    tasks,
    apiPost,
    notify,
    syncState
  } = usePortal();

  const unreadTasks = useMemo(() => {
    if (!me) return 0;
    return tasks.filter((t) => !t.seenBy.includes(me.id)).length;
  }, [tasks, me]);

  const items = useMemo(
    () => NAV.filter((n) => (me ? n.roles.includes(me.role) : false)),
    [me]
  );

  const logout = async () => {
    try {
      await apiPost("/api/logout");
      notify("Signed out.", "info");
      router.replace("/");
      router.refresh();
    } catch (e) {
      notify((e as Error).message, "err");
    }
  };

  if (!me) return null;

  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 h-screen sticky top-0 p-4">
      <div className="glass-strong flex-1 flex flex-col p-5">
        <div className="flex items-center gap-3 mb-7">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #22e87f 0%, #10d977 100%)",
              boxShadow: "0 0 18px rgba(34,232,127,0.45)"
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
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
          <div>
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
              Khan Pharmacy
            </div>
            <div className="text-sm font-semibold text-white">
              Staff Portal
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          {items.map((it) => {
            const active = activeTab === it.key;
            const showBadge = it.key === "tasks" && unreadTasks > 0;
            return (
              <button
                key={it.key}
                onClick={() => setActiveTab(it.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition relative ${
                  active
                    ? "bg-neon-500/10 text-white border border-neon-500/30 shadow-neon"
                    : "text-slate-300 hover:bg-white/5 border border-transparent"
                }`}
              >
                <span
                  className={`w-5 h-5 ${
                    active ? "text-neon-400" : "text-slate-400"
                  }`}
                >
                  {it.icon}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{it.label}</div>
                  <div className="text-[0.65rem] text-slate-500">{it.bn}</div>
                </div>
                {showBadge ? (
                  <span className="bg-neon-500 text-slate-950 text-[0.7rem] font-bold w-6 h-6 rounded-full flex items-center justify-center animate-pulseGlow">
                    {unreadTasks}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 pt-5 border-t border-white/5">
          <div className="flex items-center gap-3">
            <Avatar profile={me} size={42} ring />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {me.name.replace(/\(Supervisor\)/i, "").trim()}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {me.designation}
              </div>
            </div>
            <button
              onClick={logout}
              className="btn btn-ghost px-2.5 py-1.5 text-xs"
              title="Sign out"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[0.7rem] text-slate-500">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                syncState === "live"
                  ? "bg-neon-400"
                  : syncState === "polling"
                  ? "bg-amber-400"
                  : "bg-rose-400"
              }`}
            />
            {syncState === "live"
              ? "Live sync active"
              : syncState === "polling"
              ? "1s sync polling"
              : "Offline"}
          </div>
        </div>
      </div>
    </aside>
  );
}
