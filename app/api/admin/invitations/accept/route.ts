// PATH: app/api/admin/invitations/accept/route.ts
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { COOKIE, createSession } from "@/lib/auth";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { token?: unknown } | null;
  if (typeof body?.token !== "string" || body.token.length < 30 || body.token.length > 200) {
    return NextResponse.json({ error: "This invitation link is invalid" }, { status: 400 });
  }

  const now = new Date();
  const tokenHash = hashToken(body.token);
  const invitation = await db.adminInvitation.findUnique({
    where: { tokenHash },
    include: { admin: true },
  });
  if (!invitation || invitation.usedAt || invitation.revokedAt || invitation.expiresAt <= now) {
    return NextResponse.json({ error: "This invitation is invalid, expired, or has already been used" }, { status: 410 });
  }
  if (invitation.admin.suspended) return NextResponse.json({ error: "This staff account is suspended" }, { status: 403 });

  try {
    const sessionToken = await db.$transaction(async tx => {
      const claimed = await tx.adminInvitation.updateMany({
        where: { id: invitation.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw new Error("INVITATION_ALREADY_CLAIMED");
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await tx.adminSession.create({ data: { id: sessionId, adminId: invitation.adminId, expiresAt } });
      return { sessionId, expiresAt };
    });
    const jwt = await createSession(invitation.adminId).catch(async () => {
      await db.adminSession.deleteMany({ where: { id: sessionToken.sessionId } });
      throw new Error("SESSION_CREATE_FAILED");
    });
    const response = NextResponse.json({ ok: true, name: invitation.admin.name });
    response.cookies.set(COOKIE, jwt, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "This invitation could not be accepted. Request a new link from the owner." }, { status: 409 });
  }
}
