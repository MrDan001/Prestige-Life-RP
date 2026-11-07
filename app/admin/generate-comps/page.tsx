"use client";

import { useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string; minReplyLevel: number; minCloseLevel: number };
type RankGroup = "LEVEL_3_TO_5" | "LEVEL_6_PLUS";
type Row = { key: number; categoryId: string; quantity: number; rankGroup: RankGroup };
type Result = { batchId: string; created: number; rankThreeToFive: number; rankSixPlus: number; assigned: number; categories: string[] };

export default function GenerateCompsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<Row[]>([{ key: 1, categoryId: "", quantity: 5, rankGroup: "LEVEL_3_TO_5" }]);
  const [nextKey, setNextKey] = useState(2);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch("/api/admin/generate-comps")
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Could not load complaint categories.");
        setCategories(data.categories ?? []);
        if (data.categories?.length) setRows([{ key: 1, categoryId: data.categories[0].id, quantity: 5, rankGroup: data.categories[0].minReplyLevel === 6 ? "LEVEL_6_PLUS" : "LEVEL_3_TO_5" }]);
      })
      .catch(e => setError(e instanceof Error ? e.message : "Could not load categories."))
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(() => rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0), [rows]);
  const eligible = (rank: RankGroup) => categories.filter(category => rank === "LEVEL_3_TO_5" ? category.minReplyLevel <= 3 : category.minReplyLevel === 6);

  function update(key: number, patch: Partial<Row>) {
    setRows(current => current.map(row => row.key === key ? { ...row, ...patch } : row));
    setResult(null);
  }
  function addRow() {
    const first = categories[0];
    setRows(current => [...current, { key: nextKey, categoryId: first?.id ?? "", quantity: 5, rankGroup: first?.minReplyLevel === 6 ? "LEVEL_6_PLUS" : "LEVEL_3_TO_5" }]);
    setNextKey(key => key + 1);
  }
  function removeRow(key: number) {
    setRows(current => current.length > 1 ? current.filter(row => row.key !== key) : current);
    setResult(null);
  }

  async function generate() {
    if (busy || total < 1 || total > 100 || rows.some(row => !row.categoryId || !Number.isInteger(Number(row.quantity)) || Number(row.quantity) < 1 || Number(row.quantity) > 50)) return;
    const confirmed = window.confirm(\`Generate \${total} simulated complaints across \${rows.length} category row(s)?\n\nAll complaints enter the normal Active queue unassigned. Each receives two clearly labelled simulated evidence exhibits.\n\nThis does not create real player allegations or verified evidence.\`);
    if (!confirmed) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/admin/generate-comps", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.map(({ categoryId, quantity, rankGroup }) => ({ categoryId, quantity: Number(quantity), rankGroup })) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "The batch could not be generated.");
      setResult(data as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The request failed. Check the Active queue before retrying.");
    } finally { setBusy(false); }
  }

  return <div>
    <header className="topbar">
      <h1>Generate comps</h1>
      <a href="/admin" className="chip">Back to complaints</a>
    </header>
    <section className="panel" style={{ maxWidth: 900, display: "grid", gap: 16 }}>
      <div>
        <h2 style={{ margin: "0 0 8px" }}>Build a complaint batch</h2>
        <p className="muted">Choose the complaint category, quantity and admin rank group. Add as many category rows as you need in one batch.</p>
      </div>
      {loading ? <p className="muted">Loading active categories…</p> : categories.length === 0 ? <p role="alert">There are no active complaint categories available.</p> : <>
        {rows.map((row, index) => {
          const options = eligible(row.rankGroup);
          return <div key={row.key} className="info" style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Category row {index + 1}</strong>
              {rows.length > 1 && <button type="button" className="chip" onClick={() => removeRow(row.key)}>Remove</button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1.5fr) minmax(160px, 1fr) minmax(100px, .7fr)", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>Complaint category
                <select value={row.categoryId} onChange={e => update(row.key, { categoryId: e.target.value })}>
                  <option value="">Select category</option>
                  {options.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>Admin rank group
                <select value={row.rankGroup} onChange={e => {
                  const rankGroup = e.target.value as RankGroup;
                  const nextCategory = eligible(rankGroup)[0];
                  update(row.key, { rankGroup, categoryId: nextCategory?.id ?? "" });
                }}>
                  <option value="LEVEL_3_TO_5">Ranks 3–5</option>
                  <option value="LEVEL_6_PLUS">Rank 6 and top tier</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>Quantity
                <input type="number" min={1} max={50} step={1} value={row.quantity} onChange={e => update(row.key, { quantity: Number(e.target.value) })} />
              </label>
            </div>
            {!options.length && <p role="alert">No active category supports this rank group. Update category permissions first.</p>}
            <small className="muted">{row.rankGroup === "LEVEL_3_TO_5" ? "Claimable by ranks 3, 4 and 5, subject to the category's minimum reply level." : "Claimable by rank 6 and top-tier admins."} Closing permissions remain governed by the category's normal close threshold.</small>
          </div>;
        })}
        <button type="button" className="chip" onClick={addRow} disabled={rows.length >= 20}>+ Add another category</button>
        <div className="panel" style={{ background: "rgba(255,255,255,.025)" }}>
          <strong>Batch summary</strong>
          <p>{total} complaint(s) across {rows.length} category row(s).</p>
          <p className="muted">All complaints are OPEN, unassigned, and enter the normal Active queue. Each includes a structured incident, timeline, impact, requested review and two simulated text exhibits.</p>
          <p className="muted">Generated names, IDs, scenarios and exhibits are fictional simulations — never genuine player reports or verified evidence.</p>
          <small className="muted">Maximum 100 complaints per batch; maximum 50 per category row.</small>
        </div>
      </>}
      {error && <p role="alert" style={{ color: "#ff7777" }}>{error}</p>}
      {result && <div role="status" className="panel">
        <strong>Batch {result.batchId} created.</strong>
        <p>{result.created} complaints: {result.rankThreeToFive} for ranks 3–5 and {result.rankSixPlus} for rank 6 and top tier.</p>
        <p className="muted">All remain unassigned in the normal Active queue. Categories: {result.categories.join(", ")}.</p>
        <a className="primary" href="/admin">Open Active complaints</a>
      </div>}
      <button type="button" className="primary" onClick={generate} disabled={busy || loading || !categories.length || total < 1 || total > 100 || rows.some(row => !row.categoryId || !eligible(row.rankGroup).length || !Number.isInteger(Number(row.quantity)) || Number(row.quantity) < 1 || Number(row.quantity) > 50)}>
        {busy ? "Generating batch…" : \`Generate \${total} comp(s)\`}
      </button>
    </section>
  </div>;
}
