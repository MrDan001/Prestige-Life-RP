"use client";

import { useState } from "react";

type Result = { batchId: string; created: number; rankThreeToFive: number; rankSixPlus: number; assigned: number; ids: string[] };

export default function GenerateCompsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function generate() {
    if (busy) return;
    const confirmed = window.confirm(
      "Generate exactly 20 structured simulation complaints?\n\n15 will be claimable by rank 3–5 admins.\n5 will be claimable by rank 6 and top-tier admins.\n\nAll 20 will enter the normal Active queue unassigned, each with two clearly marked simulated evidence exhibits."
    );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/admin/generate-comps", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "The 20 complaints could not be generated.");
        return;
      }
      setResult(data as Result);
    } catch {
      setError("The request failed before the server confirmed the batch. Check the Active queue before retrying.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="topbar">
        <h1>Generate comps</h1>
        <a href="/admin" className="chip">Back to complaints</a>
      </header>

      <section className="panel" style={{ maxWidth: 820, display: "grid", gap: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Generate a 20-complaint batch</h2>
          <p className="muted">The generator creates structured scenarios with reporter and reported-player identities, a timeline, incident summary, impact, requested review, and two evidence exhibits per complaint.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="info">
            <small>Ranks 3–5</small>
            <strong>15 complaints</strong>
            <p className="muted">Category reply thresholds allow rank 3, 4 and 5 admins to claim these cases. Closing still follows each category’s normal close threshold.</p>
          </div>
          <div className="info">
            <small>Rank 6 and top tier</small>
            <strong>5 complaints</strong>
            <p className="muted">A rank-6 minimum reply requirement keeps these cases for rank 6 and top-tier admins.</p>
          </div>
        </div>

        <div className="panel" style={{ background: "rgba(255,255,255,.025)" }}>
          <strong>Queue and assignment rules</strong>
          <ul>
            <li>All 20 are created as OPEN and appear in the normal Active complaints queue.</li>
            <li>No administrator is pre-assigned. Eligible admins claim cases themselves.</li>
            <li>Each complaint receives two evidence records.</li>
            <li>All generated names, IDs, incidents and exhibits are explicitly marked as simulated, not real player reports or verified evidence.</li>
            <li>The batch is atomic: if all 20 cannot be created, none are saved.</li>
          </ul>
        </div>

        {error && <p role="alert" style={{ color: "#ff7777" }}>{error}</p>}
        {result && (
          <div role="status" className="panel">
            <strong>Batch {result.batchId} created successfully.</strong>
            <p>{result.created} complaints created: {result.rankThreeToFive} for ranks 3–5 and {result.rankSixPlus} for rank 6 and top tier.</p>
            <p className="muted">All {result.assigned === 0 ? "20 remain unassigned" : "complaints are ready"} in the normal Active queue.</p>
            <a className="primary" href="/admin">Open Active complaints</a>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="button" className="primary" onClick={generate} disabled={busy}>
            {busy ? "Generating 20 comps…" : result ? "Generate another 20 comps" : "Generate 20 comps"}
          </button>
          <span className="muted">Owner only · exactly 20 per batch</span>
        </div>
      </section>
    </div>
  );
}
