// PATH: app/api/admin/categories/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

const patch = z.object({
  name: z.string().min(2).max(40).optional(),
  minReplyLevel: z.coerce.number().int().min(1).max(6).optional(),
  minCloseLevel: z.coerce.number().int().min(1).max(6).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const a = await requireAdmin("MANAGE_CATEGORIES");
  if (a.error) return a.error;
  const { id } = await params;

  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid details" }, { status: 400 });

  const before = await db.category.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (parsed.data.name && (await db.category.findFirst({ where: { name: { equals: parsed.data.name, mode: "insensitive" }, NOT: { id } } })))
    return NextResponse.json({ error: "That category already exists" }, { status: 409 });

  const cat = await db.category.update({ where: { id }, data: parsed.data });
  await audit(a.actor.id, "CATEGORY_UPDATE", id, `${before.name}: ${JSON.stringify(parsed.data)}`);
  return NextResponse.json(cat);
}