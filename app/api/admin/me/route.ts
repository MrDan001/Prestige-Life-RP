// PATH: app/api/admin/me/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasRight, canGrantStaffPermissions, canManageRules } from "@/lib/permissions";
import { db } from "@/lib/db";

export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { admin, actor } = a;
  const now = new Date();
  await db.admin.update({ where: { id: admin.id }, data: { lastSeenAt: now } });
  const passkeyCount = await db.adminPasskey.count({ where: { adminId: admin.id } });
  return NextResponse.json({
    hasPasskey: passkeyCount > 0,
    id: admin.id,
    name: admin.name,
    email: admin.email,
    title: admin.title,
    gameId: admin.gameId,
    kind: admin.kind,
    level: admin.level,
    extraRights: admin.extraRights,
    canManageStaff: hasRight(actor, "MANAGE_STAFF"),
    canGrantStaffPermissions: canGrantStaffPermissions(actor),
    canManageCategories: hasRight(actor, "MANAGE_CATEGORIES"),
    canManageTemplates: hasRight(actor, "MANAGE_TEMPLATES"),
    canManageSite: hasRight(actor, "MANAGE_SITE"),
    canManageRules: canManageRules(actor),
  });
}