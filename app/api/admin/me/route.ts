// PATH: app/api/admin/me/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasRight } from "@/lib/permissions";

export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { admin, actor } = a;
  const passkeyCount = await (await import("@/lib/db")).db.adminPasskey.count({ where: { adminId: admin.id } });
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
    canManageCategories: hasRight(actor, "MANAGE_CATEGORIES"),
    canManageTemplates: hasRight(actor, "MANAGE_TEMPLATES"),
    canManageSite: hasRight(actor, "MANAGE_SITE"),
  });
}