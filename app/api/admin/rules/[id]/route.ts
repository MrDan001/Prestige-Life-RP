import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canManageRules } from "@/lib/permissions";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

const denied = () => NextResponse.json(
  { error: "Only Chief Admin and above can manage community rules" },
  { status: 403 },
);

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  content: z.string().trim().min(1).max(5000).optional(),
}).refine(data => Object.keys(data).length > 0, "Provide a title or rule details.");

export async function PATCH(req: Request, { params }: Ctx) {
  const access = await requireAdmin();
  if (access.error) return access.error;
  if (!canManageRules(access.actor)) return denied();

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid rule details.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const before = await db.rule.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Rule not found." }, { status: 404 });

  const rule = await db.rule.update({ where: { id }, data: parsed.data });
  await audit(access.actor.id, "RULE_UPDATE", id, Object.keys(parsed.data).join(", "));
  revalidatePath("/rules");
  return NextResponse.json(rule);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const access = await requireAdmin();
  if (access.error) return access.error;
  if (!canManageRules(access.actor)) return denied();

  const { id } = await params;
  const before = await db.rule.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Rule not found." }, { status: 404 });

  await db.rule.delete({ where: { id } });
  await audit(access.actor.id, "RULE_DELETE", id, before.title);
  revalidatePath("/rules");
  return NextResponse.json({ ok: true });
}
