// PATH: app/api/admin/admins/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { backfillAccused } from "@/lib/linking";
import { canAssignLevel, canAssignRole, canManageTarget } from "@/lib/permissions";

export async function GET() {
  const a = await requireAdmin("MANAGE_STAFF");
  if (a.error) return a.error;
  const rows = await db.admin.findMany({
    orderBy: [{ kind: "asc" }, { level: "desc" }],
    select: {
      id: true, email: true, name: true, title: true, kind: true, level: true, extraRights: true, gameId: true, suspended: true,
      roleId: true, role: { select: { name: true, kind: true, minLevel: true, maxLevel: true } },
    },
  });
  // canManage tells the screen which rows this person may edit (the server checks again on every change)
  return NextResponse.json(rows.map((r) => ({ ...r, canManage: canManageTarget(a.actor, r) })));
}

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(60),
  password: z.string().min(10),
  roleId: z.string().min(1).optional(), // preferred: pick a role
  title: z.string().max(40).optional(),
  level: z.coerce.number().int().min(1).max(6).optional(),
  gameId: z.string().max(64).optional(),
  kind: z.enum(["OWNER", "TECH", "DEVELOPER", "ADMIN"]).optional(), // older way, used when no role is sent
});

/** Create a staff account, normally by picking a role. See lib/permissions.ts for who may give which role. */
export async function POST(req: Request) {
  const a = await requireAdmin("MANAGE_STAFF");
  if (a.error) return a.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid details", details: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  let kind = d.kind ?? "ADMIN";
  let level = d.level ?? 1;
  let title = d.title;
  let roleId: string | null = null;

  if (d.roleId) {
    const role = await db.role.findUnique({ where: { id: d.roleId } });
    if (!role || !role.active) return NextResponse.json({ error: "Role not found" }, { status: 400 });
    if (!canAssignRole(a.actor, role)) return NextResponse.json({ error: "You cannot give that role" }, { status: 403 });
    kind = role.kind;
    level = role.kind === "ADMIN" ? (d.level ?? role.minLevel) : 6;
    if (role.kind === "ADMIN" && (level < role.minLevel || level > role.maxLevel))
      return NextResponse.json({ error: `The ${role.name} role needs a level between ${role.minLevel} and ${role.maxLevel}` }, { status: 400 });
    title = title ?? role.name;
    roleId = role.id;
  } else if (kind !== "ADMIN" && a.actor.kind !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can create owner, tech or developer accounts" }, { status: 403 });
  }
  if (kind === "ADMIN" && !canAssignLevel(a.actor, null, level)) return NextResponse.json({ error: "You cannot award that level" }, { status: 403 });

  const email = d.email.toLowerCase();
  if (await db.admin.findUnique({ where: { email } })) return NextResponse.json({ error: "That email already has an account" }, { status: 409 });
  if (d.gameId && (await db.admin.findUnique({ where: { gameId: d.gameId } })))
    return NextResponse.json({ error: "That game ID is already linked to someone" }, { status: 409 });

  const admin = await db.admin.create({
    data: {
      email, name: d.name, passwordHash: await bcrypt.hash(d.password, 12), kind, level, roleId, gameId: d.gameId,
      title: title ?? (kind === "ADMIN" ? "Admin" : kind.charAt(0) + kind.slice(1).toLowerCase()),
    },
    select: { id: true, email: true, name: true, title: true, kind: true, level: true },
  });
  if (d.gameId) await backfillAccused(admin.id, d.gameId);
  await audit(a.actor.id, "STAFF_CREATE", admin.id, `${admin.kind} level ${admin.level}${title ? `, ${title}` : ""}`);
  return NextResponse.json(admin, { status: 201 });
}