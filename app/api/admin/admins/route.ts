// PATH: app/api/admin/admins/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { backfillAccused } from "@/lib/linking";
import { canAssignLevel } from "@/lib/permissions";

export async function GET() {
  const a = await requireAdmin("MANAGE_STAFF");
  if (a.error) return a.error;
  return NextResponse.json(
    await db.admin.findMany({
      orderBy: [{ kind: "asc" }, { level: "desc" }],
      select: { id: true, email: true, name: true, title: true, kind: true, level: true, extraRights: true, gameId: true },
    })
  );
}

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(60),
  password: z.string().min(10),
  title: z.string().max(40).optional(),
  level: z.coerce.number().int().min(1).max(6).default(1),
  gameId: z.string().max(64).optional(),
  kind: z.enum(["OWNER", "TECH", "DEVELOPER", "ADMIN"]).default("ADMIN"),
});

/** Create a staff account. Deputy chief+ may create levels up to 5; only the owner creates top-tier accounts. */
export async function POST(req: Request) {
  const a = await requireAdmin("MANAGE_STAFF");
  if (a.error) return a.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid details", details: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  if (d.kind !== "ADMIN" && a.actor.kind !== "OWNER")
    return NextResponse.json({ error: "Only the owner can create owner, tech or developer accounts" }, { status: 403 });
  if (d.kind === "ADMIN" && !canAssignLevel(a.actor, null, d.level))
    return NextResponse.json({ error: "You cannot award that level" }, { status: 403 });

  const email = d.email.toLowerCase();
  if (await db.admin.findUnique({ where: { email } })) return NextResponse.json({ error: "That email already has an account" }, { status: 409 });
  if (d.gameId && (await db.admin.findUnique({ where: { gameId: d.gameId } })))
    return NextResponse.json({ error: "That game ID is already linked to someone" }, { status: 409 });

  const admin = await db.admin.create({
    data: {
      email,
      name: d.name,
      title: d.title ?? (d.kind === "ADMIN" ? "Admin" : d.kind.charAt(0) + d.kind.slice(1).toLowerCase()),
      passwordHash: await bcrypt.hash(d.password, 12),
      kind: d.kind,
      level: d.kind === "ADMIN" ? d.level : 6,
      gameId: d.gameId,
    },
    select: { id: true, email: true, name: true, title: true, kind: true, level: true },
  });
  if (d.gameId) await backfillAccused(admin.id, d.gameId);
  await audit(a.actor.id, "STAFF_CREATE", admin.id, `${admin.kind} level ${admin.level}`);
  return NextResponse.json(admin, { status: 201 });
}