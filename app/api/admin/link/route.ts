// PATH: app/api/admin/link/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { backfillAccused } from "@/lib/linking";

const schema = z.object({ code: z.string().min(4).max(20) });

/** Signed-in staff links their own account using a code issued by the game. */
export async function POST(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const code = parsed.data.code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const lc = await db.linkCode.findUnique({ where: { code } });
  if (!lc || lc.usedAt || lc.expiresAt < new Date()) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  if (a.admin.gameId) return NextResponse.json({ error: "Your account is already linked. Unlink it first." }, { status: 409 });
  if (await db.admin.findUnique({ where: { gameId: lc.gameId } }))
    return NextResponse.json({ error: "That game account is already linked to another staff member" }, { status: 409 });

  const claimed = await db.linkCode.updateMany({ where: { id: lc.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count === 0) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  await db.admin.update({ where: { id: a.actor.id }, data: { gameId: lc.gameId } });
  await backfillAccused(a.actor.id, lc.gameId);
  await audit(a.actor.id, "STAFF_LINK", a.actor.id, `linked game ID ${lc.gameId}`);
  return NextResponse.json({ gameId: lc.gameId, username: lc.username });
}

/** Staff unlinks their own game account. (Others with MANAGE_STAFF use PATCH /api/admin/admins/[id].) */
export async function DELETE() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  if (!a.admin.gameId) return NextResponse.json({ error: "Not linked" }, { status: 400 });
  await db.admin.update({ where: { id: a.actor.id }, data: { gameId: null } });
  await audit(a.actor.id, "STAFF_UNLINK", a.actor.id, `unlinked game ID ${a.admin.gameId}`);
  return NextResponse.json({ ok: true });
}