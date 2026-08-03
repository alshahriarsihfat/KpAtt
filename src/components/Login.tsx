"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePortal } from "@/lib/client";

interface Profile {
  id: string;
  name: string;
  role: "staff" | "supervisor";
  designation: string;
  avatarHue: number;
}

const SEED_PROFILES: Profile[] = [
  {
    id: "sup-rahim",
    name: "Md. Rahim Uddin (Supervisor)",
    role: "supervisor",
    designation: "Senior Pharmacist & Supervisor",
    avatarHue: 150
  },
  {
    id: "stf-karim",
    name: "Md. Karim Hossain",
    role: "staff",
    designation: "Pharmacist",
    avatarHue: 200
  },
  {
    id: "stf-jamila",
    name: "Jamila Akter",
    role: "staff",
    designation: "Senior Sales Associate",
    avatarHue: 290
  },
  {
    id: "stf-shahid",
    name: "Shahid Iqbal",
    role: "staff",
    designation: "Inventory Assistant",
    avatarHue: 30
  },
  {
    id: "stf-nusrat",
    name: "Nusrat Jahan",
    role: "staff",
    designation: "Cashier",
    avatarHue: 330
  }
];

const DEFAULT_PINS: Record<string, string> = {
  "sup-rahim": "9999",
  "stf-karim": "1234",
  "stf-jamila": "2345",
  "stf-shahid": "3456",
  "stf-nusrat": "4567"
};

export function Login() {
  const router = useRouter();
  const { apiPost, notify, refresh } = usePortal();
  const [selected, setSelected] = useState<Profile>(SEED_PROFILES[1]);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>(SEED_PROFILES);

  // Lightweight server health probe so users can see whether the
  // backend is reachable before they try to sign in.
  const [serverHealth, setServerHealth] = useState<
    | { state: "checking" }
    | { state: "ok"; tables: number; staffCount: number }
    | { state: "degraded"; hasEnv: boolean; dbOk: boolean; error: string }
  >({ state: "checking" });

  useEffect(() => {
    setPin(DEFAULT_PINS[selected.id] ?? "");
  }, [selected]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        const j = (await r.json()) as {
          hasEnv: boolean;
          dbOk: boolean;
          dbError: string | null;
          tables: string[];
          staffCount: number;
        };
        if (cancelled) return;
        if (j.dbOk) {
          setServerHealth({
            state: "ok",
            tables: j.tables.length,
            staffCount: j.staffCount
          });
        } else {
          setServerHealth({
            state: "degraded",
            hasEnv: j.hasEnv,
            dbOk: false,
            error: j.dbError ?? "Database unreachable"
          });
        }
      } catch (e) {
        if (cancelled) return;
        setServerHealth({
          state: "degraded",
          hasEnv: false,
          dbOk: false,
          error: (e as Error).message
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await apiPost<{ id: string; name: string; role: "staff" | "supervisor" }>(
        "/api/login",
        {
          staffId: selected.id,
          pin
        }
      );
      notify("Welcome back!", "ok");
      // Re-fetch the full snapshot — the cookie has been set, so the
      // server will now return the dashboard payload. This sets `me`,
      // `staff`, `attendance`, etc. in one go, and the Portal
      // component re-renders into the dashboard.
      await refresh();
      router.replace("/");
    } catch (e) {
      const msg = (e as Error).message || "Login failed";
      setErr(msg);
      notify(msg, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-20 w-[40rem] h-[40rem] rounded-full bg-neon-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 w-[40rem] h-[40rem] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-strong p-8 md:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #22e87f 0%, #10d977 100%)",
                  boxShadow: "0 0 20px rgba(34,232,127,0.45)"
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
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Khan Pharmacy
                </div>
                <div className="text-lg font-semibold text-white">
                  Staff Portal
                </div>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-white mb-2">
              Sign in to <span className="neon-text">your shift</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-md">
              Punch in, manage your breaks, see daily tasks and watch your
              payout grow in real time. Supervisors can adjust any staff
              record with full audit trail.
            </p>

            <ul className="mt-8 space-y-3 text-sm text-slate-300">
              {[
                "1-second real-time sync across every tab & device",
                "Four break types with auto enforcement",
                "Live payout calculator with overtime",
                "Supervisor override & manual adjustment"
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="chip-dot" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 text-[0.7rem] uppercase tracking-[0.18em] text-slate-500">
            v1.0 · {new Date().getFullYear()} · Built for Khan Pharmacy
          </div>
        </div>

        <div className="glass p-8 md:p-10">
          <form onSubmit={submit} className="space-y-6">
            <div>
              <div className="label mb-3">Choose a profile</div>
              <div className="grid grid-cols-1 gap-2.5 max-h-72 overflow-auto pr-1">
                {profiles.map((p) => {
                  const isSel = p.id === selected.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelected(p)}
                      className={`text-left p-3 rounded-xl border transition flex items-center gap-3 ${
                        isSel
                          ? "border-neon-500/60 bg-neon-500/5 glow"
                          : "border-white/8 bg-white/3 hover:bg-white/5"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white"
                        style={{
                          background: `linear-gradient(135deg, hsl(${p.avatarHue} 70% 30%), hsl(${
                            (p.avatarHue + 40) % 360
                          } 80% 22%))`
                        }}
                      >
                        {p.name
                          .replace(/\(Supervisor\)/i, "")
                          .trim()
                          .split(" ")[0]
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          {p.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {p.designation}
                        </div>
                      </div>
                      {p.role === "supervisor" ? (
                        <span className="chip text-[0.65rem]">
                          Supervisor
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="label mb-2">PIN</div>
              <input
                className="input clock-mono tracking-widest text-lg"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                autoFocus
              />
              <div className="text-[0.7rem] text-slate-500 mt-1.5">
                Seed PINs are pre-filled. In production these are private.
              </div>
            </div>

            {err ? (
              <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                {err}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy || !pin}
              className="btn btn-primary w-full"
            >
              {busy ? "Signing in…" : "Sign in to portal"}
            </button>
          </form>

          <ServerHealthPill health={serverHealth} />
        </div>
      </div>
    </div>
  );
}

function ServerHealthPill({
  health
}: {
  health:
    | { state: "checking" }
    | { state: "ok"; tables: number; staffCount: number }
    | { state: "degraded"; hasEnv: boolean; dbOk: boolean; error: string };
}) {
  if (health.state === "checking") {
    return (
      <div className="mt-4 flex items-center gap-2 text-[0.7rem] text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
        Checking server…
      </div>
    );
  }
  if (health.state === "ok") {
    return (
      <div className="mt-4 flex items-center gap-2 text-[0.7rem] text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-neon-400" />
        Connected · {health.tables} tables · {health.staffCount} staff loaded
      </div>
    );
  }
  return (
    <div className="mt-4 flex items-start gap-2 text-[0.7rem] text-rose-300">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5" />
      <div>
        <div className="font-semibold">
          {health.hasEnv
            ? "Database unreachable"
            : "DATABASE_URL not set on server"}
        </div>
        <div className="text-rose-400/70 mt-0.5">{health.error}</div>
      </div>
    </div>
  );
}
