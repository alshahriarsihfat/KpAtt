import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasEnv = Boolean(process.env.DATABASE_URL);
  let dbOk = false;
  let dbError: string | null = null;
  let tables: string[] = [];
  let staffCount = 0;

  if (hasEnv) {
    try {
      const sql = neon(process.env.DATABASE_URL as string);
      await sql("SELECT 1");
      dbOk = true;
      const t = (await sql(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
      )) as Array<{ tablename: string }>;
      tables = t.map((r) => r.tablename);
      const s = (await sql(
        `SELECT count(*)::int AS n FROM staff`
      )) as Array<{ n: number }>;
      staffCount = s[0]?.n ?? 0;
    } catch (e) {
      dbError = (e as Error).message;
    }
  }

  return NextResponse.json({
    ok: true,
    hasEnv,
    dbOk,
    dbError,
    tables,
    staffCount,
    now: new Date().toISOString()
  });
}
