import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canManageRules } from "@/lib/permissions";
import { audit } from "@/lib/audit";

const denied = () => NextResponse.json(
  { error: "Only Chief Admin and above can manage community rules" },
  { status: 403 },
);

const schema = z.object({
  orderedIds: z.array(z.string().min(1)).max(1000),
});

export async function PUT(req: Request) {
  const access = await requireAdmin();
  if (access.error) return access.error;
  if (!canManageRules(access.actor)) return denied();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid rule order." }, { status: 400 });

  const orderedIds = parsed.data.orderedIds;
  if (new Set(orderedIds).size !== orderedIds.length) {
    return NextResponse.json({ error: "The rule order contains duplicate entries." }, { status: 400 });
  }

  const current = await db.rule.findMany({ select: { id: true } });
  const currentIds = new Set(current.map(rule => rule.id));
  if (currentIds.size !== orderedIds.length || orderedIds.some(id => !currentIds.has(id))) {
    return NextResponse.json({ error: "The rules changed. Refresh the page and try again." }, { status: 409 });
  }

  await db.$transaction(
    orderedIds.map((id, index) => db.rule.update({ where: { id }, data: { sortOrder: index } })),
  );
  await audit(access.actor.id, "RULES_REORDER", null, "Updated order for " + orderedIds.length + " rules");
  revalidatePath("/rules");
  return NextResponse.json({ ok: true });
}
