"use client";

import { useState } from "react";
import { usePortal } from "@/lib/client";
import { fmtDateLong, fmtTimeOfDay } from "./ui-helpers";

export function Announcements() {
  const { me, announcements, apiPost, notify } = usePortal();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  if (!me) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await apiPost("/api/announcements", { title, body });
      notify("Announcement posted.", "ok");
      setTitle("");
      setBody("");
    } catch (e) {
      notify((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
      <div className="glass-strong p-6">
        <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
          Announcements
        </div>
        <div className="text-lg font-semibold text-white mb-4">
          Latest from management
        </div>
        {announcements.length === 0 ? (
          <div className="text-sm text-slate-500 py-10 text-center">
            No announcements yet.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-white/8 bg-white/3 p-4"
              >
                <div className="text-sm font-semibold text-white">
                  {a.title}
                </div>
                {a.body ? (
                  <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                    {a.body}
                  </p>
                ) : null}
                <div className="mt-2 text-[0.7rem] text-slate-500 flex items-center gap-3 flex-wrap">
                  <span>By {a.createdBy}</span>
                  <span>•</span>
                  <span>{fmtDateLong(a.createdAt)}</span>
                  <span>•</span>
                  <span>{fmtTimeOfDay(a.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {me.role === "supervisor" ? (
        <div className="glass-strong p-6 h-fit">
          <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
            New Announcement
          </div>
          <div className="text-lg font-semibold text-white mb-3">
            Broadcast to all staff
          </div>
          <form className="space-y-3" onSubmit={submit}>
            <div>
              <div className="label mb-1">Title</div>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Staff meeting Saturday 9:00 AM"
              />
            </div>
            <div>
              <div className="label mb-1">Body</div>
              <textarea
                className="textarea min-h-[100px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What's the news?"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={busy || !title.trim()}
            >
              {busy ? "Posting…" : "Post Announcement"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
