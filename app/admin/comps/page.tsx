// PATH: app/admin/comps/page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";

type Comp = {
  id: string; reference: string; playerName: string; playerGameId: string;
  playerCountry: string; category: string; subject: string; message: string;
  assignedGroup: "A" | "B" | "C"; status: "OPEN" | "CLOSED";
  closedByName: string | null; submittedAt: string; closedAt: string | null;
};
type Payload = { rows: Comp[]; counts: { total: number; open: number; closed: number }; canGenerate: boolean; visibleGroups: string[] };
const groupLabel = (g: string) => g === "A" ? "Ranks 3–4" : g === "B" ? "Ranks 5–6" : "PRM and above";
const date = (value: string) => new Date(value).toLocaleString();

export default function DemoCompsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [selected, setSelected] = useState<Comp | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const res = await fetch("/api/admin/demo-comps", { cache: "no-store" });
    if (res.status === 401) { window.location.href = "/auth"; return; }
    if (!res.ok) { setMessage("Could not load demo comps."); return; }
    const payload = await res.json();
    setData(payload);
    setSelected((current) => current ? payload.rows.find((x: Comp) => x.id === current.id) ?? null : (payload.rows[0] ?? null));
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function generate() {
    if (!window.confirm("Generate all 45 international demo player submissions? These are synthetic training records and will remain separate from live player complaints.")) return;
    setBusy(true); setMessage("");
    const res = await fetch("/api/admin/demo-comps", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMessage(body.error ?? "Could not generate demo comps."); return; }
    setMessage("45 demo player submissions generated successfully.");
    await load();
  }
  async function closeComp(comp: Comp) {
    if (!window.confirm("Close " + comp.reference + "? This will mark the demo case as closed.")) return;
    setBusy(true); setMessage("");
    const res = await fetch("/api/admin/demo-comps/" + comp.id, { method: "PATCH" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMessage(body.error ?? "Could not close this demo comp."); return; }
    setMessage(comp.reference + " closed.");
    await load();
  }
  const rows = data?.rows ?? [];
  return <div className="demo-page">
    <header className="demo-header">
      <div><div className="demo-eyebrow">ADMIN TRAINING WORKSPACE</div><h1>Demo Comps</h1><p>Simulated player-submitted reports for practising complaint review and closure. These never enter the live player complaint queue.</p></div>
      {data?.canGenerate && rows.length === 0 && <button className="primary demo-generate" disabled={busy} onClick={generate}>{busy ? "Generating…" : "Generate 45 demo submissions"}</button>}
    </header>
    <div className="demo-stats">
      <div><small>Visible cases</small><strong>{data?.counts.total ?? "—"}</strong></div>
      <div><small>Open</small><strong>{data?.counts.open ?? "—"}</strong></div>
      <div><small>Closed</small><strong>{data?.counts.closed ?? "—"}</strong></div>
      <div><small>Your access</small><strong>{data?.visibleGroups?.map(groupLabel).join(" + ") ?? "Loading…"}</strong></div>
    </div>
    {message && <div className="demo-message" role="status">{message}</div>}
    {!data ? <p className="muted">Loading demo submissions…</p> : rows.length === 0 ? <div className="demo-empty"><strong>No demo submissions yet.</strong><p>{data.canGenerate ? "Generate the 45 international player submissions to open the training queue." : "The Owner has not generated the demo training set yet."}</p></div> :
    <div className="demo-layout">
      <section className="demo-list" aria-label="Demo complaint list">
        {rows.map((comp) => <button key={comp.id} className={"demo-row" + (selected?.id === comp.id ? " selected" : "")} onClick={() => setSelected(comp)}>
          <div className="demo-row-top"><strong>{comp.subject}</strong><span className={"demo-status " + comp.status.toLowerCase()}>{comp.status === "OPEN" ? "Open" : "Closed"}</span></div>
          <div className="demo-player">{comp.playerName} <span>· {comp.playerCountry}</span></div>
          <div className="demo-row-bottom"><span>{comp.reference}</span><span>Group {comp.assignedGroup}</span><span>{date(comp.submittedAt)}</span></div>
        </button>)}
      </section>
      <section className="demo-detail" aria-label="Selected demo complaint">
        {selected ? <>
          <div className="demo-detail-head"><div><span className="demo-eyebrow">{selected.reference}</span><h2>{selected.subject}</h2></div><span className={"demo-status " + selected.status.toLowerCase()}>{selected.status === "OPEN" ? "Open" : "Closed"}</span></div>
          <div className="demo-meta">
            <div><small>Submitted by</small><strong>{selected.playerName}</strong></div>
            <div><small>Player ID</small><strong>{selected.playerGameId}</strong></div>
            <div><small>Location</small><strong>{selected.playerCountry}</strong></div>
            <div><small>Category</small><strong>{selected.category}</strong></div>
            <div><small>Assigned group</small><strong>{groupLabel(selected.assignedGroup)}</strong></div>
            <div><small>Submitted</small><strong>{date(selected.submittedAt)}</strong></div>
          </div>
          <article className="demo-message-card"><small>PLAYER'S REPORT</small><p>{selected.message}</p></article>
          {selected.status === "CLOSED" ? <div className="demo-closed-note">Closed by {selected.closedByName ?? "an administrator"}{selected.closedAt ? " · " + date(selected.closedAt) : ""}</div> :
            <div className="demo-closebar"><span className="muted">Review the player's report, then close the case when complete.</span><button className="primary" disabled={busy} onClick={() => closeComp(selected)}>Close demo comp</button></div>}
        </> : <p className="muted">Select a demo submission to review it.</p>}
      </section>
    </div>}
  </div>;
}
