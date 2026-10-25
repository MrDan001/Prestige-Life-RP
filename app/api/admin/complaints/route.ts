// PATH: app/api/admin/complaints/route.ts
import { NextResponse } from "next/server";
import { ComplaintStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { flags } from "@/lib/permissions";

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

  const rows = await db.complaint.findMany({
    where: {
      ...(status && status in ComplaintStatus ? { status: status as ComplaintStatus } : {}),
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
  return NextResponse.json(rows.map((r) => ({ ...r, ...flags(a.actor, r) })));
}