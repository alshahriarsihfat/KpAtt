# Khan Pharmacy · Staff Portal

A production-ready, dark-themed glassmorphic staff portal for **Khan Pharmacy**, built with **Next.js 14 (App Router) + TypeScript**, deployed on **Vercel**, and backed by a **Neon Postgres** database.

> Live, 1-second real-time sync across every tab & device, four break types, supervisor overrides, tasks with auto-read badges, and a real-time payout calculator.

## ✨ Features

- **Staff Terminal & Punch Clock** — Clock In/Out, four break buttons (Meal, Short, Unpaid, Paid), live digital timer, donut breakdown.
- **Supervisor Control** — Edit any staff's check-in, check-out, every break's duration, base shift & rates, plus *Late Punch* and *On Leave* toggles.
- **Tasks & Announcements** — Live notification badge; tasks auto-mark as *Seen* the moment the user opens the Tasks tab.
- **Financial Ledger** — Real-time payout calculator: `(Total Worked Hours − Total Unpaid Break Hours) × Hourly Rate + (OT Hours × OT Rate)`.
- **1-Second Sync** — `BroadcastChannel` for cross-tab sync + 1-second polling against Neon for cross-device sync.
- **Premium UI** — Dark glassmorphic theme, neon green accents, JetBrains Mono digital clock, procedural SVG donut chart.

## 🚀 Quick Start (Local)

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL
npm run dev
```

Open <http://localhost:3000> and sign in with any of the seeded users:

| Staff ID      | Name                          | Role        | PIN  |
| ------------- | ----------------------------- | ----------- | ---- |
| `sup-rahim`   | Md. Rahim Uddin (Supervisor)  | supervisor  | 9999 |
| `stf-karim`   | Md. Karim Hossain             | staff       | 1234 |
| `stf-jamila`  | Jamila Akter                  | staff       | 2345 |
| `stf-shahid`  | Shahid Iqbal                  | staff       | 3456 |
| `stf-nusrat`  | Nusrat Jahan                  | staff       | 4567 |

> The schema is auto-created and seeded on the first request. You can also run `npm run db:init` to pre-create it.

## ☁️ Deploy to Vercel + Neon

1. **Create a Neon project** at <https://neon.tech> and copy the `DATABASE_URL`.
2. **Import this repo into Vercel** and set the `DATABASE_URL` env var in *Project Settings → Environment Variables*.
3. **Deploy**. The first request to `/` will create the schema and seed users.

## 🏗 Architecture

- **Next.js App Router** with React Server Components for the shell, and client components for the live UI.
- **Strict TypeScript** — every log, action, and user state is typed (`src/lib/types.ts`).
- **Neon serverless driver** (`@neondatabase/serverless`) for HTTP-based queries from the Edge.
- **Real-time sync** — 1-second snapshot polling + `BroadcastChannel` for in-tab updates.
- **Glassmorphism** — `backdrop-blur` cards on a layered radial-gradient background.

## 📁 Project Layout

```
src/
├── app/
│   ├── api/
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   ├── snapshot/route.ts
│   │   ├── clock/route.ts
│   │   ├── supervisor/route.ts
│   │   ├── tasks/route.ts
│   │   └── announcements/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Announcements.tsx
│   ├── Avatar.tsx
│   ├── BigClock.tsx
│   ├── DashboardOverview.tsx
│   ├── Donut.tsx
│   ├── Ledger.tsx
│   ├── Login.tsx
│   ├── Portal.tsx
│   ├── PunchClock.tsx
│   ├── Sidebar.tsx
│   ├── StatusChip.tsx
│   ├── SupervisorPanel.tsx
│   ├── TasksBoard.tsx
│   ├── Toaster.tsx
│   ├── Topbar.tsx
│   └── ui-helpers.ts
└── lib/
    ├── client.ts        # PortalProvider + 1-second sync engine
    ├── db.ts            # Neon-backed repository (auto-schema, seed)
    ├── session.ts       # Cookie-based session
    ├── time.ts          # Clock math, payout formula, live state
    └── types.ts         # Strict domain types
```

## 🧮 Payout Formula

```text
Net Pay = (Total Worked Hours − Total Unpaid Break Hours) × Hourly Rate
        + (Overtime Hours × OT Rate)

where
   Total Worked Hours = (clock_out − clock_in) − Σ(all break durations)
   Overtime Hours     = max(0, Effective Worked Hours − Base Shift Hours)
```

All math is computed live on the server and refreshed every second in the UI.

## 🔐 Security Notes

- This demo uses plaintext PINs for ease of testing. In production, replace the `authenticate` function in `src/lib/db.ts` with a proper Argon2/bcrypt-based flow and add rate limiting.
- The session cookie is `httpOnly` and `sameSite=lax`.

## 📜 License

MIT
