import { NextRequest, NextResponse } from "next/server";
import { authenticate, ensureSchema } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "DATABASE_URL is not set on the server. Add it in Vercel → Project Settings → Environment Variables, then redeploy."
      },
      { status: 500 }
    );
  }
  try {
    await ensureSchema();
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `Database connection failed: ${(err as Error).message}. Check that DATABASE_URL is correct and the Neon database is awake.`
      },
      { status: 500 }
    );
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      staffId?: string;
      pin?: string;
    };
    const { staffId, pin } = body;
    if (!staffId || !pin) {
      return NextResponse.json(
        { ok: false, error: "Staff ID and PIN are required." },
        { status: 400 }
      );
    }
    const profile = await authenticate(staffId.trim(), pin.trim());
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials." },
        { status: 401 }
      );
    }
    setSessionCookie({
      id: profile.id,
      name: profile.name,
      role: profile.role
    });
    return NextResponse.json({
      ok: true,
      data: { id: profile.id, name: profile.name, role: profile.role }
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
