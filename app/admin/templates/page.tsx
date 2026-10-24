// PATH: app/admin/templates/page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { PLACEHOLDERS, VERDICT_LABEL, type Verdict } from "@/lib/templates";

type Cat = { id: string; name: string };
type Tpl = { id: string; name: string; body: string; verdict: Verdict | null; active: boolean; categoryId: string; category: { name: string } };

const box: React.CSSProperties = { border: "1px solid #2a2540", borderRadius: 8, padding: 14 };

export default function TemplatesPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [editing, setEditing] = useState<Tpl | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [verdict, setVerdict] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [c, t] = await Promise.all([fetch("/api/admin/categories"), fetch("/api/admin/templates?all=1")]);
    if (c.ok) setCats(await c.json());
    if (t.ok) setTpls(await t.json());
  }, []);

  useEffect(() => {
    fetch("/api/admin/me").then(async r => {
      if (!r.ok) { window.location.href = "/auth"; return; }
      const me = await r.json();
      if (!me.canManageTemplates) { window.location.href = "/admin"; return; }
      load();
    });
  }, [load]);

  function reset() { setEditing(null); setName(""); setVerdict(""); setBody(""); }

  function edit(t: Tpl) {
    setEditing(t); setCategoryId(t.categoryId); setName(t.name); setVerdict(t.verdict ?? ""); setBody(t.body); setMsg("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = { categoryId, name, body, verdict: verdict || null };
    const res = await fetch(editing ? `/api/admin/templates/${editing.id}` : "/api/admin/templates", {
      method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Saved." : data.error ?? "Could not save");
    if (res.ok) { reset(); load(); }
  }

  async function toggle(t: Tpl) {
    await fetch(`/api/admin/templates/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !t.active }) });
    load();
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 20, display: "grid", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.4rem" }}>Reply templates</h1>
        <a href="/admin">Back to complaints</a>
      </header>

      <section style={box}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 10 }}>{editing ? `Edit: ${editing.name}` : "New template"}</h2>
        <form onSubmit={save} style={{ display: "grid", gap: 8 }}>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
            <option value="">Category…</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Template name" required />
          <select value={verdict} onChange={e => setVerdict(e.target.value)}>
            <option value="">Any verdict</option>
            {(Object.keys(VERDICT_LABEL) as Verdict[]).map(v => <option key={v} value={v}>{VERDICT_LABEL[v]}</option>)}
          </select>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={7} placeholder="Template text" required />
          <small style={{ color: "#9a95b5" }}>Placeholders: {PLACEHOLDERS.map(p => `{${p}}`).join("  ")}</small>
          <div style={{ display: "flex", gap: 8 }}>
            <button>{editing ? "Save changes" : "Add template"}</button>
            {editing && <button type="button" onClick={reset}>Cancel</button>}
          </div>
        </form>
        {msg && <p role="status" style={{ marginTop: 8 }}>{msg}</p>}
      </section>

      <section style={box}>
        {tpls.length === 0 && <p style={{ color: "#9a95b5" }}>No templates yet.</p>}
        {tpls.map(t => (
          <div key={t.id} style={{ borderBottom: "1px solid #2a2540", padding: "10px 0", opacity: t.active ? 1 : 0.5 }}>
            <strong>{t.name}</strong> <small style={{ color: "#9a95b5" }}>· {t.category.name} · {t.verdict ? VERDICT_LABEL[t.verdict] : "any verdict"}{t.active ? "" : " · switched off"}</small>
            <p style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{t.body}</p>
            <button onClick={() => edit(t)}>Edit</button> <button onClick={() => toggle(t)}>{t.active ? "Switch off" : "Switch on"}</button>
          </div>
        ))}
      </section>
    </main>
  );
}