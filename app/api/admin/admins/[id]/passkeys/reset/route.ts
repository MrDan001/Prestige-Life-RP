import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canManageTarget, type Staff } from "@/lib/permissions";
import { isPrimaryOwnerAccount } from "@/lib/owner-privacy";

type Ctx = { params: Promise<{ id: string }> };
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(req: Request, { params }: Ctx) {
  const actor = await requireAdmin("MANAGE_STAFF");
  if (actor.error) return actor.error;
  if (actor.actor.kind !== "OWNER") return NextResponse.json({ error: "Only the owner can reset staff passkeys" }, { status: 403 });
  const { id } = await params;
  if (isPrimaryOwnerAccount(id)) return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  const target = await db.admin.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  const staff: Staff = { id: target.id, kind: target.kind, level: target.level, extraRights: target.extraRights };
  if (!canManageTarget(actor.actor, staff)) return NextResponse.json({ error: "You cannot manage this staff account" }, { status: 403 });
  if (target.suspended) return NextResponse.json({ error: "Restore this account before issuing a recovery invitation" }, { status: 409 });

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const invitation = await db.$transaction(async tx => {
    await tx.admin.update({ where: { id }, data: { sessionsRevokedAt: now } });
    await tx.adminSession.updateMany({ where: { adminId: id, revokedAt: null }, data: { revokedAt: now } });
    await tx.adminPasskey.deleteMany({ where: { adminId: id } });
    await tx.adminInvitation.updateMany({ where: { adminId: id, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
    return tx.adminInvitation.create({ data: { adminId: id, tokenHash: hashToken(token), expiresAt, createdById: actor.actor.id }, select: { id: true } });
  });
  await audit(actor.actor.id, "STAFF_PASSKEY_RESET", id, "All passkeys and active sessions revoked; recovery invitation issued.");
  return NextResponse.json({
    invitationId: invitation.id,
    invitationUrl: `${new URL(req.url).origin}/invite/${token}`,
    expiresAt: expiresAt.toISOString(),
    note: "All registered passkeys and active sessions were revoked. Share this one-use recovery invitation privately.",
  });
}
