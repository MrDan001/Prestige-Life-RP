// PATH: app/admin/categories/page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";

type Cat = { id: string; name: string; minReplyLevel: number; minCloseLevel: number; active: boolean };

const box: React.CSSProperties = { border: "1px solid #2a2540", borderRadius: 8, padding: 14 };
const muted = "#9a95b5";
const LEVELS = [3, 4, 5, 6]; // levels 1-2 cannot use the website, so 3 is the lowest useful value

function CatRow({ c, onPatch }: { c: Cat; onPatch: (id: string, body: object) => void }) {
  const [name, setName] = useState(c.name);
  const [reply, setReply] = useState(Math.max(3, c.minReplyLevel));
  const [close, setClose] = useState(Math.max(3, c.minCloseLevel));
  const changed = name !== c.name || reply !== c.minReplyLevel || close !== c.minCloseLevel;

  return (
    <div style={{ borderBottom: "1px solid #2a2540", padding: "12px 0", opacity: c.active ? 1 : 0.5 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: 170 }} />
        <label>Reply from <select value={reply} onChange={e => setReply(Number(e.target.value))}>{LEVELS.map(l => <option key={l}>{l}</option>)}</select></label>
        <label>Close from <select value={close} onChange={e => setClose(Number(e.target.value))}>{LEVELS.map(l => <option key={l}>{l}</option>)}</select></label>
        <button disabled={!changed || name.trim().length < 2} onClick={() => onPatch(c.id, { name, minReplyLevel: reply, minCloseLevel: close })}>Save</button>
        <button onClick={() => onPatch(c.id, { active: !c.active })}>{c.active ? "Switch off" : "Switch on"}</button>
      </div>
      {!c.active && <small style={{ color: muted }}>Switched off: the game no longer offers this category.</small>}
    </div>
  );
}

export default function CategoriesPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/categories");
    if (r.ok) setCats(await r.json());
  }, []);

  useEffect(() => {
    fetch("/api/admin/me").then(async r => {
      if (!r.ok) { window.location.href = "/auth"; return; }
      if (!(await r.json()).canManageCategories) { window.location.href = "/admin"; return; }
      load();
    });
  }, [load]);

  async function patch(id: string, body: object) {
    const res = await fetch(`/api/admin/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Saved." : d.error ?? "Could not save");
    if (res.ok) load();
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const res = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Category added." : d.error ?? "Could not add");
    if (res.ok) { form.reset(); load(); }
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 20, display: "grid", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.4rem" }}>Complaint categories</h1>
        <a href="/admin">Back to complaints</a>
      </header>
      {msg && <p role="status">{msg}</p>}

      <section style={box}>
        {cats.map(c => <CatRow key={c.id + c.name + c.minReplyLevel + c.minCloseLevel + c.active} c={c} onPatch={patch} />)}
        <p style={{ color: muted, marginTop: 10, fontSize: ".85rem" }}>
          &quot;Reply from&quot; and &quot;Close from&quot; are the lowest levels allowed. A complaint against an admin, senior admin or chief still needs a higher level, and complaints against the owner, tech or developers stay with them.
        </p>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 10 }}>Add category</h2>
        <form onSubmit={add} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input name="name" placeholder="Category name" required />
          <label>Reply from <select name="minReplyLevel" defaultValue={3}>{LEVELS.map(l => <option key={l}>{l}</option>)}</select></label>
          <label>Close from <select name="minCloseLevel" defaultValue={4}>{LEVELS.map(l => <option key={l}>{l}</option>)}</select></label>
          <button>Add</button>
        </form>
      </section>
    </main>
  );
}