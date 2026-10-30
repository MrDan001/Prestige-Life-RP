// PATH: lib/auth.ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import type { Admin } from "@prisma/client";
import { db } from "@/lib/db";
import { canAccessSite, hasRight, type Right, type Staff } from "@/lib/permissions";

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET!);
export const COOKIE = "session";

export async function createSession(adminId: string) {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(adminId).setExpirationTime("30d").sign(secret());
}

async function getSessionId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, secret())).payload.sub ?? null;
  } catch {
    return null;
  }
}

type Ok = { error?: undefined; actor: Staff; admin: Admin };
type Fail = { error: NextResponse; actor?: undefined; admin?: undefined };

/** Loads the signed-in staff member fresh from the database, so rank changes apply immediately. */
export async function requireAdmin(right?: Right): Promise<Ok | Fail> {
  const id = await getSessionId();
  const admin = id ? await db.admin.findUnique({ where: { id }, include: { role: { select: { extraRights: true } } } }) : null;
  if (!admin) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };

  if (admin.suspended) return { error: NextResponse.json({ error: "This account is suspended" }, { status: 403 }) };

  const actor: Staff = { id: admin.id, kind: admin.kind, level: admin.level, extraRights: [...new Set([...admin.extraRights, ...(admin.role?.extraRights ?? [])])] };
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