// PATH: app/api/admin/settings/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { DEFAULT_SITE } from "@/lib/site";

export async function GET() {
  const a = await requireAdmin("MANAGE_SITE");
  if (a.error) return a.error;
  const r = await db.siteSetting.findUnique({ where: { id: "main" } });
  const { id: _id, updatedAt: _u, ...rest } = r ?? { id: "main", updatedAt: new Date(), ...DEFAULT_SITE };
  void _id; void _u;
  return NextResponse.json(rest);
}

const url = z.string().url().max(500).refine((u) => u.startsWith("https://"), "Links must start with https://").nullable();
const count = z.number().int().min(0).max(1_000_000).nullable();

const schema = z
  .object({
    launchStatus: z.enum(["COMING_SOON", "LIVE", "MAINTENANCE"]),
    playStoreUrl: url,
    appStoreUrl: url,
    apkUrl: url,
    discordUrl: url,
    apkVersion: z.string().max(20).nullable(),
    statSlots: count,
    statUptime: count,
    statCitizens: count,
  })
  .partial();

/** Owner, tech and developers (or anyone given MANAGE_SITE) edit the public home page settings. */
export async function PUT(req: Request) {
  const a = await requireAdmin("MANAGE_SITE");
  if (a.error) return a.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings. Links must start with https://", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  await db.siteSetting.upsert({ where: { id: "main" }, update: data, create: { id: "main", ...data } });
  await audit(a.actor.id, "SETTINGS_UPDATE", null, `changed: ${Object.keys(data).join(", ")}`);
  revalidatePath("/"); // the public page updates straight away
  return NextResponse.json({ ok: true });
}