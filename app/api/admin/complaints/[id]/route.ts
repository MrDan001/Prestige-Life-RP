// PATH: app/api/admin/complaints/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canAct, canUseTemplate } from "@/lib/permissions";
import { isPrimaryOwnerAccount } from "@/lib/owner-privacy";

type Ctx = { params: Promise<{ id: string }> };
const include = {
  player: true,
  category: true,
  accusedAdmin: { select: { id: true, name: true, kind: true, level: true } },
  claimedBy: { select: { id: true, name: true } },
  responses: { include: { admin: { select: { name: true } } }, orderBy: { createdAt: "desc" as const }, take: 1 },
  evidence: { orderBy: { createdAt: "asc" as const } },
};

export async function GET(_req: Request, { params }: Ctx) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id } = await params;
  const c = await db.complaint.findUnique({ where: { id }, include });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isClosed = c.status === "RESOLVED" || c.status === "DISMISSED";
  const closedAudit = isClosed ? await db.auditLog.findFirst({
      where: { targetId: id, action: "COMPLAINT_STATUS", detail: { endsWith: "-> " + c.status } },
      orderBy: { createdAt: "desc" }, select: { createdAt: true },
    }) : null;
  return NextResponse.json({
    ...c,
    isClosed,
    canReply: !isClosed && canAct(a.actor, c, "reply"),
    canManageStatus: isPrimaryOwnerAccount(a.admin.id),
    latestJudgment: c.responses[0] ?? null,
    closedAt: closedAudit?.createdAt ?? (isClosed ? c.responses[0]?.createdAt ?? null : null),
    closedBy: c.responses[0]?.admin ?? null,
  });
}

const patch = z.object({
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]).optional(),
  reply: z.string().min(1).max(2000).optional(),
  verdict: z.enum(["COMPLAINANT", "ACCUSED", "INSUFFICIENT"]).optional(),
  templateId: z.string().min(1).optional(),
  ruleCode: z.string().trim().min(2).max(32).optional(),
  punishmentOptionId: z.string().min(1).optional(),
  punishmentDuration: z.string().trim().min(1).max(40).optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id } = await params;
  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.status && !parsed.data.reply && !parsed.data.verdict))
    return NextResponse.json({ error: "Send a status, judgment or verdict" }, { status: 400 });
  const { status, reply, verdict, templateId, ruleCode, punishmentOptionId, punishmentDuration } = parsed.data;
  const c = await db.complaint.findUnique({
    where: { id },
    include: { category: true, accusedAdmin: { select: { id: true, kind: true, level: true } } },
  });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const owner = isPrimaryOwnerAccount(a.admin.id);
  const currentlyClosed = c.status === "RESOLVED" || c.status === "DISMISSED";
  if (status && status !== "OPEN" && !owner)
    return NextResponse.json({ error: "Only the primary owner can resolve or dismiss a complaint." }, { status: 403 });
  if (status === "OPEN" && (!owner || !currentlyClosed))
    return NextResponse.json({ error: "Only the primary owner can reopen a closed complaint." }, { status: 403 });
  if (currentlyClosed && status !== "OPEN")
    return NextResponse.json({ error: "This complaint is closed." }, { status: 409 });
  if (currentlyClosed && (reply || verdict || templateId))
    return NextResponse.json({ error: "Reopen the complaint before issuing another judgment." }, { status: 409 });

  if (reply || verdict || templateId) {
    if (currentlyClosed) return NextResponse.json({ error: "This complaint is closed." }, { status: 409 });
    if (!canAct(a.actor, c, "reply"))
      return NextResponse.json({ error: "You cannot issue a judgment on this complaint." }, { status: 403 });
  }

  const tpl = templateId ? await db.responseTemplate.findUnique({ where: { id: templateId } }) : null;
  if (templateId) {
    if (!tpl || !tpl.active) return NextResponse.json({ error: "Judgment template not found" }, { status: 400 });
    if (tpl.categoryId && tpl.categoryId !== c.categoryId)
      return NextResponse.json({ error: "That judgment is for another category" }, { status: 400 });
    if (!canUseTemplate(a.actor, tpl))
      return NextResponse.json({ error: "Your level cannot issue this judgment" }, { status: 403 });
    if (!reply) return NextResponse.json({ error: "A judgment needs its text" }, { status: 400 });
  }

  // Template outcomes that close a complaint apply automatically only to the primary owner.
  const newStatus = status ?? (owner ? tpl?.closesAs ?? undefined : undefined);
  if (newStatus === "RESOLVED" || newStatus === "DISMISSED") {
    const existingJudgment = reply ? null : await db.response.findFirst({ where: { complaintId: id }, select: { id: true } });
    if (!reply && !existingJudgment) {
      return NextResponse.json({ error: "Issue a judgment before closing this complaint." }, { status: 409 });
    }
  }
  const newVerdict = verdict ?? tpl?.verdict ?? undefined;
  const effectiveVerdict = newVerdict ?? c.verdict ?? null;

  let savedRuleCode: string | null = null;
  let savedPunishmentType: string | null = null;
  let savedPunishmentDuration: string | null = null;
  if (reply && effectiveVerdict === "COMPLAINANT") {
    if (!ruleCode || !punishmentOptionId || !punishmentDuration) {
      return NextResponse.json({ error: "An upheld complaint needs a violated rule code, punishment and duration before judgment can be issued." }, { status: 400 });
    }
    const matchedRule = await db.rule.findFirst({
      where: { code: { equals: ruleCode, mode: "insensitive" } },
      select: { code: true },
    });
    if (!matchedRule) return NextResponse.json({ error: "Enter a valid community rule code." }, { status: 400 });

    const option = await db.punishmentOption.findUnique({ where: { id: punishmentOptionId } });
    if (!option || !option.active) return NextResponse.json({ error: "Choose an active punishment option." }, { status: 400 });
    if (!option.durationOptions.includes(punishmentDuration)) {
      return NextResponse.json({ error: "Choose a valid duration for the selected punishment." }, { status: 400 });
    }
    savedRuleCode = matchedRule.code;
    savedPunishmentType = option.name;
    savedPunishmentDuration = punishmentDuration;
  } else if (reply && (ruleCode || punishmentOptionId || punishmentDuration)) {
    return NextResponse.json({ error: "Punishment details can only be issued when the complaint is upheld." }, { status: 400 });
  }

  if ((newStatus === "RESOLVED" || newStatus === "DISMISSED") && !owner)
    return NextResponse.json({ error: "Only the primary owner can close a complaint." }, { status: 403 });

  const updated = await db.$transaction(async tx => {
    const changed = await tx.complaint.updateMany({
      where: { id, status: c.status },
      data: {
        updatedAt: new Date(),
        ...(newStatus ? { status: newStatus } : {}),
        ...(newVerdict ? { verdict: newVerdict } : {}),
      },
    });
    if (changed.count !== 1) return null;
    if (reply) await tx.response.create({
      data: {
        complaintId: id,
        adminId: a.actor.id,
        message: reply,
        templateId: templateId ?? null,
        ruleCode: savedRuleCode,
        punishmentType: savedPunishmentType,
        punishmentDuration: savedPunishmentDuration,
      },
    });
    return tx.complaint.findUnique({ where: { id } });
  });
  if (!updated)
    return NextResponse.json({ error: "This complaint changed while you were issuing the judgment. Refresh and try again." }, { status: 409 });
  if (newStatus && newStatus !== c.status) await audit(a.actor.id, "COMPLAINT_STATUS", id, c.status + " -> " + newStatus);
  if (newVerdict && newVerdict !== c.verdict) await audit(a.actor.id, "COMPLAINT_VERDICT", id, (c.verdict ?? "none") + " -> " + newVerdict);
  if (reply && effectiveVerdict === "COMPLAINANT") {
    await audit(a.actor.id, "COMPLAINT_PUNISHMENT", id, `Rule ${savedRuleCode}; ${savedPunishmentType}; ${savedPunishmentDuration}`);
  }
  return NextResponse.json(updated);
}
