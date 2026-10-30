// PATH: app/api/admin/complaints/route.ts
import { NextResponse } from "next/server";
import { ComplaintStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { flags, isTop } from "@/lib/permissions";

/**
 * Everyone with site access sees ALL complaints.
 * Filters: ?status=OPEN  ?categoryId=...  ?claimed=me|none
 */
export async function GET(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const categoryId = sp.get("categoryId");
  const claimed = sp.get("claimed");
  const bucket = sp.get("bucket") === "HISTORY" ? "HISTORY" : "ACTIVE";
  const requestedStatus = status && status in ComplaintStatus ? status as ComplaintStatus : null;
  const allowedStatus = bucket === "HISTORY" ? ["RESOLVED", "DISMISSED"] : ["OPEN", "IN_REVIEW"];
  const effectiveStatus = requestedStatus && allowedStatus.includes(requestedStatus)
    ? requestedStatus
    : null;

  const rows = await db.complaint.findMany({
    where: {
      status: effectiveStatus
        ? effectiveStatus
        : { in: allowedStatus as ComplaintStatus[] },
      ...(categoryId ? { categoryId } : {}),
      ...(claimed === "me" ? { claimedById: a.actor.id } : claimed === "none" ? { claimedById: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      player: true,
      category: true,
      accusedAdmin: { select: { id: true, name: true, kind: true, level: true } },
      claimedBy: { select: { id: true, name: true } },
      _count: { select: { responses: true } },
    },
  });
  return NextResponse.json(rows.map((r) => {
    const permissionFlags = flags(a.actor, r);
    const isClosed = r.status === "RESOLVED" || r.status === "DISMISSED";
    return {
      ...r,
      ...permissionFlags,
      isClosed,
      canReply: !isClosed && permissionFlags.canReply,
      canClose: !isClosed && permissionFlags.canClose,
      canReopen: isTop(a.actor),
    };
  }));
}