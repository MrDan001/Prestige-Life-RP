// PATH: app/api/admin/admins/[id]/invite/route.ts
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
  const { id } = await params;
  if (isPrimaryOwnerAccount(id)) return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  const target = await db.admin.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  const staff: Staff = { id: target.id, kind: target.kind, level: target.level, extraRights: target.extraRights };
  if (!canManageTarget(actor.actor, staff)) return NextResponse.json({ error: "You cannot manage this staff account" }, { status: 403 });
  if (target.suspended) return NextResponse.json({ error: "Restore this staff account before inviting them" }, { status: 409 });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const invitation = await db.$transaction(async tx => {
    await tx.adminInvitation.updateMany({ where: { adminId: id, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    return tx.adminInvitation.create({ data: { adminId: id, tokenHash: hashToken(token), expiresAt, createdById: actor.actor.id }, select: { id: true } });
  });
  await audit(actor.actor.id, "STAFF_INVITE_ISSUE", id, `Invitation expires ${expiresAt.toISOString()}`);
  return NextResponse.json({
    invitationId: invitation.id,
    invitationUrl: `${new URL(req.url).origin}/invite/${token}`,
    expiresAt: expiresAt.toISOString(),
    note: "Copy this private link now. It is shown only once and is not emailed automatically.",
  });
}
