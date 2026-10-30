// PATH: lib/auth.ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Admin } from "@prisma/client";
import { db } from "@/lib/db";
import { canAccessSite, hasRight, type Right, type Staff } from "@/lib/permissions";

const secret = () => {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not configured");
  return new TextEncoder().encode(value);
};
export const COOKIE = "session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

/** Every new cookie is registered server-side so it can be revoked before its JWT expires. */
export async function createSession(adminId: string) {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db.adminSession.create({ data: { id, adminId, expiresAt } });
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setJti(id)
    .setExpirationTime("30d")
    .sign(secret());
}

async function getSessionIdentity(): Promise<{ adminId: string; sessionId: string | null; issuedAt: Date | null } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = (await jwtVerify(token, secret())).payload;
    if (!payload.sub) return null;
    return { adminId: payload.sub, sessionId: typeof payload.jti === "string" ? payload.jti : null, issuedAt: typeof payload.iat === "number" ? new Date(payload.iat * 1000) : null };
  } catch {
    return null;
  }
}

export async function revokeCurrentSession() {
  const identity = await getSessionIdentity();
  if (identity?.sessionId) {
    await db.adminSession.updateMany({
      where: { id: identity.sessionId, adminId: identity.adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

type Ok = { error?: undefined; actor: Staff; admin: Admin };
type Fail = { error: NextResponse; actor?: undefined; admin?: undefined };

/** Loads staff and session state from the database on every request. */
export async function requireAdmin(right?: Right): Promise<Ok | Fail> {
  const identity = await getSessionIdentity();
  if (!identity) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };

  // Legacy 8-hour JWTs are accepted during the cutover only; all newly issued sessions are revocable.
  if (identity.sessionId) {
    const session = await db.adminSession.findUnique({ where: { id: identity.sessionId } });
    if (!session || session.adminId !== identity.adminId || session.revokedAt || session.expiresAt <= new Date()) {
      return { error: NextResponse.json({ error: "Session expired or revoked" }, { status: 401 }) };
    }
  }

  const admin = await db.admin.findUnique({
    where: { id: identity.adminId },
    include: { role: { select: { extraRights: true } } },
  });
  if (!admin) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  if (admin.suspended) return { error: NextResponse.json({ error: "This account is suspended" }, { status: 403 }) };
  if (admin.sessionsRevokedAt && (!identity.issuedAt || identity.issuedAt.getTime() < Math.floor(admin.sessionsRevokedAt.getTime() / 1000) * 1000)) {
    return { error: NextResponse.json({ error: "This session has been revoked. Accept a fresh staff invitation." }, { status: 401 }) };
  }

  const actor: Staff = {
    id: admin.id,
    kind: admin.kind,
    level: admin.level,
    extraRights: [...new Set([...admin.extraRights, ...(admin.role?.extraRights ?? [])])],
  };
  if (!canAccessSite(actor))
    return { error: NextResponse.json({ error: "Your rank does not have website access" }, { status: 403 }) };
  if (right && !hasRight(actor, right))
    return { error: NextResponse.json({ error: "You do not have the right to do this" }, { status: 403 }) };
  return { actor, admin };
}

/** Checks the game server's API key header. */
export function isGameServer(req: Request) {
  const given = Buffer.from(req.headers.get("x-game-key") ?? "");
  const real = Buffer.from(process.env.GAME_API_KEY ?? "");
  return given.length > 0 && given.length === real.length && timingSafeEqual(given, real);
}

export const unauthorized = () => NextResponse.json({ error: "Invalid game key" }, { status: 401 });
