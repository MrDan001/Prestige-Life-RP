// PATH: app/api/admin/invitations/accept/route.ts
import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { COOKIE } from "@/lib/auth";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const secret = () => {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not configured");
  return new TextEncoder().encode(value);
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { token?: unknown } | null;
  if (typeof body?.token !== "string" || body.token.length < 30 || body.token.length > 200) {
    return NextResponse.json({ error: "This invitation link is invalid" }, { status: 400 });
  }

  const now = new Date();
  const invitation = await db.adminInvitation.findUnique({
    where: { tokenHash: hashToken(body.token) },
    include: { admin: true },
  });
  if (!invitation || invitation.usedAt || invitation.revokedAt || invitation.expiresAt <= now) {
    return NextResponse.json({ error: "This invitation is invalid, expired, or has already been used" }, { status: 410 });
  }
  if (invitation.admin.suspended) return NextResponse.json({ error: "This staff account is suspended" }, { status: 403 });

  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  try {
    await db.$transaction(async tx => {
      const current = await tx.admin.findUnique({ where: { id: invitation.adminId }, select: { suspended: true } });
      if (!current || current.suspended) throw new Error("STAFF_SUSPENDED");
      const claimed = await tx.adminInvitation.updateMany({
        where: { id: invitation.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw new Error("INVITATION_ALREADY_CLAIMED");
      await tx.adminSession.create({ data: { id: sessionId, adminId: invitation.adminId, expiresAt } });
    });
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(invitation.adminId)
      .setJti(sessionId)
      .setExpirationTime("30d")
      .sign(secret());
    const response = NextResponse.json({ ok: true, name: invitation.admin.name });
    response.cookies.set(COOKIE, jwt, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    await db.adminSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
    return NextResponse.json({ error: "This invitation could not be accepted. Request a new link from the owner." }, { status: 409 });
  }
}
