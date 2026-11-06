// PATH: app/admin/create-comp/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string; active: boolean };
const drafts: Record<string, string> = {
  default: "On [date/time], an incident occurred involving the reported player.\n\nWhat happened: [describe the actions in the order they occurred].\n\nImpact: [explain how this affected the reporting player or other players].\n\nRequested review: Please review the available records and evidence before reaching a decision.",
  harassment: "On [date/time], the reported player repeatedly contacted or followed the reporting player after being asked to stop.\n\nDetails: [add the locations, messages or actions and their sequence].\n\nImpact: [describe the effect on the session].\n\nPlease review the relevant chat and activity records before reaching a decision.",
  scamming: "On [date/time], the reporting player and the reported player agreed to an exchange. The reporting player provided [item/payment], but [explain what was not delivered or returned].\n\nTransaction details: [add the item, amount and approximate time].\n\nPlease review the transaction history and attached evidence.",
  exploiting: "On [date/time], the reporting player observed behaviour that may indicate an exploit.\n\nObserved behaviour: [describe exactly what happened and where].\n\nWhy it appeared unusual: [explain what normal behaviour would look like].\n\nPlease review the relevant gameplay records before deciding whether a rule was broken.",
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
    const intro = reporterName ? `Reporting player: ${reporterName} (${reporterGameId || "game ID not supplied"}).\nReported player: ${accusedName} (${accusedGameId || "game ID not supplied"}).\n\n` : "";
    setMessage(intro + template.replace("[date/time]", "the date and time to be confirmed").replace(/\[([^[\]]+)\]/g, (_match, prompt) => facts.trim() || `Add details: ${prompt}`));
    setNotice("Draft generated. Review and edit every detail before submitting.");
  }

  async function submit(e: React.FormEvent) {
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
        <p className="muted">This complaint will enter the same Active queue as other reports. It is recorded as created by the owner, not as a direct player submission.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>Reporting player name<input required maxLength={64} value={reporterName} onChange={e => setReporterName(e.target.value)} /></label>
          <label>Reporting player game ID<input required maxLength={64} value={reporterGameId} onChange={e => setReporterGameId(e.target.value)} /></label>
          <label>Reported player name<input required maxLength={64} value={accusedName} onChange={e => setAccusedName(e.target.value)} /></label>
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
