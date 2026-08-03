import { NextRequest, NextResponse } from "next/server";
import {
  createAnnouncement,
  ensureSchema,
  getAllAnnouncements,
  getStaffById
} from "@/lib/db";
import { getSession } from "@/lib/session";
import { isoNow } from "@/lib/time";
import type { Announcement } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 }
      );
    }
    await ensureSchema();
    const list = await getAllAnnouncements();
    return NextResponse.json({
      ok: true,
      data: list,
      serverNow: isoNow(),
      version: Date.now()
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 }
      );
    }
    const me = await getStaffById(session.staffId);
    if (!me || me.role !== "supervisor") {
      return NextResponse.json(
        { ok: false, error: "Supervisor privilege required." },
        { status: 403 }
      );
    }
    await ensureSchema();
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      body?: string;
    };
    if (!body.title?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Title required." },
        { status: 400 }
      );
    }
    const a: Announcement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: body.title.trim(),
      body: (body.body ?? "").trim(),
      createdAt: isoNow(),
      createdBy: me.name
    };
    await createAnnouncement(a);
    return NextResponse.json({
      ok: true,
      data: a,
      serverNow: isoNow(),
      version: Date.now()
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
