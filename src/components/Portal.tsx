"use client";

import { useEffect } from "react";
import { usePortal, type TabKey } from "@/lib/client";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DashboardOverview } from "./DashboardOverview";
import { PunchClock } from "./PunchClock";
import { SupervisorPanel } from "./SupervisorPanel";
import { Ledger } from "./Ledger";
import { TasksBoard } from "./TasksBoard";
import { Announcements } from "./Announcements";
import { Login } from "./Login";

export function Portal() {
  const { ready, me, activeTab, setActiveTab } = usePortal();

  // If a staff (non-supervisor) somehow lands on supervisor tab, redirect to dashboard.
  useEffect(() => {
    if (me?.role !== "supervisor" && activeTab === "supervisor") {
      setActiveTab("dashboard");
    }
  }, [me, activeTab, setActiveTab]);

  if (!ready) {
    return <Splash label="Loading portal…" />;
  }
  if (!me) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 px-4 md:px-8 py-6">
          <TabGuard tab={activeTab}>
            <DashboardOverview />
          </TabGuard>
          <TabGuard tab={activeTab} match="punch">
            <PunchClock />
          </TabGuard>
          <TabGuard tab={activeTab} match="tasks">
            <TasksBoard />
          </TabGuard>
          <TabGuard tab={activeTab} match="announcements">
            <Announcements />
          </TabGuard>
          <TabGuard tab={activeTab} match="supervisor">
            <SupervisorPanel />
          </TabGuard>
          <TabGuard tab={activeTab} match="ledger">
            <Ledger />
          </TabGuard>
        </main>
        <footer className="px-8 py-5 text-[0.7rem] text-slate-500 flex items-center justify-between">
          <span>
            © {new Date().getFullYear()} Khan Pharmacy · Staff Portal
          </span>
          <span className="flex items-center gap-2">
            <span className="chip-dot" />
            Real-time sync active · Neon-backed
          </span>
        </footer>
      </div>
    </div>
  );
}

function TabGuard({
  tab,
  match,
  children
}: {
  tab: TabKey;
  match?: TabKey;
  children: React.ReactNode;
}) {
  const target: TabKey = match ?? "dashboard";
  if (tab !== target) return null;
  return <div className="animate-fadeIn">{children}</div>;
}

function Splash({ label }: { label: string }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="glass-strong p-8 max-w-md w-full text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: "linear-gradient(135deg, #22e87f 0%, #10d977 100%)",
            boxShadow: "0 0 24px rgba(34,232,127,0.45)"
          }}
        >
          <span className="block w-3 h-3 rounded-full bg-slate-950 animate-pulse" />
        </div>
        <div className="text-sm text-slate-200 mb-1">{label}</div>
        <div className="text-xs text-slate-500">
          If this takes more than a few seconds, hard-refresh (Ctrl/⌘+Shift+R).
        </div>
      </div>
    </div>
  );
}
