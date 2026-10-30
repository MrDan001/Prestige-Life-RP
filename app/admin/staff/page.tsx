"use client";
import { useCallback, useEffect, useState } from "react";
import { RIGHTS } from "@/lib/permissions";
import ConfirmDialog from "@/app/admin/components/ConfirmDialog";
import RoleSelect, { type RoleSelectOption } from "@/app/admin/components/RoleSelect";

type Me = { kind: string; level: number; canManageStaff: boolean };
type RoleInfo = { name: string; kind: string; minLevel: number; maxLevel: number };
type Staff = {
  id: string; email: string; name: string; title: string; kind: string; level: number; extraRights: string[];
  gameId: string | null; suspended: boolean; canManage: boolean; roleId: string | null; role: RoleInfo | null;
  presence: "ACTIVE" | "PENDING" | "SUSPENDED" | "INACTIVE"; lastActivityAt: string | null; lastSeenAt: string | null; lastClosedAt: string | null;
};
type Role = { id: string; name: string; kind: string; minLevel: number; maxLevel: number; active: boolean; assignable: boolean };
type Filter = "ALL" | "ADMINS" | "TOP_TIER" | "ACTIVE" | "PENDING" | "SUSPENDED" | "INACTIVE";
type InviteInfo = { id: string; url: string; expiresAt: string };
type Confirmation = { title: string; message: string; confirmLabel: string; tone: "danger" | "accent"; onConfirm: () => Promise<void> };

const roleSelectOptions = (items: Role[]): RoleSelectOption[] => items.map(role => ({
  value: role.id,
  label: role.name,
  description: role.kind === "ADMIN"
    ? (role.minLevel === role.maxLevel ? `Level ${role.minLevel} access` : `Levels ${role.minLevel}–${role.maxLevel}`)
    : "Top tier · Full administrative rights",
  badge: role.kind === "ADMIN" ? `LEVEL ${role.minLevel}${role.maxLevel !== role.minLevel ? `–${role.maxLevel}` : ""}` : "TOP TIER",
}));

const RIGHTS_LABEL: Record<string, string> = {
  MANAGE_CATEGORIES: "Edit categories", MANAGE_STAFF: "Manage staff",
  MANAGE_TEMPLATES: "Edit judgments", MANAGE_SITE: "Edit home page",
};
const levelsFor = (role: { kind: string; minLevel: number; maxLevel: number }, levels: number[]) =>
  role.kind === "ADMIN" ? levels.filter(level => level >= role.minLevel && level <= role.maxLevel) : [];
const nearest = (allowed: number[], level: number) =>
  allowed.reduce((best, item) => Math.abs(item - level) < Math.abs(best - level) ? item : best, allowed[0]);

function StaffRow({ s, me, levels, roles, onPatch, onInvite, onRecover, onRevokeSessions, onDelete }: {
  s: Staff; me: Me; levels: number[]; roles: Role[]; onPatch: (id: string, body: object) => void; onInvite: (id: string) => void; onRecover: (id: string) => void; onRevokeSessions: (id: string) => void; onDelete: (staff: Staff) => void;
}) {
  const [rights, setRights] = useState<string[]>(s.extraRights);
  const roleOptions = roles.filter(role => (role.active && role.assignable) || role.id === s.roleId);
  const levelOptions = s.role ? levelsFor(s.role, levels) : levels;
  const levelChoices = levelOptions.includes(s.level) ? levelOptions : [...levelOptions, s.level].sort((a, b) => a - b);
  const initials = s.name.trim().split(/\s+/).slice(0, 2).map(part => part[0] ?? "").join("").toUpperCase();
  const presenceClass = s.presence.toLowerCase();
  const presenceLabel = s.presence.charAt(0) + s.presence.slice(1).toLowerCase();

  function changeRole(id: string) {
    const role = roles.find(item => item.id === id);
    if (!role) return;
    if (role.kind !== "ADMIN") return onPatch(s.id, { roleId: id });
    const allowed = levelsFor(role, levels);
    if (allowed.length) onPatch(s.id, { roleId: id, level: nearest(allowed, s.level) });
  }

  return (
    <details className={`staff-card${s.suspended ? " is-suspended" : ""}`}>
      <summary className="staff-summary">
        <span className="staff-avatar" aria-hidden="true">{initials || "?"}</span>
        <span className="staff-summary-copy">
          <span className="staff-name-line"><strong>{s.name}</strong><span className={`staff-presence ${presenceClass}`}><i className={`staff-dot ${presenceClass}`} />{presenceLabel}</span></span>
          <span className="staff-subtitle">{s.title || s.kind} · {s.kind === "ADMIN" ? `Level ${s.level}` : "Top tier"}{s.suspended ? " · Suspended" : ""}</span>
        </span>
        <svg className="staff-chevron" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="m4 7 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </summary>
      <div className="staff-body">
        {me.kind === "OWNER" && s.canManage && <section className="staff-section" style={{ borderTop: 0, paddingTop: 0 }}><button type="button" className="staff-invite-button" onClick={() => onInvite(s.id)}>Issue / replace private invitation</button><button type="button" className="staff-invite-button" onClick={() => onRecover(s.id)}>Reset passkeys &amp; issue recovery invitation</button></section>}
        <div className="staff-email">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="1.8" y="3.3" width="14.4" height="11.4" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="m3 5 6 4.6L15 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span>{s.email}</span>
        </div>
        {s.canManage ? <>
          <section className="staff-section">
            <h3 className="staff-label">Role and level</h3>
            <div className="staff-control-grid">
              <div className="staff-field"><span>Role</span>
                <RoleSelect value={s.roleId ?? ""} options={roleSelectOptions(roleOptions)} onChange={changeRole} placeholder="No role assigned" ariaLabel={`Role for ${s.name}`} />
              </div>
              {s.kind === "ADMIN" && <label className="staff-field"><span>Level</span>
                <select value={s.level} onChange={e => onPatch(s.id, { level: Number(e.target.value) })} aria-label={`Level for ${s.name}`}>
                  {levelChoices.map(level => <option key={level} value={level}>Level {level}</option>)}
                </select>
              </label>}
            </div>
          </section>
          <section className="staff-section">
            <h3 className="staff-label">Game account</h3>
            <div className="staff-game-row"><span className={s.gameId ? "staff-game-id" : "staff-game-id empty"}>{s.gameId ?? "Not linked to a game account"}</span>
              {s.gameId && <button type="button" onClick={() => onPatch(s.id, { gameId: null })}>Unlink</button>}
            </div>
          </section>
          {me.kind === "OWNER" && s.kind === "ADMIN" && <section className="staff-section">
            <h3 className="staff-label">Extra rights <span>(owner only)</span></h3>
            <div className="staff-rights-grid">{RIGHTS.map(right =>
              <label key={right} className={`staff-right${rights.includes(right) ? " checked" : ""}`}>
                <input type="checkbox" checked={rights.includes(right)} onChange={e => setRights(e.target.checked ? [...rights, right] : rights.filter(item => item !== right))}/>
                <span>{RIGHTS_LABEL[right] ?? right}</span>
              </label>
            )}</div>
            <button type="button" className="primary staff-save" disabled={[...rights].sort().join() === [...s.extraRights].sort().join()} onClick={() => onPatch(s.id, { extraRights: rights })}>Save rights</button>
          </section>}
          {me.kind === "OWNER" && <section className="staff-section"><h3 className="staff-label">Active sessions</h3><button type="button" className="staff-invite-button" onClick={() => onRevokeSessions(s.id)}>Sign out all devices</button></section>}
          <section className="staff-section staff-status-section">
            <div><h3 className="staff-label">Status</h3><div className={`staff-status-text ${presenceClass}`}><i className={`staff-dot ${presenceClass}`}/>{presenceLabel}</div><small className="staff-last-activity">{s.lastActivityAt ? `Last activity: ${new Date(s.lastActivityAt).toLocaleString()}` : "No website visit or complaint closure recorded in the last 24 hours."}</small></div>
            <div className="staff-status-actions">
              <button type="button" className={s.suspended ? "staff-restore" : "staff-suspend"} onClick={() => onPatch(s.id, { suspended: !s.suspended })}>{s.suspended ? "Restore" : "Suspend"}</button>
              {me.kind === "OWNER" && <button type="button" className="staff-delete" onClick={() => onDelete(s)}>Delete staff</button>}
            </div>
          </section>
        </> : <p className="staff-no-permission">You do not have permission to manage this staff account.</p>}
      </div>
    </details>
  );
}

const staffStyles = `
.staff-page{max-width:none;min-width:940px;margin:0;padding:24px 28px 36px;display:grid;align-content:start;gap:18px}
.staff-page .staff-header{display:flex;align-items:center;justify-content:space-between;gap:14px}
.staff-page .staff-header h1{font-size:1.65rem;line-height:1.25;letter-spacing:-.025em}
.staff-page .staff-count{color:var(--muted);margin:3px 0 0;font-size:13px}
.staff-page .staff-add{flex:none;padding:11px 18px}
.staff-page .staff-message{margin:0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;color:var(--muted);overflow-wrap:anywhere}
.staff-page .staff-search{display:flex;align-items:center;gap:12px;min-width:0;padding:0 14px;border:1px solid var(--line2);border-radius:12px;background:var(--panel);color:var(--muted)}
.staff-page .staff-search:focus-within{border-color:var(--accent)}
.staff-page .staff-search input{flex:1;min-width:0;border:0;outline:0;box-shadow:none;background:transparent;padding:13px 0;color:var(--text)}
.staff-page .staff-search button{padding:2px 6px;border:0;color:var(--muted);font-size:24px}
.staff-page .staff-filters{display:flex;flex-wrap:wrap;gap:8px}
.staff-page .staff-filters .chip{border-radius:999px;padding:7px 15px}
.staff-page .staff-filters .chip.on{background:var(--text);color:var(--bg);border-color:var(--text)}
.staff-page .staff-list{display:grid;gap:9px;min-width:0}
.staff-page .staff-card{border:1px solid var(--line);border-radius:14px;background:var(--panel);overflow:hidden;min-width:0}
.staff-page .staff-card[open]{border-color:var(--accent)}
.staff-page .staff-summary{list-style:none;display:flex;align-items:center;gap:12px;min-width:0;padding:12px 14px;min-height:68px;cursor:pointer}
.staff-page .staff-summary::-webkit-details-marker{display:none}.staff-page .staff-summary::marker{content:""}
.staff-page .staff-card[open]>.staff-summary{background:var(--raise);border-bottom:1px solid var(--line)}
.staff-page .staff-avatar{display:grid;place-items:center;flex:none;width:38px;height:38px;border-radius:50%;background:var(--raise);font-size:15px;font-weight:700}
.staff-page .staff-summary-copy{display:grid;gap:1px;flex:1;min-width:0}
.staff-page .staff-name-line{display:flex;align-items:center;gap:9px;min-width:0}
.staff-page .staff-name-line strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}
.staff-page .staff-subtitle{color:var(--muted);font-size:12px;overflow-wrap:anywhere}
.staff-page .staff-dot{display:inline-block;flex:none;width:8px;height:8px;border-radius:50%;font-style:normal}
.staff-page .staff-presence{display:inline-flex;align-items:center;gap:7px;flex:none;font-size:11px;font-weight:600;white-space:nowrap}
.staff-page .staff-dot{display:inline-block;flex:none;width:8px;height:8px;border-radius:50%;font-style:normal}
.staff-page .staff-dot.active{background:#39d98a;box-shadow:0 0 0 3px rgb(57 217 138 / 12%)}
.staff-page .staff-dot.pending{background:#e7b84b;box-shadow:0 0 0 3px rgb(231 184 75 / 12%)}
.staff-page .staff-dot.suspended{background:#f05265;box-shadow:0 0 0 3px rgb(240 82 101 / 12%)}
.staff-page .staff-dot.inactive{background:#9295a1;box-shadow:0 0 0 3px rgb(146 149 161 / 12%)}
.staff-page .staff-presence.active,.staff-page .staff-status-text.active{color:#39d98a}
.staff-page .staff-presence.pending,.staff-page .staff-status-text.pending{color:#e7b84b}
.staff-page .staff-presence.suspended,.staff-page .staff-status-text.suspended{color:#f05265}
.staff-page .staff-presence.inactive,.staff-page .staff-status-text.inactive{color:#a1a4ae}
.staff-page .staff-last-activity{display:block;margin-top:5px;color:var(--muted);font-size:11px}
.staff-page .staff-chevron{flex:none;color:var(--muted);transition:transform .18s ease}
.staff-page .staff-card[open] .staff-chevron{transform:rotate(180deg);color:var(--text)}
.staff-page .is-suspended .staff-avatar{opacity:.72}
.staff-page .staff-body{padding:16px 14px 14px}
.staff-page .staff-email{display:flex;align-items:flex-start;gap:10px;min-width:0;overflow-wrap:anywhere;color:var(--muted);padding-bottom:14px}
.staff-page .staff-email svg{flex:none;margin-top:2px}
.staff-page .staff-section{display:grid;gap:9px;padding:16px 0;border-top:1px solid var(--line)}
.staff-page .staff-label{margin:0;color:#a7a2e8;font-size:11px;line-height:1.4;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.staff-page .staff-label span{text-transform:none;letter-spacing:0;font-weight:400}
.staff-page .staff-control-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.staff-page .staff-field{display:grid;gap:5px;min-width:0}.staff-page .staff-field>span{color:var(--muted);font-size:12px}
.staff-page .staff-field select{width:100%;min-width:0;min-height:48px}
.staff-page .staff-game-row{display:flex;justify-content:space-between;align-items:center;gap:10px;min-width:0}
.staff-page .staff-game-id{min-width:0;overflow-wrap:anywhere}.staff-page .staff-game-id.empty{color:var(--muted)}
.staff-page .staff-game-row button{flex:none}
.staff-page .staff-rights-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.staff-page .staff-right{display:flex;align-items:center;gap:9px;min-width:0;padding:10px;border:1px solid var(--line);border-radius:10px;cursor:pointer}
.staff-page .staff-right input{appearance:none;display:grid;place-items:center;flex:none;width:18px;height:18px;margin:0;padding:0;border:1px solid var(--line2);border-radius:5px;background:transparent}
.staff-page .staff-right input:checked{border-color:var(--accent);background:var(--accent)}
.staff-page .staff-right input:checked:after{content:"✓";color:#fff;font-size:12px;font-weight:700;line-height:1}
.staff-page .staff-right:has(input:checked){border-color:var(--accent);background:rgb(214 25 122 / 9%)}
.staff-page .staff-right span{overflow-wrap:anywhere}.staff-page .staff-save{width:100%;min-height:44px;margin-top:2px}
.staff-page .staff-status-section{display:flex;align-items:center;justify-content:space-between;gap:16px}
.staff-page .staff-status-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.staff-page .staff-delete{border-color:#d33b55;color:#ff9aa8;background:transparent}
.staff-page .staff-status-text{display:flex;align-items:center;gap:9px;margin-top:7px}
.staff-page .staff-status-text.on{color:#6ee7a8}.staff-page .staff-status-text.off{color:#ffb3cf}
.staff-page .staff-suspend{border-color:#e0568f;color:#ffb3cf}.staff-page .staff-restore{border-color:#2fbf86;color:#6ee7a8}
.staff-page .staff-no-permission{margin:0;color:var(--muted);font-size:13px}
.staff-page .staff-invite-button{width:100%;min-height:42px;border:1px solid var(--accent);border-radius:10px;color:var(--text);background:transparent}
.staff-page .staff-invite-panel{display:grid;gap:10px;padding:14px;border:1px solid var(--accent);border-radius:12px;background:var(--panel)}
.staff-page .staff-invite-url{overflow-wrap:anywhere;font-size:12px;color:var(--muted)}
.staff-page .staff-invite-actions{display:flex;gap:8px;flex-wrap:wrap}
.staff-page .staff-invite-actions button{flex:1;min-height:40px}
.staff-page .staff-empty{padding:22px 16px;border:1px solid var(--line);border-radius:14px;background:var(--panel);color:var(--muted);text-align:center}
.staff-page .staff-help{margin:0;color:var(--muted);font-size:12px}
.staff-page .staff-add-panel{padding:18px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}
.staff-page .staff-add-panel h2{margin:0 0 14px;font-size:1.1rem}
.staff-page .staff-add-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.staff-page .staff-add-form label{display:grid;gap:5px;min-width:0;color:var(--muted);font-size:12px}
.staff-page .staff-add-form input,.staff-page .staff-add-form select{box-sizing:border-box;width:100%;min-width:0}
.staff-page .staff-create{align-self:end;min-height:42px}

`;

export default function StaffPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [adding, setAdding] = useState(false);
  const [nRole, setNRole] = useState("");
  const [nLevel, setNLevel] = useState("");
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const load = useCallback(async () => {
    const [staffRes, rolesRes] = await Promise.all([fetch("/api/admin/admins", { cache: "no-store" }), fetch("/api/admin/roles", { cache: "no-store" })]);
    if (staffRes.ok) setStaff(await staffRes.json());
    if (rolesRes.ok) setRoles(await rolesRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/admin/me").then(async response => {
      if (!response.ok) { window.location.href = "/auth"; return; }
      const current: Me = await response.json();
      if (!current.canManageStaff) { window.location.href = "/admin"; return; }
      setMe(current);
      await load();
    }).catch(() => { setMsg("Could not load your admin session. Please refresh and try again."); setLoading(false); });
  }, [load]);

  useEffect(() => {
    const refresh = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 30_000);
    return () => window.clearInterval(refresh);
  }, [load]);

  async function issueInvite(id: string) {
    const response = await fetch(`/api/admin/admins/${id}/invite`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setMsg(data.error ?? "Could not issue invitation."); return; }
    setInvite({ id: data.invitationId, url: data.invitationUrl, expiresAt: data.expiresAt });
    setMsg("Private invitation created. Copy it and share it directly with the staff member.");
  }

  function recoverPasskeys(id: string) {
    setConfirmation({
      title: "Reset staff passkeys?",
      message: "This will sign the staff member out on every device, remove all registered passkeys, and create a fresh one-use recovery invitation. They will need to accept it and register a new passkey.",
      confirmLabel: "Reset passkeys",
      tone: "danger",
      onConfirm: async () => {
        const response = await fetch(`/api/admin/admins/${id}/passkeys/reset`, { method: "POST" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) { setMsg(data.error ?? "Could not reset passkeys."); return; }
        setInvite({ id: data.invitationId, url: data.invitationUrl, expiresAt: data.expiresAt });
        setMsg("All passkeys and sessions were revoked. Copy the recovery invitation and share it privately.");
      },
    });
  }

  async function revokeInvite() {
    if (!invite) return;
    const response = await fetch(`/api/admin/invitations/${invite.id}/revoke`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setMsg(response.ok ? "Invitation revoked." : data.error ?? "Could not revoke invitation.");
    if (response.ok) setInvite(null);
  }

  function revokeSessions(id: string) {
    setConfirmation({
      title: "Sign out this staff member everywhere?",
      message: "All active sessions on their devices will be revoked. Their registered passkeys will remain available for their next sign-in.",
      confirmLabel: "Sign out all devices",
      tone: "danger",
      onConfirm: async () => {
        const response = await fetch(`/api/admin/admins/${id}/sessions/revoke`, { method: "POST" });
        const data = await response.json().catch(() => ({}));
        setMsg(response.ok ? `Revoked ${data.revoked} active session(s).` : data.error ?? "Could not revoke sessions.");
      },
    });
  }

  function deleteStaff(person: Staff) {
    setConfirmation({
      title: "Permanently delete this staff account?",
      message: `${person.name} (${person.email}) will be removed, including their passkeys, invitations, sessions, complaint responses, internal notes and audit entries. Complaint records remain, but this account deletion cannot be undone.`,
      confirmLabel: "Delete staff account",
      tone: "danger",
      onConfirm: async () => {
        const response = await fetch(`/api/admin/admins/${person.id}`, { method: "DELETE" });
        const data = await response.json().catch(() => ({}));
        setMsg(response.ok ? `${person.name} was permanently deleted.` : data.error ?? "Could not delete staff account.");
        if (response.ok) await load();
      },
    });
  }

  async function patch(id: string, body: object) {
    const response = await fetch(`/api/admin/admins/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    setMsg(response.ok ? "Staff changes saved." : data.error ?? "Could not save changes.");
    if (response.ok) await load();
  }

  const visibleStaff = staff.filter(person => {
    const query = search.trim().toLowerCase();
    const matchQuery = !query || [person.name, person.email, person.title, person.gameId ?? ""].some(value => value.toLowerCase().includes(query));
    const matchFilter = filter === "ALL" ||
      (filter === "ADMINS" && person.kind === "ADMIN" && !person.suspended) ||
      (filter === "TOP_TIER" && person.kind !== "ADMIN") ||
      (filter === "ACTIVE" && person.presence === "ACTIVE") ||
      (filter === "PENDING" && person.presence === "PENDING") ||
      (filter === "SUSPENDED" && person.presence === "SUSPENDED") ||
      (filter === "INACTIVE" && person.presence === "INACTIVE");
    return matchQuery && matchFilter;
  });

  if (!me) return <main className="staff-page"><style>{staffStyles}</style><div className="staff-empty">Loading staff…</div></main>;
  const levels = me.kind !== "ADMIN" ? [1, 2, 3, 4, 5, 6] : Array.from({ length: Math.max(0, Math.min(5, me.level - 1)) }, (_, i) => i + 1);
  const assignable = roles.filter(role => role.active && role.assignable);
  const chosen = assignable.find(role => role.id === nRole);
  const chosenLevels = chosen ? levelsFor(chosen, levels) : [];

  function pickRole(id: string) {
    setNRole(id);
    const role = assignable.find(item => item.id === id);
    setNLevel(role && role.kind === "ADMIN" ? String(levelsFor(role, levels)[0] ?? "") : "");
  }

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    if (!nRole) { setMsg("Choose a role before creating the staff account."); return; }
    const response = await fetch("/api/admin/admins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fields.name, email: fields.email, roleId: nRole,
        level: chosen?.kind === "ADMIN" ? Number(nLevel) : undefined }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setMsg(data.error ?? "Could not create staff account."); return; }
    setMsg("Staff account created. Copy the private invitation link and share it directly with the new staff member.");
    if (data.invitationId && data.invitationUrl && data.expiresAt) {
      setInvite({ id: data.invitationId, url: data.invitationUrl, expiresAt: data.expiresAt });
    }
    form.reset(); setNRole(""); setNLevel(""); setAdding(false); await load();
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "ALL", label: "All" }, { id: "ADMINS", label: "Admins" },
    { id: "TOP_TIER", label: "Top tier" }, { id: "ACTIVE", label: "Active" },
    { id: "PENDING", label: "Pending" }, { id: "SUSPENDED", label: "Suspended" },
    { id: "INACTIVE", label: "Inactive" },
  ];

  return (
    <main className="staff-page">
      <style>{staffStyles}</style>
      <header className="staff-header"><div><h1>Staff</h1><p className="staff-count">{staff.length} {staff.length === 1 ? "person" : "people"}</p></div>
        <button type="button" className="primary staff-add" onClick={() => setAdding(value => !value)}>{adding ? "Cancel" : "+ Add staff"}</button>
      </header>
      {msg && <p role="status" aria-live="polite" className="staff-message">{msg}</p>}
      {invite && <section className="staff-invite-panel"><strong>Private staff invitation</strong><div className="staff-invite-url">{invite.url}</div><small>Expires {new Date(invite.expiresAt).toLocaleString()}</small><div className="staff-invite-actions"><button type="button" className="primary" onClick={() => navigator.clipboard.writeText(invite.url).then(() => setMsg("Invitation link copied."))}>Copy invitation link</button><button type="button" onClick={revokeInvite}>Revoke link</button></div><small>Anyone with this link can activate the assigned staff account once. Share it privately.</small></section>}
      {adding && <section className="staff-add-panel">
        <h2>Add staff</h2>
        <form onSubmit={add} className="staff-add-form">
          <label><span>Name</span><input name="name" placeholder="Staff name" required /></label>
          <label><span>Email</span><input name="email" type="email" placeholder="name@example.com" required /></label>
          <div className="staff-role-picker-field"><span className="staff-input-label">Role</span><RoleSelect value={nRole} options={roleSelectOptions(assignable)} onChange={pickRole} placeholder="Choose a role…" ariaLabel="New staff role" /></div>
          {chosen?.kind === "ADMIN" && <label><span>Level</span><select value={nLevel} onChange={e => setNLevel(e.target.value)} required aria-label="Level">
            {chosenLevels.map(level => <option key={level} value={level}>Level {level}</option>)}
          </select></label>}
          <button type="submit" className="primary staff-create">Create staff account</button>
        </form>
      </section>}
      <label className="staff-search">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.8" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="m13 13 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or game account…" aria-label="Search staff" />
        {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")}>×</button>}
      </label>
      <div className="staff-filters" role="group" aria-label="Filter staff">
        {filters.map(option => <button key={option.id} type="button" className={filter === option.id ? "chip on" : "chip"} onClick={() => setFilter(option.id)}>{option.label}</button>)}
      </div>
      <section className="staff-list" aria-label="Staff accounts">
        {loading ? <div className="staff-empty">Loading staff accounts…</div> : visibleStaff.length ? visibleStaff.map(person =>
          <StaffRow key={[person.id, person.roleId, person.level, person.suspended, person.gameId, person.extraRights.join()].join("|")}
            s={person} me={me} levels={levels} roles={roles} onPatch={patch} onInvite={issueInvite} onRecover={recoverPasskeys} onRevokeSessions={revokeSessions} onDelete={deleteStaff} />
        ) : <div className="staff-empty">No staff match this search or filter.</div>}
      </section>
      <p className="staff-help">A role is a title and limits which levels it can have. Levels 1 and 2 cannot sign in to the website. You can only change people ranked below you.</p>
      <ConfirmDialog open={!!confirmation} title={confirmation?.title ?? ""} message={confirmation?.message ?? ""} confirmLabel={confirmation?.confirmLabel} tone={confirmation?.tone} onConfirm={confirmation?.onConfirm ?? (async () => {})} onClose={() => setConfirmation(null)} />
    </main>
  );
}