// PATH: app/api/admin/admins/route.ts
import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { backfillAccused } from "@/lib/linking";
import { canAssignLevel, canAssignRole, canManageTarget } from "@/lib/permissions";
import { PRIMARY_OWNER_ADMIN_ID } from "@/lib/owner-privacy";

const INVITE_HOURS = 48;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function GET() {
  const a = await requireAdmin("MANAGE_STAFF");
  if (a.error) return a.error;
  // Visibility boundary: only Founder (the OWNER staff kind) can see top-tier
  // staff profiles. PRM and Developer can manage regular admin tiers, but cannot
  // inspect or open one another's profile. The primary owner account stays private.
  const rows = await db.admin.findMany({
    where: {
      id: { not: PRIMARY_OWNER_ADMIN_ID },
      ...(a.actor.kind === "OWNER" ? {} : { kind: "ADMIN" as const }),
    },
    orderBy: [{ kind: "asc" }, { level: "desc" }],
    select: {
      id: true, email: true, name: true, title: true, kind: true, level: true, extraRights: true, gameId: true, suspended: true,
      roleId: true, role: { select: { name: true, kind: true, minLevel: true, maxLevel: true, extraRights: true } },
      lastSeenAt: true,
      invitations: { orderBy: { createdAt: "desc" }, select: { usedAt: true, revokedAt: true, expiresAt: true } },
    },
  });
  const closures = await db.auditLog.groupBy({
    by: ["actorId"],
    where: {
      action: "COMPLAINT_STATUS",
      OR: [{ detail: { contains: "-> RESOLVED" } }, { detail: { contains: "-> DISMISSED" } }],
    },
    _max: { createdAt: true },
  });
  const closedAtByAdmin = new Map(closures.map(row => [row.actorId, row._max.createdAt]));
  const now = Date.now();
  const activeWindow = 24 * 60 * 60 * 1000;
  return NextResponse.json(rows.map((r) => {
    const latestInvite = r.invitations[0];
    const hasAcceptedInvite = r.invitations.some(invitation => !!invitation.usedAt);
    const pending = !!latestInvite && !latestInvite.usedAt && (!latestInvite.revokedAt || !hasAcceptedInvite);
    const closedAt = closedAtByAdmin.get(r.id) ?? null;
    const lastActivityAt = !r.lastSeenAt ? closedAt : !closedAt ? r.lastSeenAt : r.lastSeenAt > closedAt ? r.lastSeenAt : closedAt;
    const recentActivity = !!lastActivityAt && now - lastActivityAt.getTime() <= activeWindow;
    const presence = r.suspended ? "SUSPENDED" : pending ? "PENDING" : recentActivity ? "ACTIVE" : "INACTIVE";
    const { invitations: _invitations, ...staff } = r;
    return {
      ...staff,
      canManage: canManageTarget(a.actor, r),
      presence,
      lastActivityAt: lastActivityAt?.toISOString() ?? null,
      lastSeenAt: r.lastSeenAt?.toISOString() ?? null,
      lastClosedAt: closedAt?.toISOString() ?? null,
    };
  }));
}

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(60),
  roleId: z.string().min(1),
  title: z.string().max(40).optional(),
  level: z.coerce.number().int().min(1).max(6).optional(),
  gameId: z.string().max(64).optional(),
});

/** Staff managers create an eligible staff record and receive a private, one-use invitation URL. */
export async function POST(req: Request) {
  const a = await requireAdmin("MANAGE_STAFF");
  if (a.error) return a.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid details", details: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const role = await db.role.findUnique({ where: { id: d.roleId } });
  if (!role || !role.active) return NextResponse.json({ error: "Role not found" }, { status: 400 });
  if (!canAssignRole(a.actor, role)) return NextResponse.json({ error: "You cannot give that role" }, { status: 403 });

  const kind = role.kind;
  const level = kind === "ADMIN" ? (d.level ?? role.minLevel) : 6;
  if (kind === "ADMIN" && (level < role.minLevel || level > role.maxLevel))
    return NextResponse.json({ error: `The ${role.name} role needs a level between ${role.minLevel} and ${role.maxLevel}` }, { status: 400 });
  // A role's allowed range is not the actor's authority. Enforce the selected
  // level separately so a broad role cannot be used to promote above the inviter.
  if (kind === "ADMIN" && !canAssignLevel(a.actor, null, level))
    return NextResponse.json({ error: "You cannot invite staff at that level" }, { status: 403 });

  const email = d.email.toLowerCase().trim();
  if (await db.admin.findUnique({ where: { email } }))
    return NextResponse.json({ error: "That email already has an account. Use the staff invitation action to onboard the existing record." }, { status: 409 });
  if (d.gameId && await db.admin.findUnique({ where: { gameId: d.gameId } }))
    return NextResponse.json({ error: "That game ID is already linked to someone" }, { status: 409 });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_HOURS * 60 * 60 * 1000);
  const adminResult = await db.$transaction(async tx => {
    const created = await tx.admin.create({
      data: {
        email, name: d.name, passwordHash: null, kind, level, roleId: role.id, gameId: d.gameId,
        title: d.title ?? role.name,
      },
      select: { id: true, email: true, name: true, title: true, kind: true, level: true },
    });
    const invitation = await tx.adminInvitation.create({
      data: { adminId: created.id, tokenHash: hashToken(token), expiresAt, createdById: a.actor.id },
      select: { id: true },
    });
    return { created, invitation };
  });

  const { created: admin, invitation } = adminResult;
  if (d.gameId) await backfillAccused(admin.id, d.gameId);
  await audit(a.actor.id, "STAFF_INVITE_CREATE", admin.id, `${admin.kind} level ${admin.level}; invitation expires ${expiresAt.toISOString()}`);
  const origin = new URL(req.url).origin;
  return NextResponse.json({
    staff: admin,
    invitationId: invitation.id,
    invitationUrl: `${origin}/invite/${token}`,
    expiresAt: expiresAt.toISOString(),
    note: "Copy this private link now. It is shown only once and is not emailed automatically.",
  }, { status: 201 });
}
