// PATH: app/api/admin/admins/[id]/sessions/revoke/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canManageTarget, type Staff } from "@/lib/permissions";
import { isPrimaryOwnerAccount } from "@/lib/owner-privacy";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const actor = await requireAdmin("MANAGE_STAFF");
  if (actor.error) return actor.error;
  if (actor.actor.kind !== "OWNER") return NextResponse.json({ error: "Only the owner can revoke staff sessions" }, { status: 403 });
  const { id } = await params;
  if (isPrimaryOwnerAccount(id)) return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  const target = await db.admin.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  const staff: Staff = { id: target.id, kind: target.kind, level: target.level, extraRights: target.extraRights };
  if (!canManageTarget(actor.actor, staff)) return NextResponse.json({ error: "You cannot manage this staff account" }, { status: 403 });

  const now = new Date();
  await db.admin.update({ where: { id }, data: { sessionsRevokedAt: now } });
  const result = await db.adminSession.updateMany({
    where: { adminId: id, revokedAt: null },
    data: { revokedAt: now },
  });
  await audit(actor.actor.id, "STAFF_SESSIONS_REVOKE", id, `Revoked ${result.count} active session(s)`);
  return NextResponse.json({ ok: true, revoked: result.count });
}
