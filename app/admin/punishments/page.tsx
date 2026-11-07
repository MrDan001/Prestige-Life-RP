// PATH: app/admin/punishments/page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";

type Option = { id: string; name: string; durationOptions: string[]; active: boolean; sortOrder: number };
type Draft = { name: string; durations: string };

const panel: React.CSSProperties = { border: "1px solid #2a2540", background: "#13111f", borderRadius: 12, padding: 16, display: "grid", gap: 10 };
const muted = "#a7a2c2";
const splitDurations = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);

export default function PunishmentSettingsPage() {
  const [options, setOptions] = useState<Option[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [name, setName] = useState("");
  const [durations, setDurations] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/punishments?all=1", { cache: "no-store" });
    if (response.ok) setOptions(await response.json());
    else setMessage((await response.json().catch(() => ({}))).error ?? "Could not load punishment choices.");
  }, []);

  useEffect(() => {
    fetch("/api/admin/me").then(async response => {
      if (!response.ok) { window.location.href = "/auth"; return; }
      if (!(await response.json()).isPrimaryOwner) { window.location.href = "/admin"; return; }
      load();
    });
  }, [load]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/punishments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, durations: splitDurations(durations) }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Punishment choice added." : data.error ?? "Could not add punishment.");
    if (response.ok) { setName(""); setDurations(""); await load(); }
  }

  function draft(option: Option): Draft {
    return drafts[option.id] ?? { name: option.name, durations: option.durationOptions.join(", ") };
  }
  function setDraft(option: Option, key: keyof Draft, value: string) {
    const current = draft(option);
    setDrafts(all => ({ ...all, [option.id]: { ...current, [key]: value } }));
  }

  async function save(option: Option) {
    const current = draft(option);
    const response = await fetch(`/api/admin/punishments/${option.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: current.name, durations: splitDurations(current.durations) }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Punishment choice saved." : data.error ?? "Could not save punishment.");
    if (response.ok) { setDrafts(all => { const next = { ...all }; delete next[option.id]; return next; }); await load(); }
  }

  async function toggle(option: Option) {
    const response = await fetch(`/api/admin/punishments/${option.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !option.active }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Punishment availability updated." : data.error ?? "Could not update punishment.");
    if (response.ok) await load();
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, display: "grid", gap: 18 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div><h1 style={{ margin: 0 }}>Punishment options</h1><p style={{ color: muted, margin: "6px 0 0" }}>Manage the punishment and duration choices shown to admins when a complaint is upheld.</p></div>
        <a href="/admin">Back to complaints</a>
      </header>
      {message && <p role="status">{message}</p>}
      <section style={panel}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Current choices</h2>
        {options.map(option => {
          const current = draft(option);
          const changed = current.name !== option.name || current.durations !== option.durationOptions.join(", ");
          return (
            <article key={option.id} style={{ borderTop: "1px solid #2a2540", paddingTop: 12, display: "grid", gap: 8, opacity: option.active ? 1 : .55 }}>
              <strong>{option.name} {option.active ? "" : "· switched off"}</strong>
              <label style={{ display: "grid", gap: 4 }}>Punishment label
                <input value={current.name} onChange={e => setDraft(option, "name", e.target.value)} maxLength={60} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>Duration choices (comma separated)
                <input value={current.durations} onChange={e => setDraft(option, "durations", e.target.value)} placeholder="30 mins, 60 mins, 120 mins" />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="primary" disabled={!changed || !current.name.trim() || splitDurations(current.durations).length === 0} onClick={() => save(option)}>Save changes</button>
                <button type="button" onClick={() => toggle(option)}>{option.active ? "Switch off" : "Switch on"}</button>
              </div>
            </article>
          );
        })}
      </section>
      <section style={panel}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Add punishment choice</h2>
        <form onSubmit={add} style={{ display: "grid", gap: 9 }}>
          <label style={{ display: "grid", gap: 4 }}>Punishment label<input value={name} onChange={e => setName(e.target.value)} required maxLength={60} placeholder="For example: Warning, Kick, Freeze" /></label>
          <label style={{ display: "grid", gap: 4 }}>Duration choices (comma separated)<input value={durations} onChange={e => setDurations(e.target.value)} required placeholder="No duration, 30 mins, 60 mins" /></label>
          <small style={{ color: muted }}>Only the primary owner account can change this catalogue. Existing issued punishments remain unchanged when the list is edited.</small>
          <button className="primary" disabled={!name.trim() || splitDurations(durations).length === 0}>Add choice</button>
        </form>
      </section>
    </main>
  );
}
