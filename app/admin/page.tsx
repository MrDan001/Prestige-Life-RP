// PATH: app/admin/page.tsx
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Ev = { id: string; kind: "IMAGE" | "VIDEO" | "LINK" | "TEXT"; url: string | null; text: string | null; caption: string | null };
type Row = {
  id: string; message: string; status: string; createdAt: string;
  player: { username: string }; category: { id: string; name: string };
  claimedBy: { name: string } | null; claimedById: string | null;
  accusedName: string | null; accusedAdmin: { name: string } | null;
  canReply: boolean; isClosed: boolean; isPractice: boolean;
};
type Detail = Row & {
  player: { username: string; gameId: string }; verdict: string | null;
  evidence: Ev[]; latestJudgment: { message: string; createdAt: string; admin: { name: string } } | null;
};
type Tpl = { id: string; name: string; verdict: string | null; closesAs: "RESOLVED" | "DISMISSED" | null; canUse: boolean };

const isClosed = (status: string) => status === "RESOLVED" || status === "DISMISSED";
const pill = (s: string) => (s === "OPEN" ? "open" : "done");
const label = (s: string) => s.replace("_", " ").toLowerCase().replace(/^./, c => c.toUpperCase());
const tone = (t: Tpl) => (t.closesAs === "DISMISSED" ? "reject" : t.verdict === "COMPLAINANT" ? "approve" : "neutral");
const fmt = (d: string) => new Date(d).toLocaleString();

export default function ComplaintsPage() {
  const [isPrimaryOwner, setIsPrimaryOwner] = useState(false);
  const [canCreateComp, setCanCreateComp] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Detail | null>(null);
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [tpl, setTpl] = useState<Tpl | null>(null);
  const [reply, setReply] = useState("");
  const [msg, setMsg] = useState("");

  const loadList = useCallback(async () => {
    const p = new URLSearchParams({ limit: "15", offset: "0" });
    const res = await fetch("/api/admin/complaints?" + p);
    if (res.status === 401) { window.location.href = "/auth"; return; }
    const data = await res.json();
    setRows(data.items ?? []);
    setNextOffset(data.nextOffset ?? 0);
    setHasMore(!!data.hasMore);
  }, []);

  useEffect(() => { fetch("/api/admin/me").then(async r => {
    if (r.ok) {
      const current = await r.json();
      setIsPrimaryOwner(!!current.isPrimaryOwner);
      setCanCreateComp(!!current.canCreateComp);
    }
  }); }, []);
  useEffect(() => { loadList(); }, [loadList]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter(r => [r.player.username, r.accusedAdmin?.name, r.accusedName, r.id.slice(-6)].some(x => x?.toLowerCase().includes(s))) : rows;
  }, [rows, q]);


  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const p = new URLSearchParams({ limit: "15", offset: String(nextOffset) });
      const res = await fetch("/api/admin/complaints?" + p);
      if (!res.ok) return;
      const data = await res.json();
      setRows(current => [...current, ...(data.items ?? [])]);
      setNextOffset(data.nextOffset ?? nextOffset);
      setHasMore(!!data.hasMore);
    } finally { setLoadingMore(false); }
  }

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
    setOpen(d); setTpl(null); setReply(""); setMsg("");
    const t = await fetch(`/api/admin/templates?categoryId=${d.category.id}`);
    setTpls(t.ok ? ((await t.json()) as Tpl[]).filter(x => x.canUse) : []);
    return d;
  }
  async function refresh(id: string) {
    const d = await select(id);
    if (!d) return;
    const response = await fetch("/api/admin/complaints?limit=15&offset=0");
    if (response.ok) { const data = await response.json(); setRows(data.items ?? []); setNextOffset(data.nextOffset ?? 0); setHasMore(!!data.hasMore); }
  }

  async function pick(t: Tpl) {
    if (!open) return;
    const res = await fetch(`/api/admin/complaints/${open.id}/draft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: t.id }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setTpl(t); setReply(d.text); setMsg(""); } else setMsg(d.error ?? "Could not fill that judgment");
  }
  async function send() {
    if (open && (await call(`/api/admin/complaints/${open.id}`, "PATCH", { reply, templateId: tpl?.id, verdict: tpl?.verdict ?? open.verdict ?? undefined }))) { await refresh(open.id); setMsg(""); }
  }
  async function setStatus(status: string) { if (open && (await call(`/api/admin/complaints/${open.id}`, "PATCH", { status }))) await refresh(open.id); }
  async function reopen() { if (open?.isClosed && isPrimaryOwner && (await call(`/api/admin/complaints/${open.id}`, "PATCH", { status: "OPEN" }))) await refresh(open.id); }
  async function release() { if (open && isPrimaryOwner && (await call(`/api/admin/complaints/${open.id}/claim`, "DELETE"))) await refresh(open.id); }

  const info = open && [
    ["Complaint", `#${open.id.slice(-6).toUpperCase()}`],
    ["Complaint from", open.player.username],
    ["Complaint about", open.accusedAdmin?.name ?? open.accusedName ?? "Unknown"],
  ];

  return (
    <div className="complaints-page">
      <header className="topbar">
        <h1>Complaints</h1>
        {canCreateComp && <a className="primary" href="/admin/generate-comps">Generate comps</a>}
        <input className="search" type="search" placeholder="Search player or case number…" aria-label="Search complaints" value={q} onChange={e => setQ(e.target.value)} />
      </header>

      <div className="split">
        <section className="list" aria-label="Complaint list">
          {shown.length === 0 && <p className="muted">No complaints found.</p>}
          {shown.map(r => (
            <button key={r.id} className={`card${open?.id === r.id ? " sel" : ""}`} onClick={() => select(r.id)}>
              <div className="row-top"><strong>#{r.id.slice(-6).toUpperCase()}</strong><span className={`pill ${pill(r.status)}`}>{label(r.status)}</span></div>
              <div style={{ marginTop: 4 }}>{r.player.username} <span className="muted">vs</span> {r.accusedAdmin?.name ?? r.accusedName ?? "unknown"}</div>
              <div className="sub">
                {r.isPractice ? "Practice case" : "Player complaint"} · {fmt(r.createdAt)}
              </div>
            </button>
          ))}
          {hasMore && <button type="button" className="primary" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "Loading…" : "Load more comps"}</button>}
        </section>

        <section className="detail" aria-label="Complaint detail">
          {!open || !info ? <p className="muted">Select a complaint to review it.</p> : (
            <>
              <div className="infocards">{info.map(([k, v]) => <div className="info" key={k}><small>{k}</small><strong>{v}</strong></div>)}</div>

              <div className="claimbar">
                <span className={`pill ${pill(open.status)}`}>{open.isClosed ? label(open.status) : "Open"}</span>
                {isPrimaryOwner && open.claimedById && <button onClick={release}>Release</button>}
                {isPrimaryOwner && !open.isClosed && <><button type="button" onClick={() => setStatus("RESOLVED")}>Resolve</button><button type="button" onClick={() => setStatus("DISMISSED")}>Dismiss</button></>}
                {isPrimaryOwner && open.isClosed && <button type="button" className="primary" onClick={reopen}>Reopen</button>}
              </div>

              <div>
                <strong>Evidence</strong> <span className="muted">· {open.evidence.length} attached</span>
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

              <div className="panel"><strong>Problem</strong><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{open.message}</p></div>
              {open.isPractice && <small className="muted">Practice case · simulated scenario</small>}
              {open.latestJudgment && (
                <div className="panel">
                  <strong>Judgment</strong>
                  <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{open.latestJudgment.message}</p>
                  <small className="muted">{open.latestJudgment.admin.name} · {fmt(open.latestJudgment.createdAt)}</small>
                  {open.verdict && <p><strong>Verdict:</strong> {label(open.verdict)}</p>}
                </div>
              )}

              {!open.isClosed && open.canReply ? (
                <>
                  <div>
                    <div className="judg-title">Issue judgment</div>
                    
                    <div className="judg-grid">
                      {tpls.map(t => <button key={t.id} className={`jbtn ${tpl?.id === t.id ? "picked" : tone(t)}`} aria-pressed={tpl?.id === t.id} onClick={() => pick(t)}>{t.name}</button>)}
                    </div>
                  </div>
                  <div className="panel" style={{ display: "grid", gap: 10 }}>
                    <strong>Judgment</strong>
                    {tpl && <span className="muted">Filled from “{tpl.name}”</span>}
                    <textarea rows={6} value={reply} onChange={e => setReply(e.target.value)} placeholder="Pick a judgment above, or write the judgment here" aria-label="Judgment" />
                    <div className="claimbar">
                      <button className="primary" disabled={!reply.trim()} onClick={send}>Issue judgment</button>
                    </div>
                  </div>
                </>
              ) : !open.isClosed ? <p className="muted">Your rank does not meet the minimum reply level for this complaint.</p> : null}




            </>
          )}
          {msg && <p role="status">{msg}</p>}
        </section>
      </div>
    </div>
  );
}