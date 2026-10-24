// PATH: app/api/game/responses/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isGameServer, unauthorized } from "@/lib/auth";

/** Game server pulls admin replies it has not delivered yet. */
export async function GET(req: Request) {
  if (!isGameServer(req)) return unauthorized();

  const rows = await db.response.findMany({
    where: { syncedToGame: false },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { complaint: { include: { player: true } }, admin: { select: { name: true } } },
  });
  return NextResponse.json(
    rows.map((r) => ({
      responseId: r.id,
      complaintId: r.complaintId,
      playerGameId: r.complaint.player.gameId,
      complaintStatus: r.complaint.status,
      verdict: r.complaint.verdict,
      adminName: r.admin.name,
      message: r.message,
      createdAt: r.createdAt,
    }))
  );
}

/** Game server confirms delivery: body { "ids": ["responseId", ...] } */
export async function POST(req: Request) {
  if (!isGameServer(req)) return unauthorized();
  const parsed = z.object({ ids: z.array(z.string()).min(1).max(100) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ids required" }, { status: 400 });

  const { count } = await db.response.updateMany({ where: { id: { in: parsed.data.ids } }, data: { syncedToGame: true } });
  return NextResponse.json({ marked: count });
}