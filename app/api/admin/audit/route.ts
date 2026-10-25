// PATH: app/api/admin/audit/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** Audit log: who changed what. For people who manage staff (level 6+ and the top tier). ?action=...&cursor=...&limit=50 */
export async function GET(req: Request) {
  const a = await requireAdmin("MANAGE_STAFF");
  if (a.error) return a.error;

  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Number(sp.get("limit")) || 50, 100);
  const action = sp.get("action");
  const cursor = sp.get("cursor");

  const rows = await db.auditLog.findMany({
    where: action ? { action } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { actor: { select: { name: true } } },
  });
  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1].id : null;

  // Turn target ids into names where we can (staff, categories, templates)
  const ids = [...new Set(page.map((r) => r.targetId).filter((x): x is string => !!x))];
  const [admins, cats, tpls, roles] = await Promise.all([
    db.role.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    db.admin.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    db.category.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    db.responseTemplate.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
  ]);
  const names = new Map<string, string>([...admins, ...cats, ...tpls, ...roles].map((x) => [x.id, x.name]));

  return NextResponse.json({
    items: page.map((r) => ({
      id: r.id,
      at: r.createdAt,
      actor: r.actor.name,
      action: r.action,
      detail: r.detail,
      target: r.targetId ? (names.get(r.targetId) ?? `#${r.targetId.slice(-6).toUpperCase()}`) : null,
    })),
    nextCursor,
  });
}