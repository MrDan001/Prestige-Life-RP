import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isPrimaryOwnerAccount } from "@/lib/owner-privacy";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };
const denied = () => NextResponse.json({ error: "Only the primary owner can manage punishment choices." }, { status: 403 });
const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  durations: z.array(z.string().trim().min(1).max(40)).min(1).max(30).optional(),
  active: z.boolean().optional(),
}).refine(value => Object.keys(value).length > 0, "No changes supplied.");

export async function PATCH(req: Request, { params }: Ctx) {
  const access = await requireAdmin();
  if (access.error) return access.error;
  if (!isPrimaryOwnerAccount(access.admin.id)) return denied();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid punishment changes." }, { status: 400 });
  const { id } = await params;
  const before = await db.punishmentOption.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Punishment choice not found." }, { status: 404 });
  if (parsed.data.name) {
    const duplicate = await db.punishmentOption.findFirst({ where: { name: parsed.data.name, NOT: { id } }, select: { id: true } });
    if (duplicate) return NextResponse.json({ error: "That punishment choice already exists." }, { status: 409 });
  }
  const option = await db.punishmentOption.update({
    where: { id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.durations ? { durationOptions: [...new Set(parsed.data.durations)] } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
    },
  });
  await audit(access.actor.id, "PUNISHMENT_OPTION_UPDATE", id, Object.keys(parsed.data).join(", "));
  return NextResponse.json(option);
}
