// PATH: app/api/game/complaints/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isGameServer, unauthorized } from "@/lib/auth";
import { evidenceItem } from "@/lib/evidence";

const schema = z.object({
  gameId: z.string().min(1).max(64),
  username: z.string().min(1).max(64),
  accusedName: z.string().max(64).optional(),
  accusedGameId: z.string().max(64).optional(), // lets the website know if the accused is staff
  category: z.string().min(1).max(40), // must match an active category name
  message: z.string().min(5).max(2000),
  evidence: z.array(evidenceItem).max(10).optional(), // links or chat-log text; send files to /evidence
});

/** Game server submits a complaint on behalf of a player. */
export async function POST(req: Request) {
  if (!isGameServer(req)) return unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid complaint", details: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const category = await db.category.findFirst({ where: { name: { equals: d.category, mode: "insensitive" }, active: true } });
  if (!category) {
    const names = (await db.category.findMany({ where: { active: true }, select: { name: true } })).map((c) => c.name);
    return NextResponse.json({ error: "Unknown category", validCategories: names }, { status: 400 });
  }

  const accused = d.accusedGameId ? await db.admin.findUnique({ where: { gameId: d.accusedGameId }, select: { id: true } }) : null;
  const player = await db.player.upsert({
    where: { gameId: d.gameId },
    update: { username: d.username },
    create: { gameId: d.gameId, username: d.username },
  });
  const complaint = await db.complaint.create({
    data: {
      playerId: player.id,
      categoryId: category.id,
      accusedName: d.accusedName,
      accusedGameId: d.accusedGameId,
      accusedAdminId: accused?.id,
      message: d.message,
    },
  });
  if (d.evidence?.length)
    await db.evidence.createMany({ data: d.evidence.map((e) => ({ complaintId: complaint.id, kind: e.kind, url: e.url, text: e.text, caption: e.caption })) });
  return NextResponse.json({ id: complaint.id, status: complaint.status }, { status: 201 });
}

/** Game server checks a player's own complaints: GET /api/game/complaints?gameId=123 */
export async function GET(req: Request) {
  if (!isGameServer(req)) return unauthorized();
  const gameId = new URL(req.url).searchParams.get("gameId");
  if (!gameId) return NextResponse.json({ error: "gameId required" }, { status: 400 });

  const complaints = await db.complaint.findMany({
    where: { player: { gameId } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      verdict: true,
      createdAt: true,
      category: { select: { name: true } },
      responses: { select: { message: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json(complaints);
}