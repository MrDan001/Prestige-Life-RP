// PATH: app/admin/staff/page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { RIGHTS } from "@/lib/permissions";

type Me = { kind: string; level: number; canManageStaff: boolean };
type RoleInfo = { name: string; kind: string; minLevel: number; maxLevel: number };
type Staff = {
  id: string; email: string; name: string; title: string; kind: string; level: number; extraRights: string[];
  gameId: string | null; suspended: boolean; canManage: boolean; roleId: string | null; role: RoleInfo | null;
};
type Role = { id: string; name: string; kind: string; minLevel: number; maxLevel: number; active: boolean; assignable: boolean };

const box: React.CSSProperties = { border: "1px solid #2a2540", background: "#13111f", borderRadius: 12, padding: 16 };
const muted = "#a7a2c2";
const RIGHT_LABEL: Record<string, string> = { MANAGE_CATEGORIES: "Edit categories", MANAGE_STAFF: "Manage staff", MANAGE_TEMPLATES: "Edit judgments", MANAGE_SITE: "Edit home page" };

const levelsFor = (r: { kind: string; minLevel: number; maxLevel: number }, levels: number[]) => (r.kind === "ADMIN" ? levels.filter(l => l >= r.minLevel && l <= r.maxLevel) : []);
const nearest = (allowed: number[], level: number) => allowed.reduce((best, l) => (Math.abs(l - level) < Math.abs(best - level) ? l : best), allowed[0]);

function StaffRow({ s, me, levels, roles, onPatch }: { s: Staff; me: Me; levels: number[]; roles: Role[]; onPatch: (id: string, body: object) => void }) {
  const [rights, setRights] = useState<string[]>(s.extraRights);
  const roleOptions = roles.filter(r => (r.active && r.assignable) || r.id === s.roleId);
  const levelOptions = s.role ? levelsFor(s.role, levels) : levels;
  const lvlOpts = levelOptions.includes(s.level) ? levelOptions : [...levelOptions, s.level].sort();

  function changeRole(id: string) {
    const r = roles.find(x => x.id === id);
    if (!r) return;
    if (r.kind !== "ADMIN") return onPatch(s.id, { roleId: id });
    const allowed = levelsFor(r, levels);
    if (allowed.length) onPatch(s.id, { roleId: id, level: nearest(allowed, s.level) });
  }

  return (
    <div style={{ borderBottom: "1px solid #2a2540", padding: "12px 0", opacity: s.suspended ? 0.6 : 1 }}>
      <strong>{s.name}</strong> <small style={{ color: muted }}>{s.email} · {s.title} · {s.kind === "ADMIN" ? `level ${s.level}` : "top tier, full rights"}{s.suspended ? " · SUSPENDED" : ""}</small>
      <div style={{ color: muted, fontSize: ".85rem" }}>Game account: {s.gameId ?? "not linked"}</div>
      {s.canManage && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
          <select value={s.roleId ?? ""} onChange={e => changeRole(e.target.value)} aria-label={`Role for ${s.name}`}>
            {!s.roleId && <option value="">No role yet</option>}
            {roleOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {s.kind === "ADMIN" && (
            <select value={s.level} onChange={e => onPatch(s.id, { level: Number(e.target.value) })} aria-label={`Level for ${s.name}`}>
              {lvlOpts.map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
          )}
          <button onClick={() => onPatch(s.id, { suspended: !s.suspended })}>{s.suspended ? "Restore" : "Suspend"}</button>
          {s.gameId && <button onClick={() => onPatch(s.id, { gameId: null })}>Unlink game account</button>}
        </div>
      )}
      {s.canManage && me.kind === "OWNER" && s.kind === "ADMIN" && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
          <small style={{ color: muted }}>Personal extra rights:</small>
          {RIGHTS.map(r => (
            <label key={r}><input type="checkbox" checked={rights.includes(r)} onChange={e => setRights(e.target.checked ? [...rights, r] : rights.filter(x => x !== r))} /> {RIGHT_LABEL[r]}</label>
          ))}
          <button disabled={[...rights].sort().join() === [...s.extraRights].sort().join()} onClick={() => onPatch(s.id, { extraRights: rights })}>Save rights</button>
        </div>
      )}
    </div>
  );
}

export default function StaffPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [msg, setMsg] = useState("");
  const [nRole, setNRole] = useState("");
  const [nLevel, setNLevel] = useState("");

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([fetch("/api/admin/admins"), fetch("/api/admin/roles")]);
    if (s.ok) setStaff(await s.json());
    if (r.ok) setRoles(await r.json());
  }, []);

  useEffect(() => {
    fetch("/api/admin/me").then(async r => {
      if (!r.ok) { window.location.href = "/auth"; return; }
      const m: Me = await r.json();
      if (!m.canManageStaff) { window.location.href = "/admin"; return; }
      setMe(m); load();
    });
  }, [load]);

  async function patch(id: string, body: object) {
    const res = await fetch(`/api/admin/admins/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Saved." : d.error ?? "Could not save");
    if (res.ok) load();
  }

  if (!me) return <main style={{ padding: 24 }}>Loading…</main>;
  const levels = me.kind !== "ADMIN" ? [1, 2, 3, 4, 5, 6] : Array.from({ length: Math.max(0, Math.min(5, me.level - 1)) }, (_, i) => i + 1);
  const assignable = roles.filter(r => r.active && r.assignable);
  const chosen = assignable.find(r => r.id === nRole);
  const chosenLevels = chosen ? levelsFor(chosen, levels) : [];

  function pickRole(id: string) {
    setNRole(id);
    const r = assignable.find(x => x.id === id);
    setNLevel(r && r.kind === "ADMIN" ? String(levelsFor(r, levels)[0] ?? "") : "");
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form));
    const res = await fetch("/api/admin/admins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.name, email: f.email, password: f.password, roleId: nRole, level: chosen?.kind === "ADMIN" ? Number(nLevel) : undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Staff account created." : d.error ?? "Could not create");
    if (res.ok) { form.reset(); setNRole(""); setNLevel(""); load(); }
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, display: "grid", gap: 20 }}>
      <header><h1>Staff</h1></header>
      {msg && <p role="status">{msg}</p>}

      <section style={box}>
        {staff.map(s => <StaffRow key={[s.id, s.roleId, s.level, s.suspended, s.gameId, s.extraRights.join()].join("|")} s={s} me={me} levels={levels} roles={roles} onPatch={patch} />)}
        <p style={{ color: muted, marginTop: 10, fontSize: ".85rem" }}>
          A role is a title and limits which levels it can have. Levels 1 and 2 cannot sign in to the website. You can only change people ranked below you.
        </p>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 10 }}>Add staff</h2>
        <form onSubmit={add} style={{ display: "grid", gap: 8, maxWidth: 360 }}>
          <input name="name" placeholder="Name" required />
          <input name="email" type="email" placeholder="Email" required />
          <select value={nRole} onChange={e => pickRole(e.target.value)} required aria-label="Role">
            <option value="">Choose a role…</option>
            {assignable.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {chosen?.kind === "ADMIN" && (
            <select value={nLevel} onChange={e => setNLevel(e.target.value)} required aria-label="Level">
              {chosenLevels.map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
          )}
          <input name="password" type="password" placeholder="Password (10+ characters)" minLength={10} required />
          <button className="primary">Add staff</button>
        </form>
      </section>
    </main>
  );
}