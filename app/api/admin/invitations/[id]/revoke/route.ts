// PATH: app/api/admin/invitations/[id]/revoke/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const actor = await requireAdmin("MANAGE_STAFF");
  if (actor.error) return actor.error;
  if (actor.actor.kind !== "OWNER") return NextResponse.json({ error: "Only the owner can revoke invitations" }, { status: 403 });
  const { id } = await params;
  const invitation = await db.adminInvitation.findUnique({ where: { id } });
  if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  if (invitation.usedAt) return NextResponse.json({ error: "This invitation has already been used" }, { status: 409 });
  await db.adminInvitation.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(actor.actor.id, "STAFF_INVITE_REVOKE", invitation.adminId, `Invitation ${id} revoked`);
  return NextResponse.json({ ok: true });
}
