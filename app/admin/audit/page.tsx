// PATH: app/admin/audit/page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";

type Item = { id: string; at: string; actor: string; action: string; detail: string; target: string | null };

const box: React.CSSProperties = { border: "1px solid #2a2540", borderRadius: 8, padding: 14 };
const muted = "#9a95b5";
const LABEL: Record<string, string> = {
  STAFF_CREATE: "Created staff", STAFF_UPDATE: "Changed staff", STAFF_LINK: "Linked game account", STAFF_UNLINK: "Unlinked game account",
  CATEGORY_CREATE: "Added category", CATEGORY_UPDATE: "Changed category", TEMPLATE_CREATE: "Added template", TEMPLATE_UPDATE: "Changed template",
  COMPLAINT_STATUS: "Changed complaint status", COMPLAINT_CLAIM: "Claimed complaint", COMPLAINT_RELEASE: "Released complaint", COMPLAINT_VERDICT: "Set verdict", SETTINGS_UPDATE: "Changed site settings", ROLE_CREATE: "Added role", ROLE_UPDATE: "Changed role",
};

export default function AuditPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    const q = new URLSearchParams();
    if (action) q.set("action", action);
    if (cursor) q.set("cursor", cursor);
    const r = await fetch("/api/admin/audit?" + q);
    if (!r.ok) return;
    const d = await r.json();
    setItems(prev => (cursor ? [...prev, ...d.items] : d.items));
    setNext(d.nextCursor);
  }, [action]);

  useEffect(() => {
    fetch("/api/admin/me").then(async r => {
      if (!r.ok) { window.location.href = "/auth"; return; }
      if (!(await r.json()).canManageStaff) { window.location.href = "/admin"; return; }
      setReady(true);
    });
  }, []);
  useEffect(() => { if (ready) load(); }, [ready, load]);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 20, display: "grid", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.4rem" }}>Audit log</h1>
        <a href="/admin">Back to complaints</a>
      </header>

      <section style={box}>
        <select value={action} onChange={e => setAction(e.target.value)} style={{ marginBottom: 10 }}>
          <option value="">All actions</option>
          {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {items.length === 0 && <p style={{ color: muted }}>Nothing logged yet.</p>}
        <div style={{ overflowX: "auto" }}>
          {items.map(i => (
            <div key={i.id} style={{ borderBottom: "1px solid #2a2540", padding: "8px 0" }}>
              <small style={{ color: muted }}>{new Date(i.at).toLocaleString()}</small><br />
              <strong>{i.actor}</strong> · {LABEL[i.action] ?? i.action}{i.target ? <> · {i.target}</> : null}
              <div style={{ color: muted, fontSize: ".85rem", wordBreak: "break-word" }}>{i.detail}</div>
            </div>
          ))}
        </div>
        {next && <button onClick={() => load(next)} style={{ marginTop: 10 }}>Load more</button>}
      </section>
    </main>
  );
}