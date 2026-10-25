// PATH: app/api/admin/templates/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canUseTemplate, hasRight } from "@/lib/permissions";
import { NEEDS_VERDICT_MSG, PLACEHOLDERS, unknownPlaceholders, usesVerdict } from "@/lib/templates";

/**
 * Staff get the active judgments for a complaint category (?categoryId=): ones for that category plus the all-category ones.
 * Each has canUse for the signed-in person. Template managers add ?all=1 to see everything, switched-off ones too.
 */
export async function GET(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const sp = new URL(req.url).searchParams;
  const categoryId = sp.get("categoryId");
  const all = sp.get("all") === "1" && hasRight(a.actor, "MANAGE_TEMPLATES");

  const rows = await db.responseTemplate.findMany({
    where: { ...(categoryId ? { OR: [{ categoryId }, { categoryId: null }] } : {}), ...(all ? {} : { active: true }) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { category: { select: { name: true } } },
  });
  return NextResponse.json(rows.map((t) => ({ ...t, canUse: canUseTemplate(a.actor, t) })));
}

const schema = z.object({
  categoryId: z.string().min(1).nullable().optional(), // empty = every category
  name: z.string().min(2).max(60),
  verdict: z.enum(["COMPLAINANT", "ACCUSED", "INSUFFICIENT"]).nullable().optional(),
  minLevel: z.coerce.number().int().min(1).max(6).default(3),
  closesAs: z.enum(["RESOLVED", "DISMISSED"]).nullable().optional(),
  body: z.string().min(5).max(4000),
});

/** Owner, tech and developers (or anyone given MANAGE_TEMPLATES) add judgments. */
export async function POST(req: Request) {
  const a = await requireAdmin("MANAGE_TEMPLATES");
  if (a.error) return a.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Name and text required" }, { status: 400 });
  const d = parsed.data;

  const bad = unknownPlaceholders(d.body);
  if (bad.length) return NextResponse.json({ error: `Unknown placeholders: ${bad.map((b) => `{${b}}`).join(", ")}. Allowed: ${PLACEHOLDERS.map((p) => `{${p}}`).join(" ")}` }, { status: 400 });
  if (usesVerdict(d.body) && !d.verdict) return NextResponse.json({ error: NEEDS_VERDICT_MSG }, { status: 400 });
  if (d.categoryId && !(await db.category.findUnique({ where: { id: d.categoryId } }))) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const last = await db.responseTemplate.aggregate({ _max: { sortOrder: true } });
  const t = await db.responseTemplate.create({
    data: { ...d, categoryId: d.categoryId ?? null, verdict: d.verdict ?? null, closesAs: d.closesAs ?? null, sortOrder: (last._max.sortOrder ?? 0) + 1 },
  });
  await audit(a.actor.id, "TEMPLATE_CREATE", t.id, t.name);
  return NextResponse.json(t, { status: 201 });
}