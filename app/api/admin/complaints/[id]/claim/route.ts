// PATH: app/api/admin/complaints/[id]/claim/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { isPrimaryOwnerAccount } from "@/lib/owner-privacy";
type Ctx = { params: Promise<{ id: string }> };

/** Claims are retired; judgments can be issued directly by eligible staff. */
export async function POST() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  return NextResponse.json({ error: "Claims are no longer required. Issue a judgment directly." }, { status: 410 });
}

/** Only the primary owner may clear a legacy claim. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  if (!isPrimaryOwnerAccount(a.admin.id))
    return NextResponse.json({ error: "Only the primary owner can release a complaint." }, { status: 403 });
  const { id } = await params;
  const c = await db.complaint.findUnique({ where: { id }, select: { claimedById: true } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!c.claimedById) return NextResponse.json({ error: "No active claim" }, { status: 400 });
  await db.complaint.update({ where: { id }, data: { claimedById: null, claimedAt: null, updatedAt: new Date() } });
  await audit(a.actor.id, "COMPLAINT_RELEASE", id, "cleared a legacy complaint claim");
  return NextResponse.json({ ok: true });
}
