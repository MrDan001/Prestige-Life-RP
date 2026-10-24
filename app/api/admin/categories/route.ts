// PATH: app/api/admin/categories/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

/** Any staff with site access can see the categories and their required levels. */
export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  return NextResponse.json(await db.category.findMany({ orderBy: { name: "asc" } }));
}

const schema = z.object({
  name: z.string().min(2).max(40),
  minReplyLevel: z.coerce.number().int().min(1).max(6),
  minCloseLevel: z.coerce.number().int().min(1).max(6),
});

/** Owner, tech and developers (or anyone given MANAGE_CATEGORIES) add categories. */
export async function POST(req: Request) {
  const a = await requireAdmin("MANAGE_CATEGORIES");
  if (a.error) return a.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Name, minReplyLevel and minCloseLevel (1-6) required" }, { status: 400 });

  const name = parsed.data.name.trim();
  if (await db.category.findFirst({ where: { name: { equals: name, mode: "insensitive" } } }))
    return NextResponse.json({ error: "That category already exists" }, { status: 409 });

  const cat = await db.category.create({ data: { ...parsed.data, name } });
  await audit(a.actor.id, "CATEGORY_CREATE", cat.id, `${cat.name} reply>=${cat.minReplyLevel} close>=${cat.minCloseLevel}`);
  return NextResponse.json(cat, { status: 201 });
}