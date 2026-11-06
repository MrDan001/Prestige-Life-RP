// PATH: lib/permissions.ts
export const MIN_SITE_LEVEL = 3; // levels 1-2 cannot use the website
export const MAX_LEVEL = 6; // 6 = chief admin / deputy chief admin
export const RIGHTS = ["MANAGE_CATEGORIES", "MANAGE_STAFF", "GRANT_STAFF_PERMISSIONS", "MANAGE_TEMPLATES", "MANAGE_SITE"] as const;
// Staff-management powers are per-person grants, never inherited from reusable roles.
export const ROLE_RIGHTS = ["MANAGE_CATEGORIES", "MANAGE_TEMPLATES", "MANAGE_SITE"] as const;
export type Right = (typeof RIGHTS)[number];
export type Kind = "OWNER" | "TECH" | "DEVELOPER" | "ADMIN";

export type Staff = { id: string; kind: Kind; level: number; extraRights: string[] };
export type Accused = { id: string; kind: Kind; level: number } | null;
export type ComplaintForCheck = {
  category: { minReplyLevel: number; minCloseLevel: number };
  accusedAdmin: Accused;
  claimedById?: string | null;
};

/** Founder (OWNER), PRM (TECH) and developers have full workspace rights. */
export const isTop = (s: { kind: Kind }) => s.kind !== "ADMIN";

export const canAccessSite = (s: Staff) => isTop(s) || s.level >= MIN_SITE_LEVEL;

/** Community rules are managed by Chief Admin (level 6) and the top tier only. */
export const canManageRules = (s: Staff) => isTop(s) || (s.kind === "ADMIN" && s.level >= 6);

export function hasRight(s: Staff, right: Right) {
  // Staff management and permission delegation are never implied by rank or
  // reusable roles. The Owner always retains both controls; everyone else
  // must receive the corresponding direct staff-card permission.
  if (right === "MANAGE_STAFF" || right === "GRANT_STAFF_PERMISSIONS")
    return s.kind === "OWNER" || s.extraRights.includes(right);
  if (isTop(s)) return true;
  return s.extraRights.includes(right);
}

/** The Owner is the permanent authority; this separate grant delegates permission administration. */
export const canGrantStaffPermissions = (s: Staff) =>
  s.kind === "OWNER" || s.extraRights.includes("GRANT_STAFF_PERMISSIONS");

/** Level needed because of WHO is accused. "TOP" = only owner/tech/developers. */
function levelNeededForTarget(t: Accused): number | "TOP" {
  if (!t) return 0;
  if (isTop(t)) return "TOP";
  return t.level >= 5 ? 6 : 5; // vs admin (1-4) -> 5+, vs senior (5) or chief/deputy (6) -> 6+
}

export type Action = "reply" | "close";

/** Everyone with site access can SEE every complaint; this decides who can ACT. */
export function canAct(actor: Staff, c: ComplaintForCheck, action: Action) {
  if (c.accusedAdmin?.id === actor.id) return false; // never handle a complaint about yourself
  if (isTop(actor)) return true;
  const target = levelNeededForTarget(c.accusedAdmin);
  if (target === "TOP") return false;
  const { minReplyLevel, minCloseLevel } = c.category;
  const categoryMin = action === "close" ? Math.max(minReplyLevel, minCloseLevel) : minReplyLevel;
  return actor.level >= Math.max(categoryMin, target);
}

/** Level 6 and the top tier can take over or release anyone's claim. */
export const canOverrideClaim = (s: Staff) => isTop(s) || s.level >= 6;

/** A complaint claimed by someone else is locked for everyone who cannot override. */
export const claimLocked = (s: Staff, claimedById?: string | null) =>
  !!claimedById && claimedById !== s.id && !canOverrideClaim(s);

export const flags = (actor: Staff, c: ComplaintForCheck) => {
  const locked = claimLocked(actor, c.claimedById);
  return {
    canReply: !locked && canAct(actor, c, "reply"),
    canClose: !locked && canAct(actor, c, "close"),
    lockedByClaim: locked,
  };
};

/** May this actor edit this staff member at all? Top-tier profiles are Founder-only. */
export function canManageTarget(actor: Staff, target: Staff) {
  if (!hasRight(actor, "MANAGE_STAFF") || actor.id === target.id) return false;
  if (isTop(target)) return actor.kind === "OWNER";
  return isTop(actor) || target.level < actor.level;
}

/** Award rules: level 6 can award up to 5 to people below them. Only top tier can award 6. */
export function canAssignLevel(actor: Staff, target: Staff | null, newLevel: number) {
  if (!hasRight(actor, "MANAGE_STAFF")) return false;
  if (!Number.isInteger(newLevel) || newLevel < 1 || newLevel > MAX_LEVEL) return false;
  if (target && !canManageTarget(actor, target)) return false;
  if (isTop(actor)) return true;
  return newLevel <= Math.min(MAX_LEVEL - 1, actor.level - 1);
}

/** Judgment templates carry a lowest level. The top tier can issue all of them. */
export const canUseTemplate = (s: Staff, t: { minLevel: number }) => isTop(s) || s.level >= t.minLevel;

export type RoleForCheck = { kind: Kind; minLevel: number; extraRights: string[] };

/** Only the owner hands out top-tier roles and roles that carry extra rights. Staff managers may assign plain admin roles only below their own level (and never level 6). */
export function canAssignRole(actor: Staff, role: RoleForCheck) {
  if (!hasRight(actor, "MANAGE_STAFF")) return false;
  if (role.kind !== "ADMIN" || role.extraRights.length > 0) return actor.kind === "OWNER";
  return canAssignLevel(actor, null, role.minLevel);
}