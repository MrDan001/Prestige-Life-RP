// PATH: app/api/admin/templates/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { hasRight } from "@/lib/permissions";
import { PLACEHOLDERS, unknownPlaceholders } from "@/lib/templates";

/** Staff see active templates. Template managers add ?all=1 to also see switched-off ones. */
export async function GET(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const sp = new URL(req.url).searchParams;
  const categoryId = sp.get("categoryId");
  const all = sp.get("all") === "1" && hasRight(a.actor, "MANAGE_TEMPLATES");

  return NextResponse.json(
    await db.responseTemplate.findMany({
      where: { ...(categoryId ? { categoryId } : {}), ...(all ? {} : { active: true }) },
      orderBy: [{ categoryId: "asc" }, { name: "asc" }],
      include: { category: { select: { name: true } } },
    })
  );
}

const schema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(2).max(60),
  verdict: z.enum(["COMPLAINANT", "ACCUSED", "INSUFFICIENT"]).nullable().optional(),
  body: z.string().min(5).max(4000),
});

/** Owner, tech and developers (or anyone given MANAGE_TEMPLATES) add templates. */
export async function POST(req: Request) {
  const a = await requireAdmin("MANAGE_TEMPLATES");
  if (a.error) return a.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Category, name and body required" }, { status: 400 });
  const d = parsed.data;

  const bad = unknownPlaceholders(d.body);
  if (bad.length) return NextResponse.json({ error: `Unknown placeholders: ${bad.map((b) => `{${b}}`).join(", ")}. Allowed: ${PLACEHOLDERS.map((p) => `{${p}}`).join(" ")}` }, { status: 400 });
  if (!(await db.category.findUnique({ where: { id: d.categoryId } }))) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const t = await db.responseTemplate.create({ data: { ...d, verdict: d.verdict ?? null } });
  await audit(a.actor.id, "TEMPLATE_CREATE", t.id, t.name);
  return NextResponse.json(t, { status: 201 });
}