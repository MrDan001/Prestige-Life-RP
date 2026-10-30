// PATH: app/api/admin/admins/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { backfillAccused } from "@/lib/linking";
import { RIGHTS, canAssignLevel, canAssignRole, canManageTarget, type Staff } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

const patch = z.object({
  roleId: z.string().min(1).optional(), // give a role (the title and, for top-tier roles, the type come with it)
  level: z.coerce.number().int().min(1).max(6).optional(),
  title: z.string().max(40).optional(),
  gameId: z.string().max(64).nullable().optional(),
  extraRights: z.array(z.enum(RIGHTS)).optional(),
  suspended: z.boolean().optional(),
});

/** Change a staff member's role, level, title, game link, personal extra rights or suspension. Every change is logged. */
export async function PATCH(req: Request, { params }: Ctx) {
  const a = await requireAdmin("MANAGE_STAFF");
  if (a.error) return a.error;
  const { id } = await params;

  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid details" }, { status: 400 });
  const { roleId, ...rest } = parsed.data;

  const target = await db.admin.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const t: Staff = { id: target.id, kind: target.kind, level: target.level, extraRights: target.extraRights };

  if (!canManageTarget(a.actor, t)) return NextResponse.json({ error: "You cannot change this person" }, { status: 403 });
  if (rest.level !== undefined && !canAssignLevel(a.actor, t, rest.level)) return NextResponse.json({ error: "You cannot award that level" }, { status: 403 });
  if (rest.extraRights && a.actor.kind !== "OWNER") return NextResponse.json({ error: "Only the owner can change personal extra rights" }, { status: 403 });
  if (rest.gameId && (await db.admin.findFirst({ where: { gameId: rest.gameId, NOT: { id } } })))
    return NextResponse.json({ error: "That game ID is already linked to someone" }, { status: 409 });

  const data: Prisma.AdminUncheckedUpdateInput = { ...rest };

  if (roleId) {
    const role = await db.role.findUnique({ where: { id: roleId } });
    if (!role || !role.active) return NextResponse.json({ error: "Role not found" }, { status: 400 });
    if (!canAssignRole(a.actor, role)) return NextResponse.json({ error: "You cannot give that role" }, { status: 403 });
    if (role.kind !== "ADMIN") {
      data.kind = role.kind;
      data.level = 6;
    } else {
      const level = rest.level ?? target.level;
      if (target.kind !== "ADMIN" && rest.level === undefined) return NextResponse.json({ error: "Pick a level for this role" }, { status: 400 });
      if (level < role.minLevel || level > role.maxLevel)
        return NextResponse.json({ error: `The ${role.name} role needs a level between ${role.minLevel} and ${role.maxLevel}` }, { status: 400 });
      if (!canAssignLevel(a.actor, t, level)) return NextResponse.json({ error: "You cannot award that level" }, { status: 403 });
      data.kind = "ADMIN";
      data.level = level;
    }
    data.roleId = role.id;
    data.title = rest.title ?? role.name;
  } else if (rest.level !== undefined && target.roleId) {
    const role = await db.role.findUnique({ where: { id: target.roleId } });
    if (role && role.kind === "ADMIN" && (rest.level < role.minLevel || rest.level > role.maxLevel))
      return NextResponse.json({ error: `Level ${rest.level} is outside the ${role.name} range (${role.minLevel}-${role.maxLevel}). Change the role first.` }, { status: 400 });
  }

  const updated = await db.admin.update({
    where: { id },
    data,
    select: { id: true, name: true, title: true, kind: true, level: true, extraRights: true, gameId: true, suspended: true, roleId: true },
  });
  if (rest.gameId) await backfillAccused(id, rest.gameId);
  if (rest.suspended === true) {
    const now = new Date();
    await db.$transaction([
      db.adminSession.updateMany({ where: { adminId: id, revokedAt: null }, data: { revokedAt: now } }),
      db.adminInvitation.updateMany({ where: { adminId: id, usedAt: null, revokedAt: null }, data: { revokedAt: now } }),
      db.admin.update({ where: { id }, data: { sessionsRevokedAt: now } }),
    ]);
  }
  await audit(a.actor.id, "STAFF_UPDATE", id, `was ${target.kind}/L${target.level}/${target.title}; changes ${JSON.stringify({ ...rest, roleId })}`);
  return NextResponse.json(updated);
}

/**
 * Permanently remove a staff account and its account-owned history.
 * Complaint records remain; accused/claimed staff references are nulled by
 * the schema's onDelete: SetNull relations.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const actor = await requireAdmin("MANAGE_STAFF");
  if (actor.error) return actor.error;
  if (actor.actor.kind !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can permanently delete staff accounts" }, { status: 403 });
  }

  const { id } = await params;
  if (id === actor.actor.id) {
    return NextResponse.json({ error: "You cannot delete your own owner account" }, { status: 409 });
  }

  const target = await db.admin.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  const staff: Staff = { id: target.id, kind: target.kind, level: target.level, extraRights: target.extraRights };
  if (target.kind === "OWNER" || !canManageTarget(actor.actor, staff)) {
    return NextResponse.json({ error: "You cannot delete this account" }, { status: 403 });
  }

  await db.$transaction(async tx => {
    // These relations use RESTRICT, so delete their account-owned rows explicitly.
    await tx.response.deleteMany({ where: { adminId: id } });
    await tx.note.deleteMany({ where: { adminId: id } });
    await tx.auditLog.deleteMany({ where: { actorId: id } });
    await tx.adminInvitation.deleteMany({ where: { adminId: id } });
    await tx.adminSession.deleteMany({ where: { adminId: id } });
    await tx.adminPasskeyChallenge.deleteMany({ where: { adminId: id } });
    await tx.adminPasskey.deleteMany({ where: { adminId: id } });
    // Complaint accused/claimed references are SET NULL; complaints themselves remain.
    await tx.admin.delete({ where: { id } });
  });

  await audit(actor.actor.id, "STAFF_DELETE", id, `Permanently deleted staff account ${target.name} <${target.email}>; related responses, notes, and audit entries were removed.`);
  return NextResponse.json({ ok: true, deletedId: id });
}
