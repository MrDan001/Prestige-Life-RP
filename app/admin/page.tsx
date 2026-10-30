// PATH: app/admin/page.tsx
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Ev = { id: string; kind: "IMAGE" | "VIDEO" | "LINK" | "TEXT"; url: string | null; text: string | null; caption: string | null };
type Item = { type: "reply" | "note" | "event"; at: string; by: string; text: string; delivered: boolean };
type Row = {
  id: string; message: string; status: string; createdAt: string;
  player: { username: string }; category: { id: string; name: string };
  claimedBy: { name: string } | null; claimedById: string | null;
  accusedName: string | null; accusedAdmin: { name: string } | null;
  canReply: boolean; canClose: boolean; lockedByClaim: boolean; isClosed: boolean; canReopen: boolean;
};
type Detail = Row & {
  player: { username: string; gameId: string }; canNote: boolean; verdict: string | null;
  evidence: Ev[]; timeline: Item[]; respondedAt: string | null; reviewedByName: string | null;
};
type Tpl = { id: string; name: string; verdict: string | null; closesAs: "RESOLVED" | "DISMISSED" | null; canUse: boolean };

const ACTIVE_CHIPS: [string, string][] = [["all", "All"], ["OPEN", "Open"], ["IN_REVIEW", "In review"], ["none", "Unclaimed"], ["me", "Mine"]];
const HISTORY_CHIPS: [string, string][] = [["all", "All"], ["RESOLVED", "Resolved"], ["DISMISSED", "Dismissed"]];
const isClosed = (status: string) => status === "RESOLVED" || status === "DISMISSED";
const STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"];
const pill = (s: string) => (s === "OPEN" ? "open" : s === "IN_REVIEW" ? "review" : "done");
const label = (s: string) => s.replace("_", " ").toLowerCase().replace(/^./, c => c.toUpperCase());
const tone = (t: Tpl) => (t.closesAs === "DISMISSED" ? "reject" : t.verdict === "COMPLAINANT" ? "approve" : "neutral");
const fmt = (d: string) => new Date(d).toLocaleString();

export default function ComplaintsPage() {
  const [meId, setMeId] = useState("");
  const [bucket, setBucket] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [chip, setChip] = useState("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Detail | null>(null);
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [tpl, setTpl] = useState<Tpl | null>(null);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  const loadList = useCallback(async () => {
    const p = new URLSearchParams({ bucket });
    if (bucket === "ACTIVE") {
      if (chip === "OPEN" || chip === "IN_REVIEW") p.set("status", chip);
      if (chip === "me" || chip === "none") p.set("claimed", chip);
    } else if (chip === "RESOLVED" || chip === "DISMISSED") {
      p.set("status", chip);
    }
    const res = await fetch("/api/admin/complaints?" + p);
    if (res.status === 401) { window.location.href = "/auth"; return; }
    setRows(await res.json());
  }, [bucket, chip]);

  useEffect(() => { fetch("/api/admin/me").then(async r => {
    if (r.ok) {
      const current = await r.json();
      setMeId(current.id);
    }
  }); }, []);
  useEffect(() => { loadList(); }, [loadList]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter(r => [r.player.username, r.accusedAdmin?.name, r.accusedName, r.id.slice(-6)].some(x => x?.toLowerCase().includes(s))) : rows;
  }, [rows, q]);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? "" : data.error ?? "Something went wrong");
    return res.ok;
  }

  async function select(id: string) {
    const response = await fetch(`/api/admin/complaints/${id}`);
    if (!response.ok) { setMsg((await response.json().catch(() => ({}))).error ?? "Could not load complaint."); return null; }
    const d: Detail = await response.json();
    setOpen(d); setTpl(null); setReply(""); setNote(""); setMsg("");
    setBucket(isClosed(d.status) ? "HISTORY" : "ACTIVE");
    const t = await fetch(`/api/admin/templates?categoryId=${d.category.id}`);
    setTpls(t.ok ? ((await t.json()) as Tpl[]).filter(x => x.canUse) : []);
    return d;
  }
  async function refresh(id: string) {
    const d = await select(id);
    if (!d) return;
    const nextBucket = isClosed(d.status) ? "HISTORY" : "ACTIVE";
    setBucket(nextBucket);
    setChip("all");
    const response = await fetch(`/api/admin/complaints?bucket=${nextBucket}`);
    if (response.ok) setRows(await response.json());
  }

  async function pick(t: Tpl) {
    if (!open) return;
    const res = await fetch(`/api/admin/complaints/${open.id}/draft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: t.id }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setTpl(t); setReply(d.text); setMsg(""); } else setMsg(d.error ?? "Could not fill that judgment");
  }
  async function send() {
    if (open && (await call(`/api/admin/complaints/${open.id}`, "PATCH", { reply, templateId: tpl?.id }))) { await refresh(open.id); setMsg("Sent. The player will see it in the game."); }
  }
  async function setStatus(status: string) { if (open && (await call(`/api/admin/complaints/${open.id}`, "PATCH", { status }))) await refresh(open.id); }
  async function reopen() { if (open?.isClosed && open.canReopen && (await call(`/api/admin/complaints/${open.id}`, "PATCH", { status: "OPEN" }))) await refresh(open.id); }
  async function changeBucket(next: "ACTIVE" | "HISTORY") {
    setBucket(next); setChip("all"); setOpen(null); setTpl(null); setReply(""); setNote(""); setMsg("");
  }
  async function claim() { if (open && (await call(`/api/admin/complaints/${open.id}/claim`, "POST"))) await refresh(open.id); }
  async function release() { if (open && (await call(`/api/admin/complaints/${open.id}/claim`, "DELETE"))) await refresh(open.id); }
  async function addNote() { if (open && (await call(`/api/admin/complaints/${open.id}/notes`, "POST", { message: note }))) { setNote(""); await refresh(open.id); } }

  const mine = open?.claimedById === meId;
  const info = open && [
    ["Complaint", `#${open.id.slice(-6).toUpperCase()}`],
    ["Complaint from", open.player.username],
    ["Complaint about", open.accusedAdmin?.name ?? open.accusedName ?? "Unknown"],
    ["Submitted", fmt(open.createdAt)],
    ["Responded", open.respondedAt ? fmt(open.respondedAt) : "Not yet"],
    ["Reviewed by", open.reviewedByName ?? "Not yet"],
  ];

  return (
    <div>
      <header className="topbar">
        <h1>Complaints</h1>
        <div className="queue-tabs" role="tablist" aria-label="Complaint queues">
          <button type="button" role="tab" aria-selected={bucket === "ACTIVE"} className={bucket === "ACTIVE" ? "queue-tab on" : "queue-tab"} onClick={() => changeBucket("ACTIVE")}>ACTIVE</button>
          <button type="button" role="tab" aria-selected={bucket === "HISTORY"} className={bucket === "HISTORY" ? "queue-tab on" : "queue-tab"} onClick={() => changeBucket("HISTORY")}>HISTORY</button>
        </div>
        <div className="chips">
          {(bucket === "ACTIVE" ? ACTIVE_CHIPS : HISTORY_CHIPS).map(([k, l]) => <button key={k} className={`chip${chip === k ? " on" : ""}`} onClick={() => setChip(k)}>{l}</button>)}
        </div>
        <input className="search" type="search" placeholder="Search player or case number…" aria-label="Search complaints" value={q} onChange={e => setQ(e.target.value)} />
      </header>

      <div className="split">
        <section className="list" aria-label="Complaint list">
          {shown.length === 0 && <p className="muted">No complaints found.</p>}
          {shown.map(r => (
            <button key={r.id} className={`card${open?.id === r.id ? " sel" : ""}${r.canReply ? "" : " dim"}`} onClick={() => select(r.id)}>
              <div className="row-top"><strong>{r.category.name}</strong><span className={`pill ${pill(r.status)}`}>{label(r.status)}</span></div>
              <div style={{ marginTop: 4 }}>{r.player.username} <span className="muted">vs</span> {r.accusedAdmin?.name ?? r.accusedName ?? "unknown"}</div>
              <div className="sub">
                {r.claimedBy ? (r.claimedById === meId ? "Handled by you" : `Handled by ${r.claimedBy.name}`) : "Unclaimed"}
                {!r.canReply && !r.lockedByClaim ? " · view only" : ""}{r.accusedAdmin ? " · against staff" : ""} · {fmt(r.createdAt)}
              </div>
            </button>
          ))}
        </section>

        <section className="detail" aria-label="Complaint detail">
          {!open || !info ? <p className="muted">Select a complaint to review it.</p> : (
            <>
              <div className="infocards">{info.map(([k, v]) => <div className="info" key={k}><small>{k}</small><strong>{v}</strong></div>)}</div>

              <div className="claimbar">
                <span className={`pill ${pill(open.status)}`}>{label(open.status)}</span>
                <span className="muted">{open.claimedBy ? <>Handled by <strong>{mine ? "you" : open.claimedBy.name}</strong></> : "Not claimed yet"}</span>
                {!open.isClosed && !open.claimedById && open.canReply && <button onClick={claim}>Claim</button>}
                {!open.isClosed && open.claimedById && !mine && !open.lockedByClaim && open.canNote && <button onClick={claim}>Take over</button>}
                {!open.isClosed && open.claimedById && (mine || !open.lockedByClaim) && <button onClick={release}>Release</button>}
                {open.isClosed ? (
                  <>
                    <span className="muted">Closed · moved to History</span>
                    {open.canReopen && <button type="button" className="primary" onClick={reopen}>Reopen complaint</button>}
                  </>
                ) : (
                  <label style={{ marginLeft: "auto" }}><span className="muted">Status </span>
                    <select value={open.status} disabled={!open.canReply} onChange={e => setStatus(e.target.value)} aria-label="Status">{STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select>
                  </label>
                )}
              </div>

              <div>
                <strong>Evidence</strong> <span className="muted">· {open.evidence.length} from the game</span>
                {open.evidence.length === 0 ? <p className="muted">No evidence attached.</p> : (
                  <div className="evgrid">
                    {open.evidence.map(ev => (
                      <div className="ev" key={ev.id}>
                        {ev.caption && <small className="muted">{ev.caption}</small>}
                        {ev.kind === "IMAGE" && ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer"><img src={ev.url} alt={ev.caption ?? "Evidence screenshot"} /></a>}
                        {ev.kind === "VIDEO" && ev.url && <video src={ev.url} controls />}
                        {ev.kind === "LINK" && ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer">{ev.url}</a>}
                        {ev.kind === "TEXT" && <pre>{ev.text}</pre>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel"><strong>Complaint description</strong><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{open.message}</p></div>

              {open.canReply ? (
                <>
                  <div>
                    <div className="judg-title">Issuing judgment</div>
                    <span className="muted">Pick one. The reply fills in below and you can edit it before sending.</span>
                    <div className="judg-grid">
                      {tpls.map(t => <button key={t.id} className={`jbtn ${tpl?.id === t.id ? "picked" : tone(t)}`} aria-pressed={tpl?.id === t.id} onClick={() => pick(t)}>{t.name}</button>)}
                    </div>
                  </div>
                  <div className="panel" style={{ display: "grid", gap: 10 }}>
                    <strong>Reply to player</strong>
                    {tpl && <span className="muted">Filled from “{tpl.name}”{tpl.closesAs ? ` · will ${tpl.closesAs === "RESOLVED" ? "resolve" : "dismiss"} the complaint` : ""}</span>}
                    <textarea rows={6} value={reply} onChange={e => setReply(e.target.value)} placeholder="Pick a judgment above, or write your own reply" aria-label="Reply to player" />
                    <div className="claimbar">
                      <button className="primary" disabled={!reply.trim()} onClick={send}>{tpl?.closesAs ? "Send judgment" : "Send reply"}</button>
                      <span className="muted">The player sees this in the game</span>
                    </div>
                  </div>
                </>
              ) : <p className="muted">{open.isClosed
                ? (open.canReopen ? "This complaint is closed. Reopen it to return it to the active queue before replying." : "This complaint is closed and read-only. Only the owner or a top-tier administrator can reopen it.")
                : open.lockedByClaim ? `${open.claimedBy?.name ?? "Another admin"} is handling this complaint.` : "You can view this complaint but you cannot answer it."}</p>}

              {open.canNote && (
                <div className="panel" style={{ display: "grid", gap: 8 }}>
                  <strong>Private note</strong>
                  <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Visible to staff only, never sent to the player" aria-label="Private note" />
                  <div><button disabled={!note.trim()} onClick={addNote}>Add note</button></div>
                </div>
              )}

              {open.timeline.length > 0 && (
                <div className="timeline">
                  <strong>History</strong>
                  {open.timeline.map((t, i) => t.type === "event" ? (
                    <div className="tl-event" key={i}>{fmt(t.at)} · {t.by} {t.text}</div>
                  ) : (
                    <div className={t.type === "note" ? "tl-note" : "tl-reply"} key={i}>
                      <small className="muted">{t.by} · {fmt(t.at)} · {t.type === "note" ? "private note" : t.delivered ? "delivered to game" : "waiting for game"}</small>
                      <p>{t.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {msg && <p role="status">{msg}</p>}
        </section>
      </div>
    </div>
  );
}