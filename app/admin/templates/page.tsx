// PATH: app/admin/templates/page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { PLACEHOLDERS, VERDICT_LABEL, type Verdict } from "@/lib/templates";

type Cat = { id: string; name: string };
type Tpl = {
  id: string; name: string; body: string; verdict: Verdict | null; active: boolean; categoryId: string | null;
  minLevel: number; closesAs: "RESOLVED" | "DISMISSED" | null; category: { name: string } | null;
};

const muted = "#a7a2c2";
const panel: React.CSSProperties = { border: "1px solid #2a2540", background: "#13111f", borderRadius: 12, padding: 16 };

export default function JudgmentsPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [editing, setEditing] = useState<Tpl | null>(null);
  const [scope, setScope] = useState("");
  const [name, setName] = useState("");
  const [minLevel, setMinLevel] = useState("3");
  const [outcome, setOutcome] = useState("");
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
      if (!(await r.json()).canManageTemplates) { window.location.href = "/admin"; return; }
      load();
    });
  }, [load]);

  function reset() { setEditing(null); setScope(""); setName(""); setMinLevel("3"); setOutcome(""); setVerdict(""); setBody(""); }
  function edit(t: Tpl) {
    setEditing(t); setScope(t.categoryId ?? ""); setName(t.name); setMinLevel(String(t.minLevel)); setOutcome(t.closesAs ?? ""); setVerdict(t.verdict ?? ""); setBody(t.body); setMsg("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = { categoryId: scope || null, name, minLevel: Number(minLevel), closesAs: outcome || null, verdict: verdict || null, body };
    const res = await fetch(editing ? `/api/admin/templates/${editing.id}` : "/api/admin/templates", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Saved." : d.error ?? "Could not save");
    if (res.ok) { reset(); load(); }
  }
  async function toggle(t: Tpl) {
    await fetch(`/api/admin/templates/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !t.active }) });
    load();
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, display: "grid", gap: 20 }}>
      <header><h1>Judgments</h1><p style={{ color: muted, margin: "4px 0 0" }}>The one-click buttons admins use to answer a complaint. Each one has a lowest level, a verdict, and what it does to the complaint.</p></header>

      <section style={panel}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 10 }}>{editing ? `Edit: ${editing.name}` : "New judgment"}</h2>
        <form onSubmit={save} style={{ display: "grid", gap: 10 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Button name, e.g. Rejected (lack of evidence)" required />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label>Used on <select value={scope} onChange={e => setScope(e.target.value)}><option value="">Every category</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Lowest level <select value={minLevel} onChange={e => setMinLevel(e.target.value)}>{[3, 4, 5, 6].map(l => <option key={l} value={l}>Level {l}</option>)}</select></label>
            <label>When sent <select value={outcome} onChange={e => setOutcome(e.target.value)}><option value="">Only reply</option><option value="RESOLVED">Resolve the complaint</option><option value="DISMISSED">Dismiss the complaint</option></select></label>
            <label>Verdict <select value={verdict} onChange={e => setVerdict(e.target.value)}><option value="">None</option>{(Object.keys(VERDICT_LABEL) as Verdict[]).map(v => <option key={v} value={v}>{VERDICT_LABEL[v]}</option>)}</select></label>
          </div>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={7} placeholder="Reply text" required />
          <small style={{ color: muted }}>Placeholders: {PLACEHOLDERS.map(p => `{${p}}`).join("  ")}. {"{favoured}"} and {"{verdict}"} need a verdict.</small>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="primary">{editing ? "Save changes" : "Add judgment"}</button>
            {editing && <button type="button" onClick={reset}>Cancel</button>}
          </div>
        </form>
        {msg && <p role="status" style={{ marginTop: 8 }}>{msg}</p>}
      </section>

      <section style={panel}>
        {tpls.length === 0 && <p style={{ color: muted }}>No judgments yet.</p>}
        {tpls.map(t => (
          <div key={t.id} style={{ borderBottom: "1px solid #2a2540", padding: "12px 0", opacity: t.active ? 1 : 0.55 }}>
            <strong>{t.name}</strong>{" "}
            <small style={{ color: muted }}>
              · level {t.minLevel}+ · {t.category?.name ?? "every category"} · {t.closesAs ? (t.closesAs === "RESOLVED" ? "resolves" : "dismisses") : "reply only"}
              {t.verdict ? ` · ${VERDICT_LABEL[t.verdict]}` : ""}{t.active ? "" : " · switched off"}
            </small>
            <p style={{ whiteSpace: "pre-wrap", margin: "6px 0", color: "#d9d5ee" }}>{t.body}</p>
            <button onClick={() => edit(t)}>Edit</button> <button onClick={() => toggle(t)}>{t.active ? "Switch off" : "Switch on"}</button>
          </div>
        ))}
      </section>
    </main>
  );
}