// PATH: app/api/admin/complaints/[id]/draft/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canAct, canUseTemplate } from "@/lib/permissions";
import { render, usesVerdict, verdictVars, type Verdict } from "@/lib/templates";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ templateId: z.string().min(1), verdict: z.enum(["COMPLAINANT", "ACCUSED", "INSUFFICIENT"]).optional() });

/** Fills a judgment for this complaint. Returns text the admin can edit before sending. Saves nothing. */
export async function POST(req: Request, { params }: Ctx) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "templateId required" }, { status: 400 });

  const c = await db.complaint.findUnique({
    where: { id },
    include: { player: true, category: true, accusedAdmin: { select: { id: true, name: true, kind: true, level: true } } },
  });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAct(a.actor, c, "reply")) return NextResponse.json({ error: "You cannot act on this complaint" }, { status: 403 });

  const t = await db.responseTemplate.findUnique({ where: { id: parsed.data.templateId } });
  if (!t || !t.active) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  if (t.categoryId && t.categoryId !== c.categoryId) return NextResponse.json({ error: "That template is for another category" }, { status: 400 });
  if (!canUseTemplate(a.actor, t)) return NextResponse.json({ error: "Your level cannot issue this judgment" }, { status: 403 });

  const chosen = (parsed.data.verdict ?? c.verdict) as Verdict | null;
  if (t.verdict && chosen && t.verdict !== chosen) return NextResponse.json({ error: "That template is for a different verdict" }, { status: 400 });
  const effective = (t.verdict as Verdict | null) ?? chosen;
  if (usesVerdict(t.body) && !effective) return NextResponse.json({ error: "This template needs a verdict. Ask tech to attach one." }, { status: 400 });

  const complainant = c.player.username;
  const accused = c.accusedAdmin?.name ?? c.accusedName ?? "the accused player";
  const vars: Record<string, string> = {
    complainant,
    accused,
    category: c.category.name,
    admin: a.admin.name,
    complaint_id: `#${c.id.slice(-6).toUpperCase()}`,
    date: new Date().toISOString().slice(0, 10),
    ...(effective ? verdictVars(effective, complainant, accused) : {}),
  };
  return NextResponse.json({ text: render(t.body, vars) });
}