import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isPrimaryOwnerAccount } from "@/lib/owner-privacy";
import { audit } from "@/lib/audit";

const denied = () => NextResponse.json({ error: "Only the primary owner can manage punishment choices." }, { status: 403 });
const schema = z.object({
  name: z.string().trim().min(1).max(60),
  durations: z.array(z.string().trim().min(1).max(40)).min(1).max(30),
});

export async function GET(req: Request) {
  const access = await requireAdmin();
  if (access.error) return access.error;
  const all = new URL(req.url).searchParams.get("all") === "1";
  if (all && !isPrimaryOwnerAccount(access.admin.id)) return denied();
  const options = await db.punishmentOption.findMany({
    where: all ? {} : { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(options);
}

export async function POST(req: Request) {
  const access = await requireAdmin();
  if (access.error) return access.error;
  if (!isPrimaryOwnerAccount(access.admin.id)) return denied();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a punishment name and at least one valid duration." }, { status: 400 });
  const name = parsed.data.name;
  const duplicate = await db.punishmentOption.findUnique({ where: { name }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "That punishment choice already exists." }, { status: 409 });
  const last = await db.punishmentOption.aggregate({ _max: { sortOrder: true } });
  const option = await db.punishmentOption.create({
    data: { name, durationOptions: [...new Set(parsed.data.durations)], sortOrder: (last._max.sortOrder ?? -1) + 1, active: true },
  });
  await audit(access.actor.id, "PUNISHMENT_OPTION_CREATE", option.id, option.name);
  return NextResponse.json(option, { status: 201 });
}
