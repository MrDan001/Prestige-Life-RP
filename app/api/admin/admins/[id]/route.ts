// PATH: app/api/admin/admins/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { backfillAccused } from "@/lib/linking";
import { RIGHTS, canAssignLevel, canManageTarget, type Staff } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

const patch = z.object({
  level: z.coerce.number().int().min(1).max(6).optional(),
  title: z.string().max(40).optional(),
  gameId: z.string().max(64).nullable().optional(),
  extraRights: z.array(z.enum(RIGHTS)).optional(),
  kind: z.enum(["OWNER", "TECH", "DEVELOPER", "ADMIN"]).optional(),
});

/** Change a staff member's level, title, game link, extra rights or kind. Every change is logged. */
export async function PATCH(req: Request, { params }: Ctx) {
  const a = await requireAdmin("MANAGE_STAFF");
  if (a.error) return a.error;
  const { id } = await params;

  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid details" }, { status: 400 });
  const d = parsed.data;

  const target = await db.admin.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const t: Staff = { id: target.id, kind: target.kind, level: target.level, extraRights: target.extraRights };

  if (!canManageTarget(a.actor, t)) return NextResponse.json({ error: "You cannot change this person" }, { status: 403 });
  if (d.level !== undefined && !canAssignLevel(a.actor, t, d.level))
    return NextResponse.json({ error: "You cannot award that level" }, { status: 403 });
  if ((d.extraRights || d.kind) && a.actor.kind !== "OWNER")
    return NextResponse.json({ error: "Only the owner can change extra rights or top-tier status" }, { status: 403 });
  if (d.gameId && (await db.admin.findFirst({ where: { gameId: d.gameId, NOT: { id } } })))
    return NextResponse.json({ error: "That game ID is already linked to someone" }, { status: 409 });

  const updated = await db.admin.update({
    where: { id },
    data: d,
    select: { id: true, name: true, title: true, kind: true, level: true, extraRights: true, gameId: true },
  });
  if (d.gameId) await backfillAccused(id, d.gameId);
  await audit(
    a.actor.id,
    "STAFF_UPDATE",
    id,
    `was ${target.kind}/L${target.level}/${target.extraRights.join(",") || "no extras"}; changes ${JSON.stringify(d)}`
  );
  return NextResponse.json(updated);
}