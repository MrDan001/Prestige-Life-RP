import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canManageRules } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { ensureRuleStorage } from "@/lib/rules";

const ruleSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(5000),
});

const denied = () => NextResponse.json(
  { error: "Only Chief Admin and above can manage community rules" },
  { status: 403 },
);

export async function GET() {
  const access = await requireAdmin();
  if (access.error) return access.error;
  if (!canManageRules(access.actor)) return denied();

  await ensureRuleStorage();
  const rules = await db.rule.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const access = await requireAdmin();
  if (access.error) return access.error;
  if (!canManageRules(access.actor)) return denied();

  await ensureRuleStorage();
  const parsed = ruleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a title and rule details (up to 5,000 characters)." }, { status: 400 });
  }

  const last = await db.rule.aggregate({ _max: { sortOrder: true } });
  const rule = await db.rule.create({
    data: { ...parsed.data, sortOrder: (last._max.sortOrder ?? -1) + 1 },
  });
  await audit(access.actor.id, "RULE_CREATE", rule.id, rule.title);
  revalidatePath("/rules");
  return NextResponse.json(rule, { status: 201 });
}
