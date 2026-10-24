// PATH: app/admin/page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";

type Me = { id: string; name: string; email: string; title: string; kind: string; level: number; gameId: string | null; canManageStaff: boolean; canManageTemplates: boolean };
type Row = {
  id: string; message: string; status: string; createdAt: string;
  player: { username: string }; category: { id: string; name: string };
  claimedBy: { name: string } | null; accusedAdmin: { name: string } | null;
  _count: { responses: number }; canReply: boolean; canClose: boolean;
};
type Item = { type: "reply" | "note" | "event"; at: string; by: string; text: string; delivered: boolean };
type Detail = Row & {
  accusedName: string | null; player: { username: string; gameId: string };
  claimedById: string | null; canNote: boolean; lockedByClaim: boolean; timeline: Item[]; verdict: string | null; evidence: Ev[];
};
type AdminRow = { id: string; email: string; name: string; title: string; kind: string; level: number };

type Ev = { id: string; kind: "IMAGE" | "VIDEO" | "LINK" | "TEXT"; url: string | null; text: string | null; caption: string | null };
type Tpl = { id: string; name: string; verdict: string | null };

const STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"];
const VERDICTS: Record<string, string> = { COMPLAINANT: "In favour of the complainant", ACCUSED: "In favour of the accused", INSUFFICIENT: "Insufficient evidence" };
const box: React.CSSProperties = { border: "1px solid #2a2540", borderRadius: 8, padding: 14 };
const muted = "#9a95b5";

export default function AdminPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [filter, setFilter] = useState("");
  const [claimed, setClaimed] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Detail | null>(null);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [verdict, setVerdict] = useState("");
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [tplId, setTplId] = useState("");

  const loadList = useCallback(async () => {
    const q = new URLSearchParams();
    if (filter) q.set("status", filter);
    if (claimed) q.set("claimed", claimed);
    const res = await fetch("/api/admin/complaints?" + q);
    if (res.status === 401) { window.location.href = "/auth"; return; }
    setRows(await res.json());
  }, [filter, claimed]);

  const loadAdmins = useCallback(async () => {
    const res = await fetch("/api/admin/admins");
    if (res.ok) setAdmins(await res.json());
  }, []);

  const reloadMe = useCallback(async () => {
    const r = await fetch("/api/admin/me");
    if (r.ok) setMe(await r.json()); else window.location.href = "/auth";
  }, []);

  useEffect(() => { reloadMe(); }, [reloadMe]);
  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { if (me?.canManageStaff) loadAdmins(); }, [me?.canManageStaff, loadAdmins]);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? "" : data.error ?? "Something went wrong");
    return res.ok;
  }

  async function select(id: string) {
    const d: Detail = await (await fetch(`/api/admin/complaints/${id}`)).json();
    setOpen(d); setVerdict(d.verdict ?? ""); setTplId("");
    const t = await fetch(`/api/admin/templates?categoryId=${d.category.id}`);
    setTpls(t.ok ? await t.json() : []);
  }
  async function refresh(id: string) { await select(id); loadList(); }

  async function update(body: { reply?: string; status?: string; verdict?: string; templateId?: string }) {
    if (open && (await call(`/api/admin/complaints/${open.id}`, "PATCH", body))) {
      setReply(""); setMsg("Saved. Replies are sent to the game."); await refresh(open.id);
    }
  }
  async function useTemplate() {
    if (!open || !tplId) return;
    const res = await fetch(`/api/admin/complaints/${open.id}/draft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: tplId, verdict: verdict || undefined }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setReply(data.text); setMsg(""); } else setMsg(data.error ?? "Could not fill the template");
  }
  async function claim() { if (open && (await call(`/api/admin/complaints/${open.id}/claim`, "POST"))) await refresh(open.id); }
  async function release() { if (open && (await call(`/api/admin/complaints/${open.id}/claim`, "DELETE"))) await refresh(open.id); }
  async function addNote() {
    if (open && (await call(`/api/admin/complaints/${open.id}/notes`, "POST", { message: note }))) { setNote(""); await refresh(open.id); }
  }

  async function addAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (await call("/api/admin/admins", "POST", Object.fromEntries(new FormData(form)))) { form.reset(); setMsg("Admin created."); loadAdmins(); }
  }
  async function linkAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (await call("/api/admin/link", "POST", { code: new FormData(e.currentTarget).get("code") })) { setMsg("Game account linked."); reloadMe(); }
  }
  async function unlink() { if (await call("/api/admin/link", "DELETE")) { setMsg("Game account unlinked."); reloadMe(); } }
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/auth"; }

  if (!me) return <main style={{ padding: 24 }}>Loading…</main>;

  const mine = open?.claimedById === me.id;

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 20, display: "grid", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: "1.4rem" }}>Complaints <small style={{ color: muted }}>({me.name}, {me.title}{me.kind === "ADMIN" ? ` · level ${me.level}` : ""})</small></h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>{me.canManageTemplates && <a href="/admin/templates">Templates</a>}<button onClick={logout}>Sign out</button></div>
      </header>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <section style={box}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={claimed} onChange={e => setClaimed(e.target.value)}>
              <option value="">Everyone&apos;s</option>
              <option value="me">Claimed by me</option>
              <option value="none">Unclaimed</option>
            </select>
          </div>
          {rows.length === 0 && <p style={{ color: muted }}>No complaints found.</p>}
          {rows.map(r => (
            <button key={r.id} onClick={() => select(r.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: 10, marginBottom: 6, cursor: "pointer", background: open?.id === r.id ? "#241f3a" : "transparent", color: "inherit", border: "1px solid #2a2540", borderRadius: 6 }}>
              <strong>{r.category.name}</strong> · {r.player.username} · {r.status}<br />
              <small style={{ color: muted }}>
                {new Date(r.createdAt).toLocaleString()} · {r.claimedBy ? `handled by ${r.claimedBy.name}` : "unclaimed"}{r.accusedAdmin ? " · against staff" : ""}
              </small>
            </button>
          ))}
        </section>

        <section style={box}>
          {!open ? <p style={{ color: muted }}>Select a complaint.</p> : (
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <strong>{open.player.username}</strong> <small>(game ID {open.player.gameId})</small>
                {(open.accusedAdmin || open.accusedName) && <> vs <strong>{open.accusedAdmin?.name ?? open.accusedName}</strong></>}
              </div>
              <small style={{ color: muted }}>{open.category.name}</small>
              <p style={{ whiteSpace: "pre-wrap" }}>{open.message}</p>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span>{open.claimedBy ? <>Handled by <strong>{open.claimedBy.name}</strong></> : "Not claimed yet"}</span>
                {!open.claimedById && open.canReply && <button onClick={claim}>Claim</button>}
                {open.claimedById && !mine && !open.lockedByClaim && open.canNote && <button onClick={claim}>Take over</button>}
                {open.claimedById && (mine || !open.lockedByClaim) && <button onClick={release}>Release</button>}
                {open.lockedByClaim && <small style={{ color: muted }}>View only while claimed</small>}
              </div>

              <label>Status: <select value={open.status} disabled={!open.canReply} onChange={e => update({ status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>

              <div>
                <strong>Evidence ({open.evidence.length})</strong>
                {open.evidence.length === 0 && <p style={{ color: muted }}>No evidence attached.</p>}
                {open.evidence.map(ev => (
                  <div key={ev.id} style={{ marginTop: 6 }}>
                    {ev.caption && <small style={{ color: muted }}>{ev.caption}</small>}
                    {ev.kind === "IMAGE" && ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer"><img src={ev.url} alt={ev.caption ?? "evidence"} style={{ maxWidth: "100%", borderRadius: 6, display: "block" }} /></a>}
                    {ev.kind === "VIDEO" && ev.url && <video src={ev.url} controls style={{ maxWidth: "100%", borderRadius: 6, display: "block" }} />}
                    {ev.kind === "LINK" && ev.url && <p><a href={ev.url} target="_blank" rel="noopener noreferrer">{ev.url}</a></p>}
                    {ev.kind === "TEXT" && <pre style={{ whiteSpace: "pre-wrap", background: "#110f1c", padding: 8, borderRadius: 6 }}>{ev.text}</pre>}
                  </div>
                ))}
              </div>

              <label>Verdict: <select value={verdict} disabled={!open.canReply} onChange={e => setVerdict(e.target.value)}>
                <option value="">Not decided</option>
                {Object.entries(VERDICTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
              {open.canReply && verdict && verdict !== (open.verdict ?? "") && <button onClick={() => update({ verdict })}>Save verdict</button>}

              {open.timeline.map((t, i) => t.type === "event" ? (
                <small key={i} style={{ color: muted }}>{new Date(t.at).toLocaleString()} · {t.by} {t.text}</small>
              ) : (
                <div key={i} style={{ borderLeft: `3px ${t.type === "note" ? "dashed #d9a400" : "solid #ff2e93"}`, paddingLeft: 10 }}>
                  <small>{t.by} · {new Date(t.at).toLocaleString()} · {t.type === "note" ? "internal note, staff only" : t.delivered ? "delivered to game" : "waiting for game"}</small>
                  <p style={{ whiteSpace: "pre-wrap" }}>{t.text}</p>
                </div>
              ))}

              {open.canReply ? (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select value={tplId} onChange={e => setTplId(e.target.value)}>
                      <option value="">Choose a template…</option>
                      {tpls.filter(t => !t.verdict || !verdict || t.verdict === verdict).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button disabled={!tplId} onClick={useTemplate}>Fill from template</button>
                  </div>
                  <textarea value={reply} onChange={e => setReply(e.target.value)} rows={5} placeholder="Reply to the player (you can edit the template text)" />
                  <button disabled={!reply.trim()} onClick={() => update({ reply, verdict: verdict || undefined, templateId: tplId || undefined })}>Send reply</button>
                </>
              ) : <p style={{ color: muted }}>{open.lockedByClaim ? "Another admin is handling this." : "You can view this complaint but not act on it."}</p>}

              {open.canNote && (
                <>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Private note for staff (never sent to the player)" />
                  <button disabled={!note.trim()} onClick={addNote}>Add note</button>
                </>
              )}
            </div>
          )}
        </section>
      </div>

      <section style={box}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 10 }}>Game account</h2>
        {me.gameId ? (
          <p>Linked to game ID <strong>{me.gameId}</strong> <button onClick={unlink} style={{ marginLeft: 8 }}>Unlink</button></p>
        ) : (
          <form onSubmit={linkAccount} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input name="code" placeholder="Code from the game (e.g. K7M2-9QXP)" required />
            <button>Link</button>
          </form>
        )}
      </section>

      {msg && <p role="status">{msg}</p>}

      {me.canManageStaff && (
        <section style={box}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: 10 }}>Admins</h2>
          {admins.map(a => <p key={a.id}>{a.name} · {a.email} · {a.title} · {a.kind === "ADMIN" ? `level ${a.level}` : a.kind.toLowerCase()}</p>)}
          <form onSubmit={addAdmin} style={{ display: "grid", gap: 8, marginTop: 12, maxWidth: 360 }}>
            <input name="name" placeholder="Name" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="title" placeholder="Title (e.g. Curator)" />
            <input name="level" type="number" min={1} max={5} defaultValue={1} required />
            <input name="password" type="password" placeholder="Password (10+ characters)" minLength={10} required />
            <button>Add admin</button>
          </form>
        </section>
      )}
    </main>
  );
}