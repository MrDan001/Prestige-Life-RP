// PATH: app/api/admin/roles/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { RIGHTS } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

const patch = z.object({
  name: z.string().min(2).max(40).optional(),
  minLevel: z.coerce.number().int().min(1).max(6).optional(),
  maxLevel: z.coerce.number().int().min(1).max(6).optional(),
  extraRights: z.array(z.enum(RIGHTS)).optional(),
  active: z.boolean().optional(),
});

/** Only the owner edits custom roles. Built-in roles are fixed. Rights changes reach everyone holding the role at once. */
export async function PATCH(req: Request, { params }: Ctx) {
  const a = await requireAdmin("MANAGE_STAFF");
  if (a.error) return a.error;
  if (a.actor.kind !== "OWNER") return NextResponse.json({ error: "Only the owner can edit roles" }, { status: 403 });
  const { id } = await params;

  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid details" }, { status: 400 });
  const d = parsed.data;

  const role = await db.role.findUnique({ where: { id } });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role.system) return NextResponse.json({ error: "Built-in roles cannot be changed" }, { status: 403 });

  const min = d.minLevel ?? role.minLevel;
  const max = d.maxLevel ?? role.maxLevel;
  if (min > max) return NextResponse.json({ error: "The lowest level cannot be above the highest" }, { status: 400 });
  if (d.name && (await db.role.findFirst({ where: { name: { equals: d.name, mode: "insensitive" }, NOT: { id } } })))
    return NextResponse.json({ error: "A role with that name already exists" }, { status: 409 });

  if (d.minLevel !== undefined || d.maxLevel !== undefined) {
    const outside = await db.admin.count({ where: { roleId: id, OR: [{ level: { lt: min } }, { level: { gt: max } }] } });
    if (outside) return NextResponse.json({ error: `${outside} people hold this role at a level outside ${min}-${max}. Change their level or role first.` }, { status: 409 });
  }
  if (d.active === false && (await db.admin.count({ where: { roleId: id } })))
    return NextResponse.json({ error: "Move the people who hold this role to another role first" }, { status: 409 });

  const updated = await db.role.update({ where: { id }, data: d });
  await audit(a.actor.id, "ROLE_UPDATE", id, `${role.name}: ${JSON.stringify(d)}`);
  return NextResponse.json(updated);
}