"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import type {
  Announcement,
  AttendanceLog,
  DashboardSnapshot,
  LiveState,
  StaffProfile,
  Task
} from "./types";

interface Ctx {
  ready: boolean;
  me: StaffProfile | null;
  staff: StaffProfile[];
  attendance: AttendanceLog[];
  tasks: Task[];
  announcements: Announcement[];
  live: Record<string, LiveState>;
  serverNow: string;
  version: number;
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  refresh: () => Promise<void>;
  apiPost: <T = unknown>(path: string, body?: unknown) => Promise<T>;
  notify: (msg: string, tone?: "info" | "ok" | "err") => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  /** Are we currently online & synced? */
  syncState: "live" | "polling" | "offline";
  lastSyncedAt: number;
}

export type TabKey =
  | "dashboard"
  | "punch"
  | "tasks"
  | "supervisor"
  | "ledger"
  | "announcements";

export interface Toast {
  id: string;
  text: string;
  tone: "info" | "ok" | "err";
}

const CtxObj = createContext<Ctx | null>(null);

const SYNC_CHANNEL = "kpatt-sync-v1";
const POLL_MS = 1000; // 1-second sync
const TOAST_TTL_MS = 3500;
const FIRST_LOAD_TIMEOUT_MS = 4000;

export function PortalProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<StaffProfile | null>(null);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [live, setLive] = useState<Record<string, LiveState>>({});
  const [serverNow, setServerNow] = useState<string>(new Date().toISOString());
  const [version, setVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [syncState, setSyncState] = useState<"live" | "polling" | "offline">(
    "polling"
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(Date.now());

  const lastVersionRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const applySnapshot = useCallback((snap: DashboardSnapshot) => {
    setMe(snap.me);
    setStaff(snap.staff);
    setAttendance(snap.attendance);
    setTasks(snap.tasks);
    setAnnouncements(snap.announcements);
    setLive(snap.live);
    setServerNow(snap.serverNow);
    lastVersionRef.current = snap.version;
    setVersion(snap.version);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    // Coalesce concurrent callers: if a refresh is in flight, return that
    // same promise instead of firing another request.
    if (inFlightRef.current) return inFlightRef.current;
    const p = (async () => {
      try {
        const res = await fetch("/api/snapshot", { cache: "no-store" });
        if (res.status === 401) {
          setMe(null);
          setReady(true);
          return;
        }
        if (!res.ok) {
          console.error(`[kpatt] snapshot ${res.status}`);
          setMe(null);
          setReady(true);
          setSyncState("offline");
          return;
        }
        const json = (await res.json()) as
          | { ok: true; data: DashboardSnapshot }
          | { ok: false; error: string };
        if (!json.ok) {
          console.error("[kpatt] snapshot error", json.error);
          setMe(null);
          setReady(true);
          setSyncState("offline");
          return;
        }
        applySnapshot(json.data);
        setReady(true);
        setLastSyncedAt(Date.now());
        setSyncState("polling");
      } catch (err) {
        console.error("[kpatt] snapshot failed", err);
        setMe(null);
        setReady(true);
        setSyncState("offline");
      }
    })();
    inFlightRef.current = p;
    try {
      await p;
    } finally {
      inFlightRef.current = null;
    }
  }, [applySnapshot]);

  const apiPost = useCallback(async <T = unknown,>(
    path: string,
    body?: unknown
  ): Promise<T> => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {})
    });
    const json = (await res.json()) as
      | { ok: true; data: T; version?: number; serverNow?: string }
      | { ok: false; error: string };
    if (!json.ok) throw new Error(json.error);
    if (json.version != null && json.serverNow) {
      lastVersionRef.current = json.version;
      setVersion(json.version);
      setServerNow(json.serverNow);
      setLastSyncedAt(Date.now());
    }
    return json.data;
  }, []);

  const notify = useCallback(
    (text: string, tone: Toast["tone"] = "info") => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((t) => [...t, { id, text, tone }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, TOAST_TTL_MS);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // Initial load with a hard timeout safety net so the splash can never
  // hang forever if the API is unreachable.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setMe(null);
      setReady(true);
      setSyncState("offline");
    }, FIRST_LOAD_TIMEOUT_MS);
    void refresh();
    return () => clearTimeout(timeout);
    // refresh is stable (useCallback with stable deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling for cross-device 1-second sync
  useEffect(() => {
    const t = setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  // Cross-tab sync via BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined")
      return;
    const ch = new BroadcastChannel(SYNC_CHANNEL);
    channelRef.current = ch;
    ch.onmessage = (ev) => {
      const data = ev.data as
        | { type: "tick"; version: number }
        | { type: "tab"; tab: TabKey }
        | undefined;
      if (!data) return;
      if (data.type === "tick" && data.version > lastVersionRef.current) {
        void refresh();
      } else if (data.type === "tab") {
        setActiveTab(data.tab);
      }
    };
    setSyncState("live");
    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [refresh]);

  // Broadcast local changes when version updates
  useEffect(() => {
    if (!channelRef.current) return;
    if (version > 0) {
      channelRef.current.postMessage({ type: "tick", version });
    }
  }, [version]);

  const setTabAndBroadcast = useCallback((t: TabKey) => {
    setActiveTab(t);
    if (channelRef.current) {
      channelRef.current.postMessage({ type: "tab", tab: t });
    }
  }, []);

  const value: Ctx = useMemo(
    () => ({
      ready,
      me,
      staff,
      attendance,
      tasks,
      announcements,
      live,
      serverNow,
      version,
      activeTab,
      setActiveTab: setTabAndBroadcast,
      refresh,
      apiPost,
      notify,
      toasts,
      dismissToast,
      syncState,
      lastSyncedAt
    }),
    [
      ready,
      me,
      staff,
      attendance,
      tasks,
      announcements,
      live,
      serverNow,
      version,
      activeTab,
      setTabAndBroadcast,
      refresh,
      apiPost,
      notify,
      toasts,
      dismissToast,
      syncState,
      lastSyncedAt
    ]
  );

  return <CtxObj.Provider value={value}>{children}</CtxObj.Provider>;
}

export function usePortal(): Ctx {
  const v = useContext(CtxObj);
  if (!v) throw new Error("usePortal must be used inside <PortalProvider>");
  return v;
}

/** Hook: smooth 1Hz tick aligned to the local second boundary. */
export function useSecondTick(): number {
  const [tick, setTick] = useState<number>(Date.now());
  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | null = null;
    const loop = () => {
      setTick(Date.now());
      const ms = 1000 - (Date.now() % 1000);
      id = setTimeout(loop, ms);
    };
    id = setTimeout(loop, 1000 - (Date.now() % 1000));
    return () => {
      if (id) clearTimeout(id);
    };
  }, []);
  return tick;
}
