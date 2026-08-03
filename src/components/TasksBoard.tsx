"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePortal } from "@/lib/client";
import {
  PRIORITY_ACCENT,
  fmtDateLong,
  fmtTimeOfDay
} from "./ui-helpers";
import type { Task } from "@/lib/types";

export function TasksBoard() {
  const {
    me,
    tasks,
    apiPost,
    notify,
    setActiveTab,
    activeTab
  } = usePortal();

  // Auto-mark all as seen when the staff user lands on the Tasks tab.
  // Guard against re-firing while the request is in flight.
  const markingRef = useRef(false);
  useEffect(() => {
    if (!me) return;
    if (activeTab !== "tasks") return;
    if (me.role !== "staff") return;
    if (markingRef.current) return;
    const unseen = tasks.filter((t) => !t.seenBy.includes(me.id));
    if (unseen.length === 0) return;
    markingRef.current = true;
    apiPost<{ id: string }[]>(
      "/api/tasks",
      { action: "seen", taskIds: unseen.map((t) => t.id) }
    )
      .catch((e) => notify((e as Error).message, "err"))
      .finally(() => {
        markingRef.current = false;
      });
  }, [activeTab, tasks, me, apiPost, notify]);

  // Supervisor create form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] =
    useState<"low" | "normal" | "high" | "urgent">("normal");
  const [creating, setCreating] = useState(false);

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [tasks]
  );

  const myUnread = me
    ? tasks.filter((t) => !t.seenBy.includes(me.id)).length
    : 0;

  if (!me) return null;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await apiPost("/api/tasks", {
        action: "create",
        title,
        body,
        priority
      });
      notify("Task created.", "ok");
      setTitle("");
      setBody("");
      setPriority("normal");
    } catch (e) {
      notify((e as Error).message, "err");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await apiPost("/api/tasks", { action: "delete", id });
      notify("Task removed.", "ok");
    } catch (e) {
      notify((e as Error).message, "err");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
      <div className="glass-strong p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
              Daily Tasks
            </div>
            <div className="text-lg font-semibold text-white">
              {sorted.length} task{sorted.length === 1 ? "" : "s"} for you
            </div>
          </div>
          {myUnread > 0 && me.role === "staff" ? (
            <div className="text-xs text-neon-300">
              {myUnread} new — opening this tab marks them as read.
            </div>
          ) : null}
        </div>

        {sorted.length === 0 ? (
          <div className="text-sm text-slate-500 py-10 text-center">
            No tasks assigned. Enjoy the calm.
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                meId={me.id}
                role={me.role}
                onDelete={() => remove(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5">
        {me.role === "supervisor" ? (
          <div className="glass-strong p-6">
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
              New Task
            </div>
            <div className="text-lg font-semibold text-white mb-3">
              Assign to staff
            </div>
            <form className="space-y-3" onSubmit={create}>
              <div>
                <div className="label mb-1">Title</div>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Stock count — Napa 500mg"
                />
              </div>
              <div>
                <div className="label mb-1">Description</div>
                <textarea
                  className="textarea min-h-[100px]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Provide enough detail for the staff to act on it."
                />
              </div>
              <div>
                <div className="label mb-1">Priority</div>
                <select
                  className="select"
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as typeof priority)
                  }
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <button
                className="btn btn-primary w-full"
                disabled={creating || !title.trim()}
              >
                {creating ? "Posting…" : "Post Task"}
              </button>
            </form>
          </div>
        ) : null}

        <div className="glass p-5">
          <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400 mb-1">
            Quick Tip
          </div>
          <div className="text-sm text-slate-300 leading-relaxed">
            As soon as you open the <span className="text-white">Tasks</span> tab,
            every pending task is automatically marked as <span className="text-neon-300">Seen</span>{" "}
            and the notification badge in the sidebar resets to{" "}
            <span className="font-mono text-neon-300">0</span>. Your supervisor
            sees exactly which tasks you&apos;ve acknowledged.
          </div>
          <button
            className="btn btn-ghost w-full mt-3 text-xs"
            onClick={() => setActiveTab("announcements")}
          >
            View announcements →
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  meId,
  role,
  onDelete
}: {
  task: Task;
  meId: string;
  role: "staff" | "supervisor";
  onDelete: () => void;
}) {
  const p = PRIORITY_ACCENT[task.priority];
  const seen = task.seenBy.includes(meId);
  return (
    <div
      className={`rounded-xl border p-4 transition ${
        seen ? "bg-white/3 border-white/5" : "bg-neon-500/5 border-neon-500/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-1 w-2 h-2 rounded-full shrink-0"
          style={{
            background: p.bg,
            boxShadow: seen ? "none" : "0 0 10px rgba(34,232,127,0.6)"
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-semibold text-white">{task.title}</div>
            <span
              className="chip text-[0.62rem]"
              style={{
                background: p.bg,
                color: p.fg,
                borderColor: p.border
              }}
            >
              {p.label}
            </span>
            {!seen ? (
              <span className="chip text-[0.62rem] text-neon-300 border-neon-500/40 bg-neon-500/10">
                New
              </span>
            ) : null}
          </div>
          {task.body ? (
            <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
              {task.body}
            </p>
          ) : null}
          <div className="mt-2 text-[0.7rem] text-slate-500 flex items-center gap-3 flex-wrap">
            <span>By {task.createdBy}</span>
            <span>•</span>
            <span>{fmtDateLong(task.createdAt)}</span>
            <span>•</span>
            <span>{fmtTimeOfDay(task.createdAt)}</span>
            <span>•</span>
            <span>
              {task.seenBy.length} seen
              {task.seenBy.length > 0 ? ` (${task.seenBy.length})` : ""}
            </span>
          </div>
        </div>
        {role === "supervisor" ? (
          <button
            onClick={onDelete}
            className="btn btn-ghost text-xs px-2 py-1"
            title="Delete"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
