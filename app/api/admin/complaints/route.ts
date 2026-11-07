// PATH: app/api/admin/complaints/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canAct } from "@/lib/permissions";
import { isPrimaryOwnerAccount } from "@/lib/owner-privacy";

export async function GET(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const sp = new URL(req.url).searchParams;
  const limit = Math.min(50, Math.max(1, Number.parseInt(sp.get("limit") ?? "15", 10) || 15));
  const offset = Math.max(0, Number.parseInt(sp.get("offset") ?? "0", 10) || 0);
  const where: Prisma.ComplaintWhereInput = {};
  const [rows, total] = await Promise.all([
    db.complaint.findMany({
      where, orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: offset, take: limit,
      include: {
        player: true, category: true,
        accusedAdmin: { select: { id: true, name: true, kind: true, level: true } },
        claimedBy: { select: { id: true, name: true } },
      },
    }),
    db.complaint.count({ where }),
  ]);
  const practiceIds = rows.length ? await db.auditLog.findMany({
    where: { targetId: { in: rows.map(r => r.id) }, action: "COMPLAINT_CREATED", detail: { startsWith: "Generated simulation batch" } },
    select: { targetId: true },
  }) : [];
  const practice = new Set(practiceIds.map(x => x.targetId));
  const owner = isPrimaryOwnerAccount(a.admin.id);
  const items = rows.map(r => {
    const isClosed = r.status === "RESOLVED" || r.status === "DISMISSED";
    return {
      ...r, isClosed,
      isPractice: practice.has(r.id),
      canReply: !isClosed && canAct(a.actor, r, "reply"),
      canClose: !isClosed && owner,
      canManageStatus: owner,
    };
  });
  return NextResponse.json({ items, hasMore: offset + items.length < total, nextOffset: offset + items.length, total });
}
