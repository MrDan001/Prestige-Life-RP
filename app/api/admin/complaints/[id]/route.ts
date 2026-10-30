// PATH: app/api/admin/complaints/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canAct, canUseTemplate, claimLocked, flags, isTop } from "@/lib/permissions";

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

  const respondedAt = c.responses[0]?.createdAt ?? null;
  const reviewedByName = c.responses.length ? c.responses[c.responses.length - 1].admin.name : (c.claimedBy?.name ?? null);
  const permissionFlags = flags(a.actor, c);
  const isClosed = c.status === "RESOLVED" || c.status === "DISMISSED";

  return NextResponse.json({
    ...c,
    ...permissionFlags,
    isClosed,
    canReply: !isClosed && permissionFlags.canReply,
    canClose: !isClosed && permissionFlags.canClose,
    canNote: !isClosed && canAct(a.actor, c, "reply"),
    canReopen: isTop(a.actor),
    respondedAt,
    reviewedByName,
    timeline,
  });
}

const patch = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]).optional(),
  reply: z.string().min(1).max(2000).optional(),
  verdict: z.enum(["COMPLAINANT", "ACCUSED", "INSUFFICIENT"]).optional(),
  templateId: z.string().min(1).optional(), // the judgment button the reply came from
});

/**
 * Answering needs reply rights on the complaint (its category and who it is against).
 * Sending a judgment also needs the judgment's own level, and applies its verdict and outcome (resolve/dismiss).
 * Changing the status by hand to resolved/dismissed needs the category's close level.
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

  const currentlyClosed = c.status === "RESOLVED" || c.status === "DISMISSED";
  if (currentlyClosed) {
    const reopening = (status === "OPEN" || status === "IN_REVIEW") && isTop(a.actor);
    if (!reopening) {
      return NextResponse.json({ error: "This complaint is closed and can only be reopened by the owner or a top-tier administrator." }, { status: 409 });
    }
    if (reply || verdict || templateId) {
      return NextResponse.json({ error: "Reopen the complaint first. You can respond after it returns to the active queue." }, { status: 409 });
    }
    const reopened = await db.complaint.updateMany({
      where: { id, status: c.status },
      data: { status, claimedById: null, claimedAt: null },
    });
    if (reopened.count !== 1) {
      return NextResponse.json({ error: "The complaint changed while you were reopening it. Refresh and try again." }, { status: 409 });
    }
    await audit(a.actor.id, "COMPLAINT_STATUS", id, `${c.status} -> ${status} (reopened by top tier)`);
    const updated = await db.complaint.findUnique({ where: { id } });
    return NextResponse.json(updated);
  }

  if (!canAct(a.actor, c, "reply")) return NextResponse.json({ error: "You cannot act on this complaint" }, { status: 403 });
  if (claimLocked(a.actor, c.claimedById))
    return NextResponse.json({ error: `Claimed by ${c.claimedBy?.name ?? "another admin"}. Ask them, or a level 6, to release it.` }, { status: 409 });

  const tpl = templateId ? await db.responseTemplate.findUnique({ where: { id: templateId } }) : null;
  if (templateId) {
    if (!tpl || !tpl.active) return NextResponse.json({ error: "Template not found" }, { status: 400 });
    if (tpl.categoryId && tpl.categoryId !== c.categoryId) return NextResponse.json({ error: "That template is for another category" }, { status: 400 });
    if (!canUseTemplate(a.actor, tpl)) return NextResponse.json({ error: "Your level cannot issue this judgment" }, { status: 403 });
    if (!reply) return NextResponse.json({ error: "A judgment needs its reply text" }, { status: 400 });
  }

  const newStatus = status ?? tpl?.closesAs ?? undefined;
  const newVerdict = verdict ?? tpl?.verdict ?? undefined;
  if ((newStatus === "RESOLVED" || newStatus === "DISMISSED") && !canAct(a.actor, c, "close")) {
    return NextResponse.json({ error: "You do not have permission to close this complaint." }, { status: 403 });
  }
  const autoClaim = !c.claimedById;
  const updated = await db.$transaction(async tx => {
    const changed = await tx.complaint.updateMany({
      where: { id, status: { in: ["OPEN", "IN_REVIEW"] } },
      data: {
        updatedAt: new Date(),
        ...(newStatus ? { status: newStatus } : {}),
        ...(newVerdict ? { verdict: newVerdict } : {}),
        ...(autoClaim ? { claimedById: a.actor.id, claimedAt: new Date() } : {}),
      },
    });
    if (changed.count !== 1) return null;
    if (reply) await tx.response.create({ data: { complaintId: id, adminId: a.actor.id, message: reply, templateId: templateId ?? null } });
    return tx.complaint.findUnique({ where: { id } });
  });
  if (!updated) {
    return NextResponse.json({ error: "This complaint was closed or changed by another administrator. Refresh the page." }, { status: 409 });
  }
  if (autoClaim) await audit(a.actor.id, "COMPLAINT_CLAIM", id, "claimed this complaint");
  if (newStatus && newStatus !== c.status) await audit(a.actor.id, "COMPLAINT_STATUS", id, `${c.status} -> ${newStatus}${tpl ? ` (judgment: ${tpl.name})` : ""}`);
  if (newVerdict && newVerdict !== c.verdict) await audit(a.actor.id, "COMPLAINT_VERDICT", id, `${c.verdict ?? "none"} -> ${newVerdict}`);
  return NextResponse.json(updated);
}