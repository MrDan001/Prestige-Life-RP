// PATH: app/api/admin/templates/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { NEEDS_VERDICT_MSG, PLACEHOLDERS, unknownPlaceholders, usesVerdict } from "@/lib/templates";

type Ctx = { params: Promise<{ id: string }> };

const patch = z.object({
  categoryId: z.string().min(1).nullable().optional(),
  name: z.string().min(2).max(60).optional(),
  verdict: z.enum(["COMPLAINANT", "ACCUSED", "INSUFFICIENT"]).nullable().optional(),
  minLevel: z.coerce.number().int().min(1).max(6).optional(),
  closesAs: z.enum(["RESOLVED", "DISMISSED"]).nullable().optional(),
  body: z.string().min(5).max(4000).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

/** Edit or switch off a judgment. They are never deleted, so old replies keep their history. */
export async function PATCH(req: Request, { params }: Ctx) {
  const a = await requireAdmin("MANAGE_TEMPLATES");
  if (a.error) return a.error;
  const { id } = await params;

  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid details" }, { status: 400 });
  const d = parsed.data;

  const before = await db.responseTemplate.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = d.body ?? before.body;
  const verdict = d.verdict !== undefined ? d.verdict : before.verdict;
  const bad = unknownPlaceholders(body);
  if (bad.length) return NextResponse.json({ error: `Unknown placeholders: ${bad.map((b) => `{${b}}`).join(", ")}. Allowed: ${PLACEHOLDERS.map((p) => `{${p}}`).join(" ")}` }, { status: 400 });
  if (usesVerdict(body) && !verdict) return NextResponse.json({ error: NEEDS_VERDICT_MSG }, { status: 400 });

  const t = await db.responseTemplate.update({ where: { id }, data: d });
  await audit(a.actor.id, "TEMPLATE_UPDATE", id, `${before.name}: ${Object.keys(d).join(", ")}`);
  return NextResponse.json(t);
}