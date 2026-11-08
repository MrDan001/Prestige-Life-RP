// PATH: app/admin/create-comp/page.tsx
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Category = { id: string; name: string; active: boolean };
const drafts: Record<string, string> = {
  default: "An incident involving the reported player is being submitted for review.",
  harassment: "This report concerns repeated unwanted contact or following after a request to stop.",
  scamming: "This report concerns an exchange or payment that may not have been completed as agreed.",
  exploiting: "This report concerns gameplay behaviour that may indicate an exploit and requires review of the available records.",
};

export default function CreateCompPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reporterName, setReporterName] = useState("");
  const [reporterGameId, setReporterGameId] = useState("");
  const [accusedName, setAccusedName] = useState("");
  const [accusedGameId, setAccusedGameId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [facts, setFacts] = useState("");
  const [message, setMessage] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const selectedCategory = useMemo(() => categories.find(c => c.id === categoryId), [categories, categoryId]);

  useEffect(() => {
    fetch("/api/admin/me").then(async r => {
      if (!r.ok) { window.location.href = "/auth"; return; }
      const me = await r.json();
      if (!me.canCreateComp) { setAllowed(false); return; }
      setAllowed(true);
      const result = await fetch("/api/admin/categories");
      if (result.ok) {
        const list: Category[] = (await result.json()).filter((x: Category) => x.active);
        setCategories(list);
        if (list.length) setCategoryId(list[0].id);
      }
    }).catch(() => setAllowed(false));
  }, []);

  function generateDescription() {
    const key = /harass/i.test(selectedCategory?.name ?? "") ? "harassment"
      : /scam|trade/i.test(selectedCategory?.name ?? "") ? "scamming"
      : /hack|exploit/i.test(selectedCategory?.name ?? "") ? "exploiting" : "default";
    const template = drafts[key];
    const intro = "Reporting player: " + reporterName + " (" + reporterGameId + ").\n"
      + "Reported player: " + accusedName + " (" + (accusedGameId || "game ID not supplied") + ").\n"
      + "Category: " + (selectedCategory?.name ?? "Not selected") + ".\n\n";
    setMessage(intro + template + "\n\nIncident details:\n"
      + (facts.trim() || "[Add the date, time, location and exact sequence of events.]")
      + "\n\nRequested review: Please review the relevant records and attached evidence before reaching a decision.");
    setNotice("Draft generated. Review and edit every detail before submitting.");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      const res = await fetch("/api/admin/create-comp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporterName, reporterGameId, accusedName, accusedGameId, categoryId, message, evidenceText, evidenceUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice(data.error ?? "Could not create the complaint."); return; }
      window.location.href = `/admin?created=${encodeURIComponent(data.id)}`;
    } finally { setBusy(false); }
  }

  if (allowed === false) return <div><h1>Not found</h1></div>;
  if (allowed === null) return <div><h1>Create comp</h1><p className="muted">Loading…</p></div>;

  return (
    <div>
      <header className="topbar">
        <h1>Create comp</h1>
        <a href="/admin" className="chip">Back to complaints</a>
      </header>
      <form className="panel" onSubmit={submit} style={{ display: "grid", gap: 14, maxWidth: 900 }}>
        <p className="muted">This complaint will enter the same Active queue as other reports. Player names must use Firstname_lastname with at least two letters in each part.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>Reporting player name<input required minLength={5} maxLength={64} pattern="[A-Za-z]{2,}_[A-Za-z]{2,}" title="Use Firstname_lastname with at least two letters in each part." placeholder="Db_yk" value={reporterName} onChange={e => setReporterName(e.target.value)} /><small className="muted">Format: Firstname_lastname (minimum 2 letters per name).</small></label>
          <label>Reporting player game ID<input required maxLength={64} value={reporterGameId} onChange={e => setReporterGameId(e.target.value)} /></label>
          <label>Reported player name<input required minLength={5} maxLength={64} pattern="[A-Za-z]{2,}_[A-Za-z]{2,}" title="Use Firstname_lastname with at least two letters in each part." placeholder="Db_yk" value={accusedName} onChange={e => setAccusedName(e.target.value)} /><small className="muted">Format: Firstname_lastname (minimum 2 letters per name).</small></label>
          <label>Reported player game ID (optional)<input maxLength={64} value={accusedGameId} onChange={e => setAccusedGameId(e.target.value)} /></label>
        </div>
        <label>Complaint category<select required value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">Choose category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Key facts for generated description<textarea rows={3} value={facts} onChange={e => setFacts(e.target.value)} placeholder="Add the key facts, timeline, location and impact." /></label>
        <div><button type="button" onClick={generateDescription}>Generate description</button></div>
        <label>Complaint description<textarea required minLength={20} maxLength={4000} rows={10} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe what happened, when it happened and what should be reviewed." /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>Evidence text (optional)<textarea rows={4} maxLength={4000} value={evidenceText} onChange={e => setEvidenceText(e.target.value)} placeholder="Add a factual evidence note or reference." /></label>
          <label>Evidence link (optional)<input type="url" value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} placeholder="https://" /></label>
        </div>
        <p className="muted">Check names, IDs, dates and evidence before submitting. The comp will be OPEN and available for another authorized admin to claim.</p>
        {notice && <p role="status">{notice}</p>}
        <div><button className="primary" type="submit" disabled={busy || !categoryId}>{busy ? "Submitting…" : "Submit comp"}</button></div>
      </form>
    </div>
  );
}
