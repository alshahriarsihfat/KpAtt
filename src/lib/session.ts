import { cookies } from "next/headers";
import { getStaffById } from "./db";
import type { StaffSession } from "./types";

const COOKIE_NAME = "kpatt_session";

/**
 * Returns the session. Does NOT hit the database — the cookie itself
 * carries the staff id, name, and role so the snapshot endpoint can
 * render the dashboard even when the DB is briefly unreachable.
 *
 * Supports two cookie formats for backwards compatibility:
 *  - New (base64-JSON): {id,name,role} encoded
 *  - Legacy (raw id):   just the staff id
 */
export async function getSession(): Promise<StaffSession | null> {
  const c = cookies().get(COOKIE_NAME);
  if (!c?.value) return null;
  const raw = decodeURIComponent(c.value);

  // New format: base64-JSON
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as {
      id: string;
      name: string;
      role: "staff" | "supervisor";
    };
    if (decoded?.id && decoded?.role) {
      return {
        staffId: decoded.id,
        name: decoded.name ?? decoded.id,
        role: decoded.role,
        loggedInAt: new Date().toISOString()
      };
    }
  } catch {
    // fall through to legacy
  }

  // Legacy format: raw staff id. Look it up in the DB so we have a name.
  if (/^[a-z0-9-]+$/i.test(raw)) {
    const profile = await getStaffById(raw);
    if (profile) {
      return {
        staffId: profile.id,
        name: profile.name,
        role: profile.role,
        loggedInAt: new Date().toISOString()
      };
    }
    // Even without a DB hit, accept the id so the user can still enter
    // the app with a cookie that was set in a previous version.
    return {
      staffId: raw,
      name: raw,
      role: "staff",
      loggedInAt: new Date().toISOString()
    };
  }

  return null;
}

export function setSessionCookie(profile: {
  id: string;
  name: string;
  role: "staff" | "supervisor";
}) {
  const value = Buffer.from(
    JSON.stringify({
      id: profile.id,
      name: profile.name,
      role: profile.role
    }),
    "utf8"
  ).toString("base64");
  cookies().set(COOKIE_NAME, encodeURIComponent(value), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12 // 12h shift
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

// Backwards-compat helper for any caller that only knows the staff id.
export async function getSessionProfile(id: string) {
  return await getStaffById(id);
}
