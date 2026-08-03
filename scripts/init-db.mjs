#!/usr/bin/env node
/**
 * Idempotent DB initialiser. Run before first deploy if you want to
 * pre-create the schema and seed data without hitting the live site.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npm run db:init
 *
 * Each DDL is sent as its own statement because the Neon HTTP driver
 * (and the wire protocol) does not allow multiple commands in one
 * prepared statement.
 */
import { neon } from "@neondatabase/serverless";

const SCHEMA_STATEMENTS = [
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

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const sql = neon(url);
for (const stmt of SCHEMA_STATEMENTS) {
  await sql(stmt);
}
console.log("Schema ready. The portal will seed sample data on first request.");
