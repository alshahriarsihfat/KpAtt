-- =====================================================================
-- Khan Pharmacy Staff Portal — Neon DB schema (paste-and-run)
-- =====================================================================
-- Run this in the Neon SQL Editor (https://console.neon.tech → SQL Editor)
-- OR via:  psql "$DATABASE_URL" -f neon-schema.sql
--
-- It is safe to re-run: every statement uses IF NOT EXISTS.
-- The app also creates these tables automatically on the first request
-- (see src/lib/db.ts → ensureSchema), so this file is only needed if
-- you want to pre-create them, or if you want a clean reset.
-- =====================================================================

CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id         TEXT PRIMARY KEY,
  staff_id   TEXT NOT NULL,
  date       TEXT NOT NULL,
  payload    JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_staff_date
  ON attendance (staff_id, date);

CREATE TABLE IF NOT EXISTS tasks (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- Optional: sample data (1 supervisor + 4 staff + 4 tasks + 2 announcements)
-- The app seeds these automatically on first login if app_meta is empty.
-- Uncomment the INSERTs below to seed them manually.
-- =====================================================================

/*
INSERT INTO staff (id, payload) VALUES
  ('sup-rahim', '{
    "id":"sup-rahim","name":"Md. Rahim Uddin (Supervisor)","role":"supervisor",
    "pin":"9999","designation":"Senior Pharmacist & Supervisor",
    "baseShiftHours":8,"hourlyRate":350,"otRate":525,"avatarHue":150,
    "createdAt":"2026-01-01T00:00:00.000Z"
  }'::jsonb),
  ('stf-karim', '{
    "id":"stf-karim","name":"Md. Karim Hossain","role":"staff",
    "pin":"1234","designation":"Pharmacist",
    "baseShiftHours":8,"hourlyRate":280,"otRate":420,"avatarHue":200,
    "createdAt":"2026-01-01T00:00:00.000Z"
  }'::jsonb),
  ('stf-jamila', '{
    "id":"stf-jamila","name":"Jamila Akter","role":"staff",
    "pin":"2345","designation":"Senior Sales Associate",
    "baseShiftHours":8,"hourlyRate":220,"otRate":330,"avatarHue":290,
    "createdAt":"2026-01-01T00:00:00.000Z"
  }'::jsonb),
  ('stf-shahid', '{
    "id":"stf-shahid","name":"Shahid Iqbal","role":"staff",
    "pin":"3456","designation":"Inventory Assistant",
    "baseShiftHours":8,"hourlyRate":200,"otRate":300,"avatarHue":30,
    "createdAt":"2026-01-01T00:00:00.000Z"
  }'::jsonb),
  ('stf-nusrat', '{
    "id":"stf-nusrat","name":"Nusrat Jahan","role":"staff",
    "pin":"4567","designation":"Cashier",
    "baseShiftHours":8,"hourlyRate":210,"otRate":315,"avatarHue":330,
    "createdAt":"2026-01-01T00:00:00.000Z"
  }'::jsonb)
ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload;

INSERT INTO app_meta (key, value) VALUES ('seed_version', 'v1')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
*/
