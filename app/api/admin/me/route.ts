// PATH: app/api/admin/me/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasRight } from "@/lib/permissions";

export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { admin, actor } = a;
  return NextResponse.json({
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
  });
}