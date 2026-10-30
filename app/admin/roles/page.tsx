// PATH: app/admin/roles/page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { RIGHTS } from "@/lib/permissions";

type Role = { id: string; name: string; kind: string; minLevel: number; maxLevel: number; extraRights: string[]; system: boolean; active: boolean; _count: { admins: number } };

const box: React.CSSProperties = { border: "1px solid #2a2540", background: "#13111f", borderRadius: 12, padding: 16 };
const muted = "#a7a2c2";
const RIGHT_LABEL: Record<string, string> = { MANAGE_CATEGORIES: "Edit categories", MANAGE_STAFF: "Manage staff", MANAGE_TEMPLATES: "Edit judgments", MANAGE_SITE: "Edit home page" };
const LEVELS = [1, 2, 3, 4, 5, 6];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [min, setMin] = useState("3");
  const [max, setMax] = useState("4");
  const [rights, setRights] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/roles", { cache: "no-store" });
    if (r.ok) setRoles(await r.json());
  }, []);

  useEffect(() => {
    fetch("/api/admin/me").then(async r => {
      if (!r.ok) { window.location.href = "/auth"; return; }
      if ((await r.json()).kind !== "OWNER") { window.location.href = "/admin"; return; }
      load();
    });
  }, [load]);

  function reset() { setEditing(null); setName(""); setMin("3"); setMax("4"); setRights([]); }
  function edit(r: Role) { setEditing(r); setName(r.name); setMin(String(r.minLevel)); setMax(String(r.maxLevel)); setRights(r.extraRights); setMsg(""); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(editing ? `/api/admin/roles/${editing.id}` : "/api/admin/roles", {
      method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, minLevel: Number(min), maxLevel: Number(max), extraRights: rights }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Saved." : d.error ?? "Could not save");
    if (res.ok) { reset(); load(); }
  }
  async function toggle(r: Role) {
    const res = await fetch(`/api/admin/roles/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !r.active }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Saved." : d.error ?? "Could not save");
    load();
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, display: "grid", gap: 20 }}>
      <header>
        <h1>Roles</h1>
        <p style={{ color: muted, margin: "4px 0 0" }}>A role is a title that can only be given at certain levels. Rights come from the level. A custom role can also add extra rights.</p>
      </header>

      <section style={box}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 10 }}>{editing ? `Edit: ${editing.name}` : "New custom role"}</h2>
        <form onSubmit={save} style={{ display: "grid", gap: 10 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Role name, e.g. Appeals lead" required />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label>Lowest level <select value={min} onChange={e => setMin(e.target.value)}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></label>
            <label>Highest level <select value={max} onChange={e => setMax(e.target.value)}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></label>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <small style={{ color: muted }}>Extra rights:</small>
            {RIGHTS.map(r => <label key={r}><input type="checkbox" checked={rights.includes(r)} onChange={e => setRights(e.target.checked ? [...rights, r] : rights.filter(x => x !== r))} /> {RIGHT_LABEL[r]}</label>)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="primary">{editing ? "Save changes" : "Add role"}</button>
            {editing && <button type="button" onClick={reset}>Cancel</button>}
          </div>
        </form>
        {msg && <p role="status" style={{ marginTop: 8 }}>{msg}</p>}
      </section>

      <section style={box}>
        {roles.map(r => (
          <div key={r.id} style={{ borderBottom: "1px solid #2a2540", padding: "12px 0", opacity: r.active ? 1 : 0.55 }}>
            <strong>{r.name}</strong>{" "}
            <small style={{ color: muted }}>
              · {r.kind === "ADMIN" ? (r.minLevel === r.maxLevel ? `level ${r.minLevel}` : `levels ${r.minLevel}-${r.maxLevel}`) : "top tier, full rights"}
              {r.extraRights.length ? ` · extra: ${r.extraRights.map(x => RIGHT_LABEL[x]).join(", ")}` : ""} · {r._count.admins} {r._count.admins === 1 ? "person" : "people"}
              {r.system ? " · built-in" : ""}{r.active ? "" : " · switched off"}
            </small>
            {!r.system && <div style={{ marginTop: 6 }}><button onClick={() => edit(r)}>Edit</button> <button onClick={() => toggle(r)}>{r.active ? "Switch off" : "Switch on"}</button></div>}
          </div>
        ))}
      </section>
    </main>
  );
}