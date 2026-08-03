import { NextRequest, NextResponse } from "next/server";
import {
  createTask,
  deleteTask,
  ensureSchema,
  getAllTasks,
  getStaffById,
  markTasksSeen
} from "@/lib/db";
import { getSession } from "@/lib/session";
import { isoNow } from "@/lib/time";
import type { Task } from "@/lib/types";

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
    const tasks = await getAllTasks();
    return NextResponse.json({
      ok: true,
      data: tasks,
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
    await ensureSchema();
    const me = await getStaffById(session.staffId);
    if (!me) {
      return NextResponse.json(
        { ok: false, error: "Profile missing." },
        { status: 404 }
      );
    }
    const body = (await req.json().catch(() => ({}))) as {
      action?: "create" | "delete" | "seen";
      id?: string;
      title?: string;
      body?: string;
      priority?: Task["priority"];
      taskIds?: string[];
    };
    const { action } = body;
    if (!action) {
      return NextResponse.json(
        { ok: false, error: "action required." },
        { status: 400 }
      );
    }

    if (action === "create") {
      if (me.role !== "supervisor") {
        return NextResponse.json(
          { ok: false, error: "Only supervisors can create tasks." },
          { status: 403 }
        );
      }
      if (!body.title?.trim()) {
        return NextResponse.json(
          { ok: false, error: "Title required." },
          { status: 400 }
        );
      }
      const t: Task = {
        id: `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: body.title.trim(),
        body: (body.body ?? "").trim(),
        priority: body.priority ?? "normal",
        createdAt: isoNow(),
        seenBy: [],
        createdBy: me.name
      };
      await createTask(t);
      return NextResponse.json({
        ok: true,
        data: t,
        serverNow: isoNow(),
        version: Date.now()
      });
    }

    if (action === "delete") {
      if (me.role !== "supervisor") {
        return NextResponse.json(
          { ok: false, error: "Only supervisors can delete tasks." },
          { status: 403 }
        );
      }
      if (!body.id) {
        return NextResponse.json(
          { ok: false, error: "id required." },
          { status: 400 }
        );
      }
      await deleteTask(body.id);
      return NextResponse.json({
        ok: true,
        data: { id: body.id },
        serverNow: isoNow(),
        version: Date.now()
      });
    }

    if (action === "seen") {
      if (!body.taskIds || !Array.isArray(body.taskIds)) {
        return NextResponse.json(
          { ok: false, error: "taskIds required." },
          { status: 400 }
        );
      }
      const updated = await markTasksSeen(me.id, body.taskIds);
      return NextResponse.json({
        ok: true,
        data: updated,
        serverNow: isoNow(),
        version: Date.now()
      });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action." },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
