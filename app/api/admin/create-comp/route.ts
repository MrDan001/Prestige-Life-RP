// PATH: app/api/admin/create-comp/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { playerNameSchema } from "@/lib/player-name-schema";

const OWNER_EMAIL = "officialsafebase@gmail.com";
const schema = z.object({
  reporterName: playerNameSchema,
  reporterGameId: z.string().trim().min(1).max(64),
  accusedName: playerNameSchema,
  accusedGameId: z.string().trim().max(64).optional().or(z.literal("")),
  categoryId: z.string().min(1),
  message: z.string().trim().min(20).max(4000),
  evidenceText: z.string().trim().max(4000).optional(),
  evidenceUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  if (auth.admin.email.trim().toLowerCase() !== OWNER_EMAIL)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Complete the required reporter, reported player, category and description fields." }, { status: 400 });

  const d = parsed.data;
  const category = await db.category.findFirst({ where: { id: d.categoryId, active: true } });
  if (!category) return NextResponse.json({ error: "Choose an active complaint category." }, { status: 400 });

  const accusedGameId = d.accusedGameId?.trim() || null;
  const accusedAdmin = accusedGameId
    ? await db.admin.findUnique({ where: { gameId: accusedGameId }, select: { id: true } })
    : null;

  const complaint = await db.$transaction(async tx => {
    const player = await tx.player.upsert({
      where: { gameId: d.reporterGameId },
      update: { username: d.reporterName },
      create: { gameId: d.reporterGameId, username: d.reporterName },
    });
    const created = await tx.complaint.create({
      data: {
        playerId: player.id,
        categoryId: category.id,
        accusedName: d.accusedName,
        accusedGameId,
        accusedAdminId: accusedAdmin?.id ?? null,
        message: d.message,
        status: "OPEN",
      },
    });
    if (d.evidenceText) {
      await tx.evidence.create({ data: { complaintId: created.id, kind: "TEXT", text: d.evidenceText, caption: "Evidence supplied with owner-created complaint" } });
    }
    if (d.evidenceUrl) {
      await tx.evidence.create({ data: { complaintId: created.id, kind: "LINK", url: d.evidenceUrl, caption: "Evidence link supplied with owner-created complaint" } });
    }
    await tx.auditLog.create({
      data: { actorId: auth.actor.id, action: "COMPLAINT_CREATED", targetId: created.id, detail: "Created through the owner complaint form." },
    });
    return created;
  });
  return NextResponse.json({ id: complaint.id, status: complaint.status }, { status: 201 });
}
