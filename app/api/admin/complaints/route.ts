// PATH: app/api/admin/complaints/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canAct, claimLocked, flags } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

const include = {
  player: true,
  category: true,
  accusedAdmin: { select: { id: true, name: true, kind: true, level: true } },
  claimedBy: { select: { id: true, name: true } },
  responses: { include: { admin: { select: { name: true } } }, orderBy: { createdAt: "asc" as const } },
  notes: { include: { admin: { select: { name: true } } }, orderBy: { createdAt: "asc" as const } },
  evidence: { orderBy: { createdAt: "asc" as const } },
};

const eventText = (action: string, detail: string) =>
  action === "COMPLAINT_STATUS"
    ? `changed status: ${detail}`
    : action === "COMPLAINT_VERDICT"
      ? `set the verdict: ${detail}`
      : action === "COMPLAINT_CLAIM"
        ? detail
        : detail || "released this complaint";

/** Full detail plus evidence and one timeline: replies, private notes, and status/claim/verdict events. */
export async function GET(_req: Request, { params }: Ctx) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id } = await params;

  const c = await db.complaint.findUnique({ where: { id }, include });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const events = await db.auditLog.findMany({
    where: { targetId: id, action: { in: ["COMPLAINT_STATUS", "COMPLAINT_CLAIM", "COMPLAINT_RELEASE", "COMPLAINT_VERDICT"] } },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const timeline = [
    ...c.responses.map((r) => ({ type: "reply", at: r.createdAt, by: r.admin.name, text: r.message, delivered: r.syncedToGame })),
    ...c.notes.map((n) => ({ type: "note", at: n.createdAt, by: n.admin.name, text: n.message, delivered: false })),
    ...events.map((e) => ({ type: "event", at: e.createdAt, by: e.actor.name, text: eventText(e.action, e.detail), delivered: false })),
  ].sort((x, y) => x.at.getTime() - y.at.getTime());

  return NextResponse.json({ ...c, ...flags(a.actor, c), canNote: canAct(a.actor, c, "reply"), timeline });
}

const patch = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]).optional(),
  reply: z.string().min(1).max(2000).optional(),
  verdict: z.enum(["COMPLAINANT", "ACCUSED", "INSUFFICIENT"]).optional(),
  templateId: z.string().min(1).optional(), // which template the reply started from
});

/**
 * Reply / verdict / open / in-review need reply rights. Resolve / dismiss need close rights.
 * If someone else claimed the complaint it is locked (409) unless you are level 6+ or top tier.
 * The first action on an unclaimed complaint claims it automatically.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id } = await params;

  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.status && !parsed.data.reply && !parsed.data.verdict))
    return NextResponse.json({ error: "Send a status, reply or verdict" }, { status: 400 });
  const { status, reply, verdict, templateId } = parsed.data;

  const c = await db.complaint.findUnique({ where: { id }, include });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const closing = status === "RESOLVED" || status === "DISMISSED";
  if (!canAct(a.actor, c, closing ? "close" : "reply"))
    return NextResponse.json({ error: closing ? "You cannot close this complaint" : "You cannot act on this complaint" }, { status: 403 });
  if (claimLocked(a.actor, c.claimedById))
    return NextResponse.json({ error: `Claimed by ${c.claimedBy?.name ?? "another admin"}. Ask them, or a level 6, to release it.` }, { status: 409 });
  if (templateId && reply && !(await db.responseTemplate.findUnique({ where: { id: templateId }, select: { id: true } })))
    return NextResponse.json({ error: "Template not found" }, { status: 400 });

  const autoClaim = !c.claimedById;
  const [updated] = await db.$transaction([
    db.complaint.update({ where: { id }, data: { status, verdict, ...(autoClaim ? { claimedById: a.actor.id, claimedAt: new Date() } : {}) } }),
    ...(reply ? [db.response.create({ data: { complaintId: id, adminId: a.actor.id, message: reply, templateId: templateId ?? null } })] : []),
  ]);
  if (autoClaim) await audit(a.actor.id, "COMPLAINT_CLAIM", id, "claimed this complaint");
  if (status && status !== c.status) await audit(a.actor.id, "COMPLAINT_STATUS", id, `${c.status} -> ${status}`);
  if (verdict && verdict !== c.verdict) await audit(a.actor.id, "COMPLAINT_VERDICT", id, `${c.verdict ?? "none"} -> ${verdict}`);
  return NextResponse.json(updated);
}