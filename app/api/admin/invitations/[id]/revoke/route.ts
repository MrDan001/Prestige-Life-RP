// PATH: app/api/admin/invitations/[id]/revoke/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canManageTarget, type Staff } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const actor = await requireAdmin("MANAGE_STAFF");
  if (actor.error) return actor.error;
  const { id } = await params;
  const invitation = await db.adminInvitation.findUnique({ where: { id } });
  if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  if (invitation.usedAt) return NextResponse.json({ error: "This invitation has already been used" }, { status: 409 });

  const target = await db.admin.findUnique({
    where: { id: invitation.adminId },
    select: { id: true, kind: true, level: true, extraRights: true },
  });
  if (!target) return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  const staff: Staff = { ...target, kind: target.kind as Staff["kind"] };
  if (!canManageTarget(actor.actor, staff))
    return NextResponse.json({ error: "You cannot revoke invitations for this staff account" }, { status: 403 });
  await db.adminInvitation.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(actor.actor.id, "STAFF_INVITE_REVOKE", invitation.adminId, `Invitation ${id} revoked`);
  return NextResponse.json({ ok: true });
}
