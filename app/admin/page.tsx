// PATH: app/admin/page.tsx
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildUpheldJudgmentMessage } from "@/lib/templates";

type Ev = { id: string; kind: "IMAGE" | "VIDEO" | "LINK" | "TEXT"; url: string | null; text: string | null; caption: string | null };
type Row = {
  id: string; publicId: string; message: string; status: string; createdAt: string;
  player: { username: string }; category: { id: string; name: string };
  claimedBy: { name: string } | null; claimedById: string | null;
  accusedName: string | null; accusedAdmin: { name: string } | null;
  canReply: boolean; isClosed: boolean;
};
type Detail = Row & {
  player: { username: string; gameId: string }; verdict: string | null;
  evidence: Ev[]; latestJudgment: {
    message: string; createdAt: string; admin: { name: string };
    ruleCode: string | null; punishmentType: string | null; punishmentDuration: string | null;
  } | null;
  closedAt: string | null; closedBy: { name: string } | null;
};
type Tpl = { id: string; name: string; verdict: string | null; closesAs: "RESOLVED" | "DISMISSED" | null; canUse: boolean };
type PunishmentOption = { id: string; name: string; durationOptions: string[] };
type RuleCode = { code: string; title: string };

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
  const [queue, setQueue] = useState<"active" | "history">("active");
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Detail | null>(null);
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [tpl, setTpl] = useState<Tpl | null>(null);
  const [reply, setReply] = useState("");
  const [punishmentOptions, setPunishmentOptions] = useState<PunishmentOption[]>([]);
  const [ruleCodes, setRuleCodes] = useState<RuleCode[]>([]);
  const [ruleCode, setRuleCode] = useState("");
  const [punishmentOptionId, setPunishmentOptionId] = useState("");
  const [punishmentDuration, setPunishmentDuration] = useState("");
  const [msg, setMsg] = useState("");

  const loadList = useCallback(async () => {
    const p = new URLSearchParams({ limit: "15", offset: "0", queue });
    const res = await fetch("/api/admin/complaints?" + p);
    if (res.status === 401) { window.location.href = "/auth"; return; }
    const data = await res.json();
    setRows(data.items ?? []);
    setNextOffset(data.nextOffset ?? 0);
    setHasMore(!!data.hasMore);
  }, [queue]);

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
    return s ? rows.filter(r => [r.player.username, r.accusedAdmin?.name, r.accusedName, r.publicId].some(x => x?.toLowerCase().includes(s))) : rows;
  }, [rows, q]);


  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const p = new URLSearchParams({ limit: "15", offset: String(nextOffset), queue });
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
    setRuleCode(""); setPunishmentOptionId(""); setPunishmentDuration("");
    const [t, p, r] = await Promise.all([
      fetch(`/api/admin/templates?categoryId=${d.category.id}`),
      fetch("/api/admin/punishments", { cache: "no-store" }),
      fetch("/api/admin/rule-codes", { cache: "no-store" }),
    ]);
    setTpls(t.ok ? ((await t.json()) as Tpl[]).filter(x => x.canUse) : []);
    setPunishmentOptions(p.ok ? await p.json() : []);
    setRuleCodes(r.ok ? await r.json() : []);
    return d;
  }
  async function refresh(id: string) {
    const d = await select(id);
    if (!d) return;
    const destination = isClosed(d.status) ? "history" : "active";
    if (destination !== queue) setQueue(destination);
    const response = await fetch(`/api/admin/complaints?limit=15&offset=0&queue=${isClosed(d.status) ? "history" : "active"}`);
    if (response.ok) { const data = await response.json(); setRows(data.items ?? []); setNextOffset(data.nextOffset ?? 0); setHasMore(!!data.hasMore); }
  }

  async function pick(t: Tpl) {
    if (!open) return;
    const res = await fetch(`/api/admin/complaints/${open.id}/draft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: t.id }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setTpl(t); setReply(d.text); setMsg(""); } else setMsg(d.error ?? "Could not fill that judgment");
  }
  async function send() {
    if (!open) return;
    const effectiveVerdict = tpl?.verdict ?? open.verdict ?? undefined;
    const approved = effectiveVerdict === "COMPLAINANT";
    const selected = punishmentOptions.find(option => option.id === punishmentOptionId);
    if (approved && (!ruleCode.trim() || !selected || !selected.durationOptions.includes(punishmentDuration))) {
      setMsg("Enter the violated rule code and choose a punishment and its duration before issuing an approved judgment.");
      return;
    }
    const judgmentText = approved && selected
      ? buildUpheldJudgmentMessage({
          complainant: open.player.username,
          complaintId: open.publicId,
          accused: open.accusedAdmin?.name ?? open.accusedName ?? "the accused player",
          ruleCode,
          punishment: selected.name,
          duration: punishmentDuration,
        })
      : reply.trim();
    if (!judgmentText) {
      setMsg("Enter the judgment message before issuing this verdict.");
      return;
    }
    const body = {
      reply: judgmentText,
      templateId: tpl?.id,
      verdict: effectiveVerdict,
      ...(approved ? { ruleCode, punishmentOptionId, punishmentDuration } : {}),
    };
    if (await call(`/api/admin/complaints/${open.id}`, "PATCH", body)) { await refresh(open.id); setMsg(""); }
  }

  async function copyComplaintLink() {
    if (!open) return;
    const url = `${window.location.origin}/complaint/${open.publicId}`;
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Unique complaint link copied.");
    } catch {
      setMsg(url);
    }
  }
  async function setStatus(status: string) { if (open && (await call(`/api/admin/complaints/${open.id}`, "PATCH", { status }))) await refresh(open.id); }
  async function reopen() { if (open?.isClosed && isPrimaryOwner && (await call(`/api/admin/complaints/${open.id}`, "PATCH", { status: "OPEN" }))) await refresh(open.id); }
  async function release() { if (open && isPrimaryOwner && (await call(`/api/admin/complaints/${open.id}/claim`, "DELETE"))) await refresh(open.id); }

  const isApprovedJudgment = !!open && (tpl?.verdict ?? open.verdict) === "COMPLAINANT";
  const selectedPunishment = punishmentOptions.find(option => option.id === punishmentOptionId);
  const judgmentPreview = isApprovedJudgment && open && selectedPunishment && ruleCode.trim() && punishmentDuration
    ? buildUpheldJudgmentMessage({
        complainant: open.player.username,
        complaintId: open.publicId,
        accused: open.accusedAdmin?.name ?? open.accusedName ?? "the accused player",
        ruleCode,
        punishment: selectedPunishment.name,
        duration: punishmentDuration,
      })
    : "";
  const info = open && [
    ["Complaint", `#${open.publicId}`],
    ["Complaint from", open.player.username],
    ["Complaint about", open.accusedAdmin?.name ?? open.accusedName ?? "Unknown"],
    ["Time created", fmt(open.createdAt)],
    ["Time resolved", open.closedAt ? fmt(open.closedAt) : open.isClosed ? "Not recorded" : "Not resolved"],
    ["Closed By", open.isClosed ? open.latestJudgment?.admin?.name ?? open.closedBy?.name ?? "—" : "—"],
  ];

  return (
    <div className="complaints-page">
      <header className="topbar">
        <h1>Complaints</h1>
        {canCreateComp && <a className="primary" href="/admin/generate-comps">Generate comps</a>}
        <div className="queue-tabs" role="tablist" aria-label="Complaint queues"><button type="button" role="tab" aria-selected={queue === "active"} className={`queue-tab${queue === "active" ? " on" : ""}`} onClick={() => { setQueue("active"); setOpen(null); }}>Active</button><button type="button" role="tab" aria-selected={queue === "history"} className={`queue-tab${queue === "history" ? " on" : ""}`} onClick={() => { setQueue("history"); setOpen(null); }}>History</button></div>
        <input className="search" type="search" placeholder="Search player or case number…" aria-label="Search complaints" value={q} onChange={e => setQ(e.target.value)} />
      </header>

      <div className="split">
        <section className="list" aria-label={`${queue} complaints`}>
          {shown.length === 0 && <p className="muted">No complaints found.</p>}
          {shown.map(r => (
            <button key={r.id} className={`card${open?.id === r.id ? " sel" : ""}`} onClick={() => select(r.id)}>
              <div className="row-top"><strong>#{r.publicId}</strong><span className={`pill ${pill(r.status)}`}>{label(r.status)}</span></div>
              <div style={{ marginTop: 4 }}>{r.player.username} <span className="muted">vs</span> {r.accusedAdmin?.name ?? r.accusedName ?? "unknown"}</div>
              <div className="sub">
                Player complaint · {fmt(r.createdAt)}
              </div>
            </button>
          ))}
          {hasMore && <button type="button" className="primary" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "Loading…" : "Load more comps"}</button>}
        </section>

        <section className="detail" aria-label="Complaint detail">
          {!open || !info ? <p className="muted">Select a complaint to review it.</p> : (
            <>
              <div className="infocards">{info.map(([k, v]) => <div className="info" key={k}><small>{k}</small><strong>{v}</strong></div>)}</div>
              <div className="panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <strong>Unique complaint link</strong>
                  <p style={{ margin: "4px 0 0", overflowWrap: "anywhere" }}>
                    <a href={`/complaint/${open.publicId}`} target="_blank" rel="noopener noreferrer">{typeof window === "undefined" ? `/complaint/${open.publicId}` : `${window.location.origin}/complaint/${open.publicId}`}</a>
                  </p>
                </div>
                <button type="button" onClick={copyComplaintLink}>Copy link</button>
              </div>

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
              {open.latestJudgment && (
                <div className="panel">
                  <strong>Judgment</strong>
                  <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{open.latestJudgment.message}</p>
                  <small className="muted">{open.latestJudgment.admin.name} · {fmt(open.latestJudgment.createdAt)}</small>
                  {open.verdict && <p><strong>Verdict:</strong> {label(open.verdict)}</p>}
                  {open.latestJudgment.ruleCode && <p><strong>Violated rule:</strong> {open.latestJudgment.ruleCode}</p>}
                  {open.latestJudgment.punishmentType && <p><strong>Punishment:</strong> {open.latestJudgment.punishmentType}</p>}
                  {open.latestJudgment.punishmentDuration && <p><strong>Duration:</strong> {open.latestJudgment.punishmentDuration}</p>}
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
                    {tpl && <span className="muted">Filled from “{tpl.name}”</span>}
                    {isApprovedJudgment ? (
                      <div className="panel" aria-live="polite" style={{ display: "grid", gap: 6, background: "#171321" }}>
                        <strong>Final judgment message preview</strong>
                        {judgmentPreview
                          ? <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{judgmentPreview}</p>
                          : <p className="muted" style={{ margin: 0 }}>Enter the violated rule code, choose a punishment and select its duration to generate the final judgment message.</p>}
                        <small className="muted">This exact message will be saved and sent when you issue the judgment.</small>
                      </div>
                    ) : (
                      <>
                        <strong>Judgment message</strong>
                        <textarea rows={6} value={reply} onChange={e => setReply(e.target.value)} placeholder="Write the judgment message…" aria-label="Judgment message" />
                      </>
                    )}
                    {isApprovedJudgment && (
                      <div style={{ display: "grid", gap: 10, border: "1px solid #342b4b", borderRadius: 10, padding: 12 }}>
                        <strong>Required punishment details · upheld complaint</strong>
                        <label style={{ display: "grid", gap: 5 }}>Violated rule code
                          <input list="complaint-rule-codes" value={ruleCode} onChange={e => setRuleCode(e.target.value.toUpperCase())} placeholder="Enter rule code, e.g. RULE-001" autoComplete="off" />
                          <datalist id="complaint-rule-codes">{ruleCodes.map(rule => <option key={rule.code} value={rule.code}>{rule.title}</option>)}</datalist>
                        </label>
                        <label style={{ display: "grid", gap: 5 }}>Punishment
                          <select value={punishmentOptionId} onChange={e => { setPunishmentOptionId(e.target.value); setPunishmentDuration(""); }}>
                            <option value="">Choose punishment</option>
                            {punishmentOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                          </select>
                        </label>
                        <label style={{ display: "grid", gap: 5 }}>Duration
                          <select value={punishmentDuration} onChange={e => setPunishmentDuration(e.target.value)} disabled={!selectedPunishment}>
                            <option value="">Choose duration</option>
                            {(selectedPunishment?.durationOptions ?? []).map(duration => <option key={duration} value={duration}>{duration}</option>)}
                          </select>
                        </label>
                      </div>
                    )}
                    <div className="claimbar">
                      <button className="primary" disabled={isApprovedJudgment
                        ? (!ruleCode.trim() || !selectedPunishment || !selectedPunishment.durationOptions.includes(punishmentDuration))
                        : !reply.trim()} onClick={send}>Issue judgment</button>
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