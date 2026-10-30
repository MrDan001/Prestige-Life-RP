// PATH: app/api/admin/complaints/[id]/claim/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canAct, canOverrideClaim, claimLocked } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

const include = {
  category: true,
  accusedAdmin: { select: { id: true, kind: true, level: true } },
  claimedBy: { select: { id: true, name: true } },
};

/** Claim a complaint so two admins do not answer the same one. Level 6+ and top tier can take over. */
export async function POST(_req: Request, { params }: Ctx) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id } = await params;

  const c = await db.complaint.findUnique({ where: { id }, include });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (c.status === "RESOLVED" || c.status === "DISMISSED") return NextResponse.json({ error: "Closed complaints are view-only. A top-tier administrator must reopen the complaint first." }, { status: 409 });
  if (!canAct(a.actor, c, "reply")) return NextResponse.json({ error: "You cannot act on this complaint" }, { status: 403 });
  if (c.claimedById === a.actor.id) return NextResponse.json({ ok: true });
  if (claimLocked(a.actor, c.claimedById))
    return NextResponse.json({ error: `Already claimed by ${c.claimedBy?.name ?? "another admin"}` }, { status: 409 });

  await db.complaint.update({ where: { id }, data: { claimedById: a.actor.id, claimedAt: new Date() } });
  await audit(a.actor.id, "COMPLAINT_CLAIM", id, c.claimedBy ? `took over from ${c.claimedBy.name}` : "claimed this complaint");
  return NextResponse.json({ ok: true });
}

/** Release a claim: the claimer, or level 6+ / top tier. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id } = await params;

  const c = await db.complaint.findUnique({ where: { id }, select: { claimedById: true } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const current = await db.complaint.findUnique({ where: { id }, select: { status: true } });
  if (current?.status === "RESOLVED" || current?.status === "DISMISSED") return NextResponse.json({ error: "Closed complaints are view-only. A top-tier administrator must reopen the complaint first." }, { status: 409 });
  if (!c.claimedById) return NextResponse.json({ error: "Not claimed" }, { status: 400 });
  if (c.claimedById !== a.actor.id && !canOverrideClaim(a.actor))
    return NextResponse.json({ error: "Only the claimer or a level 6 can release this" }, { status: 403 });

  await db.complaint.update({ where: { id }, data: { claimedById: null, claimedAt: null } });
  await audit(a.actor.id, "COMPLAINT_RELEASE", id, "released this complaint");
  return NextResponse.json({ ok: true });
}