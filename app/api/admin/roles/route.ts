// PATH: app/api/admin/roles/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { RIGHTS, canAssignRole } from "@/lib/permissions";

/** Roles, for the Staff screen and the Roles screen. assignable = whether you may give that role. */
export async function GET() {
  const a = await requireAdmin("MANAGE_STAFF");
  if (a.error) return a.error;
  const roles = await db.role.findMany({ include: { _count: { select: { admins: true } } } });
  roles.sort((x, y) => Number(x.kind !== "ADMIN") - Number(y.kind !== "ADMIN") || x.minLevel - y.minLevel || x.name.localeCompare(y.name));
  return NextResponse.json(roles.map((r) => ({ ...r, assignable: r.active && canAssignRole(a.actor, r) })));
}

const schema = z
  .object({
    name: z.string().min(2).max(40),
    minLevel: z.coerce.number().int().min(1).max(6),
    maxLevel: z.coerce.number().int().min(1).max(6),
    extraRights: z.array(z.enum(RIGHTS)).default([]),
  })
  .refine((r) => r.minLevel <= r.maxLevel, "The lowest level cannot be above the highest");

/** Only the owner creates roles. */
export async function POST(req: Request) {
  const a = await requireAdmin("MANAGE_STAFF");
  if (a.error) return a.error;
  if (a.actor.kind !== "OWNER") return NextResponse.json({ error: "Only the owner can create roles" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Name, lowest level and highest level (1-6) required" }, { status: 400 });
  const name = parsed.data.name.trim();
  if (await db.role.findFirst({ where: { name: { equals: name, mode: "insensitive" } } }))
    return NextResponse.json({ error: "A role with that name already exists" }, { status: 409 });

  const role = await db.role.create({ data: { ...parsed.data, name, kind: "ADMIN", system: false } });
  await audit(a.actor.id, "ROLE_CREATE", role.id, `${role.name} levels ${role.minLevel}-${role.maxLevel}${role.extraRights.length ? ` + ${role.extraRights.join(",")}` : ""}`);
  return NextResponse.json(role, { status: 201 });
}