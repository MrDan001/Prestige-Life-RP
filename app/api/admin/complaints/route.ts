// PATH: app/api/admin/complaints/route.ts
import { NextResponse } from "next/server";
import { ComplaintStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { flags, isTop, claimLocked } from "@/lib/permissions";

/**
 * Everyone with site access sees ALL complaints.
 * Returns 15 records per page. Active contains OPEN only; History contains closed records.
 */
export async function GET(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const categoryId = sp.get("categoryId");
  const bucket = sp.get("bucket") === "HISTORY" ? "HISTORY" : "ACTIVE";
  const limit = Math.min(15, Math.max(1, Number.parseInt(sp.get("limit") ?? "15", 10) || 15));
  const offset = Math.max(0, Number.parseInt(sp.get("offset") ?? "0", 10) || 0);
  const allowedStatus: ComplaintStatus[] = bucket === "HISTORY" ? ["RESOLVED", "DISMISSED"] : ["OPEN"];
  const effectiveStatus: ComplaintStatus | null = status && allowedStatus.includes(status as ComplaintStatus) ? status as ComplaintStatus : null;
  const where: Prisma.ComplaintWhereInput = {
    status: effectiveStatus ?? { in: allowedStatus },
    ...(categoryId ? { categoryId } : {}),
  };
  const [rows, total] = await Promise.all([
    db.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit + 1,
      include: {
        player: true,
        category: true,
        accusedAdmin: { select: { id: true, name: true, kind: true, level: true } },
        claimedBy: { select: { id: true, name: true } },
        _count: { select: { responses: true } },
      },
    }),
    db.complaint.count({ where }),
  ]);
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const items = pageRows.map((r) => {
    const permissionFlags = flags(a.actor, r);
    const isClosed = r.status === "RESOLVED" || r.status === "DISMISSED";
    return {
      ...r,
      ...permissionFlags,
      isClosed,
      lockedByClaim: claimLocked(a.actor, r.claimedById),
      canReply: !isClosed && r.claimedById === a.actor.id && permissionFlags.canReply,
      canClose: !isClosed && r.claimedById === a.actor.id && permissionFlags.canClose,
      canReopen: isTop(a.actor),
    };
  });
  return NextResponse.json({ items, hasMore, nextOffset: offset + items.length, total });
}
