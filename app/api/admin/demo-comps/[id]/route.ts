// PATH: app/api/admin/demo-comps/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isPrimaryOwnerAccount } from "@/lib/owner-privacy";

type Ctx = { params: Promise<{ id: string }> };
function canCloseGroup(actor: { id: string; kind: string; level: number }, group: string) {
  if (isPrimaryOwnerAccount(actor.id) || actor.kind !== "ADMIN") return true;
  if (actor.level >= 5) return group === "A" || group === "B";
  return group === "A";
}
export async function PATCH(_req: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  const comp = await db.demoComp.findUnique({ where: { id } });
  if (!comp) return NextResponse.json({ error: "Demo comp not found." }, { status: 404 });
  if (!canCloseGroup(auth.actor, comp.assignedGroup)) return NextResponse.json({ error: "Your rank cannot close comps assigned to this group." }, { status: 403 });
  if (comp.status === "CLOSED") return NextResponse.json({ error: "This demo comp is already closed." }, { status: 409 });
  const result = await db.demoComp.updateMany({
    where: { id, status: "OPEN" },
    data: { status: "CLOSED", closedById: auth.actor.id, closedByName: auth.admin.name, closedAt: new Date() },
  });
  if (result.count !== 1) return NextResponse.json({ error: "This demo comp changed. Refresh and try again." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
