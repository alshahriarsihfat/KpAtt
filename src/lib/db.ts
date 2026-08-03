import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  type Announcement,
  type AttendanceLog,
  type StaffProfile,
  type Task
} from "./types";

type Sql = NeonQueryFunction<false, false>;
type Row<T> = T;

/**
 * Lightweight Neon-backed repository. All public methods return JSON-friendly
 * shapes so they can be used from both server components and route handlers
 * running on Vercel (Edge or Node).
 *
 * Tables are auto-created on first request (idempotent) so the app works
 * the moment a fresh Neon database is wired up via DATABASE_URL.
 *
 * NOTE: @neondatabase/serverless uses the HTTP "extended query" protocol,
 * which forbids batching multiple SQL statements in a single call
 * ("cannot insert multiple commands into a prepared statement"). Every
 * statement below is therefore executed individually.
 */

const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS app_meta (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS staff (
     id TEXT PRIMARY KEY,
     payload JSONB NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS attendance (
     id TEXT PRIMARY KEY,
     staff_id TEXT NOT NULL,
     date TEXT NOT NULL,
     payload JSONB NOT NULL,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_staff_date
     ON attendance (staff_id, date)`,
  `CREATE TABLE IF NOT EXISTS tasks (
     id TEXT PRIMARY KEY,
     payload JSONB NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS announcements (
     id TEXT PRIMARY KEY,
     payload JSONB NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`
];

const SEED_VERSION = "v1";

let cachedSql: NeonQueryFunction<false, false> | null = null;
let schemaPromise: Promise<void> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (cachedSql) return cachedSql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not configured. Set it in your Vercel project env to point to a Neon database."
    );
  }
  cachedSql = neon(url);
  return cachedSql;
}

export async function ensureSchema(): Promise<void> {
  // Reuse an in-flight or successful attempt; if a previous attempt
  // rejected, clear the cache and retry on the next call.
  if (schemaPromise) {
    try {
      await schemaPromise;
    } catch {
      schemaPromise = null;
      // fall through to retry
    }
    if (schemaPromise) return schemaPromise;
  }
  schemaPromise = (async () => {
    const sql = getSql();
    // Execute each DDL statement individually — the Neon HTTP driver
    // does not support multi-statement prepared statements.
    for (const stmt of SCHEMA_STATEMENTS) {
      await sql(stmt);
    }
    const seeded = (await sql(
      `SELECT value FROM app_meta WHERE key = 'seed_version'`
    )) as Array<{ value: string }>;
    if (seeded.length === 0) {
      await runSeed();
      await sql(
        `INSERT INTO app_meta (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [SEED_VERSION, SEED_VERSION]
      );
    }
  })();
  return schemaPromise;
}

async function runSeed(): Promise<void> {
  const sql = getSql();
  const now = new Date().toISOString();

  const staff: StaffProfile[] = [
    {
      id: "sup-rahim",
      name: "Md. Rahim Uddin (Supervisor)",
      role: "supervisor",
      pin: "9999",
      designation: "Senior Pharmacist & Supervisor",
      baseShiftHours: 8,
      hourlyRate: 350,
      otRate: 525,
      avatarHue: 150,
      createdAt: now
    },
    {
      id: "stf-karim",
      name: "Md. Karim Hossain",
      role: "staff",
      pin: "1234",
      designation: "Pharmacist",
      baseShiftHours: 8,
      hourlyRate: 280,
      otRate: 420,
      avatarHue: 200,
      createdAt: now
    },
    {
      id: "stf-jamila",
      name: "Jamila Akter",
      role: "staff",
      pin: "2345",
      designation: "Senior Sales Associate",
      baseShiftHours: 8,
      hourlyRate: 220,
      otRate: 330,
      avatarHue: 290,
      createdAt: now
    },
    {
      id: "stf-shahid",
      name: "Shahid Iqbal",
      role: "staff",
      pin: "3456",
      designation: "Inventory Assistant",
      baseShiftHours: 8,
      hourlyRate: 200,
      otRate: 300,
      avatarHue: 30,
      createdAt: now
    },
    {
      id: "stf-nusrat",
      name: "Nusrat Jahan",
      role: "staff",
      pin: "4567",
      designation: "Cashier",
      baseShiftHours: 8,
      hourlyRate: 210,
      otRate: 315,
      avatarHue: 330,
      createdAt: now
    }
  ];

  for (const s of staff) {
    await sql(
      `INSERT INTO staff (id, payload) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [s.id, JSON.stringify(s)]
    );
  }

  // Seed today's attendance rows so the staff have a working context.
  const today = new Date();
  const dateStr = formatDateLocal(today);
  for (const s of staff.filter((x) => x.role === "staff")) {
    const id = `${s.id}-${dateStr}`;
    const log: AttendanceLog = {
      id,
      staffId: s.id,
      date: dateStr,
      checkInAt: null,
      checkOutAt: null,
      breaks: [],
      latePunch: false,
      onLeave: false,
      manuallyAdjusted: false,
      updatedAt: now
    };
    await sql(
      `INSERT INTO attendance (id, staff_id, date, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [id, s.id, dateStr, JSON.stringify(log)]
    );
  }

  const tasks: Task[] = [
    {
      id: "tsk-001",
      title: "Stock count — Napa 500mg",
      body: "Reconcile the physical count of Napa 500mg strip with the ledger. Submit a variance report before close-of-business.",
      priority: "high",
      createdAt: now,
      seenBy: [],
      createdBy: "Md. Rahim Uddin (Supervisor)"
    },
    {
      id: "tsk-002",
      title: "Restock front shelf — Seclo 20mg",
      body: "Pull a fresh carton from the back and ensure the front shelf has at least 24 strips of Seclo 20mg before the evening rush.",
      priority: "normal",
      createdAt: now,
      seenBy: [],
      createdBy: "Md. Rahim Uddin (Supervisor)"
    },
    {
      id: "tsk-003",
      title: "Verify prescription for Mr. Rahman",
      body: "Cross-check the doctor's seal and registration number on the held prescription before releasing the antibiotics.",
      priority: "urgent",
      createdAt: now,
      seenBy: [],
      createdBy: "Md. Rahim Uddin (Supervisor)"
    },
    {
      id: "tsk-004",
      title: "Submit daily Z-report",
      body: "Print and file the daily Z-report from the POS terminal and hand it to the supervisor on duty.",
      priority: "normal",
      createdAt: now,
      seenBy: [],
      createdBy: "Md. Rahim Uddin (Supervisor)"
    }
  ];
  for (const t of tasks) {
    await sql(
      `INSERT INTO tasks (id, payload) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [t.id, JSON.stringify(t)]
    );
  }

  const ann: Announcement[] = [
    {
      id: "ann-001",
      title: "Staff Meeting — Saturday 9:00 AM",
      body: "Mandatory staff briefing this Saturday. Attendance is required for all on-duty pharmacists and sales associates.",
      createdAt: now,
      createdBy: "Md. Rahim Uddin (Supervisor)"
    },
    {
      id: "ann-002",
      title: "New cold-chain SOP",
      body: "Refrigerator temperature must be logged every 4 hours. The new binder is at the front counter — please initial after reading.",
      createdAt: now,
      createdBy: "Md. Rahim Uddin (Supervisor)"
    }
  ];
  for (const a of ann) {
    await sql(
      `INSERT INTO announcements (id, payload) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [a.id, JSON.stringify(a)]
    );
  }
}

export function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------- staff ----------

export async function getAllStaff(): Promise<StaffProfile[]> {
  const sql = getSql();
  const rows = (await sql(
    `SELECT payload FROM staff ORDER BY role DESC, name`
  )) as Array<{ payload: StaffProfile }>;
  return rows.map((r) => r.payload);
}

export async function getStaffById(
  id: string
): Promise<StaffProfile | null> {
  const sql = getSql();
  const rows = (await sql(
    `SELECT payload FROM staff WHERE id = $1 LIMIT 1`,
    [id]
  )) as Array<{ payload: StaffProfile }>;
  return rows[0]?.payload ?? null;
}

export async function authenticate(
  id: string,
  pin: string
): Promise<StaffProfile | null> {
  const profile = await getStaffById(id);
  if (!profile) return null;
  if (profile.pin !== pin) return null;
  return profile;
}

export async function updateStaffProfile(
  id: string,
  patch: Partial<StaffProfile>
): Promise<StaffProfile | null> {
  const sql = getSql();
  const current = await getStaffById(id);
  if (!current) return null;
  const next: StaffProfile = { ...current, ...patch, id: current.id };
  await sql(
    `UPDATE staff SET payload = $1 WHERE id = $2`,
    [JSON.stringify(next), id]
  );
  return next;
}

// ---------- attendance ----------

export async function getAllAttendance(): Promise<AttendanceLog[]> {
  const sql = getSql();
  const rows = (await sql(
    `SELECT payload FROM attendance ORDER BY date DESC`
  )) as Array<{ payload: AttendanceLog }>;
  return rows.map((r) => r.payload);
}

export async function getAttendanceFor(
  staffId: string,
  date: string
): Promise<AttendanceLog | null> {
  const sql = getSql();
  const id = `${staffId}-${date}`;
  const rows = (await sql(
    `SELECT payload FROM attendance WHERE id = $1 LIMIT 1`,
    [id]
  )) as Array<{ payload: AttendanceLog }>;
  return rows[0]?.payload ?? null;
}

/**
 * Atomic compare-and-swap upsert. The payload is written only if the
 * caller's `expectedUpdatedAt` matches the row's current `updated_at`,
 * preventing lost updates from concurrent requests. The new row is
 * returned, or `null` if there was a conflict.
 */
export async function upsertAttendanceCAS(
  log: AttendanceLog,
  expectedUpdatedAt: string | null
): Promise<{ log: AttendanceLog; conflict: boolean }> {
  const sql = getSql();
  const next: AttendanceLog = { ...log, updatedAt: new Date().toISOString() };
  if (expectedUpdatedAt == null) {
    // Insert only — fail if already exists
    const rows = (await sql(
      `INSERT INTO attendance (id, staff_id, date, payload, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (id) DO NOTHING
       RETURNING payload`,
      [next.id, next.staffId, next.date, JSON.stringify(next)]
    )) as Array<{ payload: AttendanceLog }>;
    if (rows.length === 0) {
      return { log, conflict: true };
    }
    return { log: rows[0].payload, conflict: false };
  }
  // Optimistic update
  const rows = (await sql(
    `UPDATE attendance
       SET payload = $1, staff_id = $2, date = $3, updated_at = now()
     WHERE id = $4 AND updated_at = $5
     RETURNING payload`,
    [
      JSON.stringify(next),
      next.staffId,
      next.date,
      next.id,
      expectedUpdatedAt
    ]
  )) as Array<{ payload: AttendanceLog }>;
  if (rows.length === 0) {
    return { log, conflict: true };
  }
  return { log: rows[0].payload, conflict: false };
}

export async function upsertAttendance(
  log: AttendanceLog
): Promise<AttendanceLog> {
  const sql = getSql();
  const next: AttendanceLog = { ...log, updatedAt: new Date().toISOString() };
  await sql(
    `INSERT INTO attendance (id, staff_id, date, payload, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (id) DO UPDATE SET
       payload = EXCLUDED.payload,
       staff_id = EXCLUDED.staff_id,
       date = EXCLUDED.date,
       updated_at = now()`,
    [next.id, next.staffId, next.date, JSON.stringify(next)]
  );
  return next;
}

// ---------- tasks ----------

export async function getAllTasks(): Promise<Task[]> {
  const sql = getSql();
  const rows = (await sql(
    `SELECT payload FROM tasks ORDER BY created_at DESC`
  )) as Array<{ payload: Task }>;
  return rows.map((r) => r.payload);
}

export async function createTask(t: Task): Promise<Task> {
  const sql = getSql();
  await sql(
    `INSERT INTO tasks (id, payload) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
    [t.id, JSON.stringify(t)]
  );
  return t;
}

export async function deleteTask(id: string): Promise<void> {
  const sql = getSql();
  await sql(`DELETE FROM tasks WHERE id = $1`, [id]);
}

export async function markTasksSeen(
  staffId: string,
  taskIds: string[]
): Promise<Task[]> {
  if (taskIds.length === 0) return [];
  const sql = getSql();
  // Single SELECT to pull all candidate tasks at once.
  const placeholders = taskIds.map((_, i) => `$${i + 1}`).join(",");
  const rows = (await sql(
    `SELECT id, payload FROM tasks WHERE id IN (${placeholders})`,
    taskIds
  )) as Array<{ id: string; payload: Task }>;
  const updated: Task[] = [];
  for (const r of rows) {
    const t = r.payload;
    if (!t || t.seenBy.includes(staffId)) continue;
    t.seenBy = [...t.seenBy, staffId];
    await sql(`UPDATE tasks SET payload = $1 WHERE id = $2`, [
      JSON.stringify(t),
      r.id
    ]);
    updated.push(t);
  }
  return updated;
}

// ---------- announcements ----------

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const sql = getSql();
  const rows = (await sql(
    `SELECT payload FROM announcements ORDER BY created_at DESC`
  )) as Array<{ payload: Announcement }>;
  return rows.map((r) => r.payload);
}

export async function createAnnouncement(a: Announcement): Promise<Announcement> {
  const sql = getSql();
  await sql(
    `INSERT INTO announcements (id, payload) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
    [a.id, JSON.stringify(a)]
  );
  return a;
}
