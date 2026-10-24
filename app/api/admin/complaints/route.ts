// PATH: app/api/admin/complaints/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ComplaintStatus } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const categoryId = searchParams.get("categoryId");

  const rows = await db.complaint.findMany({
    where: {
      ...(status ? { status: status as ComplaintStatus } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      category: true,
      claimedBy: { select: { name: true } },
      evidence: true,
      responses: { include: { admin: { select: { name: true } } } },
      notes: { include: { admin: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = rows.map((c: any) => ({
    id: c.id,
    caseNumber: c.caseNumber,
    discordId: c.player?.gameId || c.playerId,
    username: c.player?.username || "Unknown",
    accused: c.accusedName || "None",
    category: c.category.name,
    categoryId: c.categoryId,
    status: c.status,
    verdict: c.verdict,
    assigned: c.claimedBy ? c.claimedBy.name : null,
    assignedId: c.claimedById,
    createdAt: c.createdAt,
    evidence: c.evidence,
    history: [
      ...c.responses.map((r: any) => ({ type: "reply", at: r.createdAt, by: r.admin.name, text: r.message, delivered: r.syncedToGame })),
      ...c.notes.map((n: any) => ({ type: "note", at: n.createdAt, by: n.admin.name, text: n.message, delivered: false })),
    ].sort((a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime()),
  }));

  return NextResponse.json(formatted);
}