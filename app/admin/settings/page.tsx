// PATH: app/admin/settings/page.tsx
"use client";
import { useEffect, useState } from "react";

type Form = {
  launchStatus: string; playStoreUrl: string; appStoreUrl: string; apkUrl: string; apkVersion: string; discordUrl: string;
  statSlots: string; statUptime: string; statCitizens: string;
};
type Me = { canManageSite: boolean; canManageRules: boolean };
type Rule = { id: string; title: string; content: string; sortOrder: number };
type RuleDraft = { title: string; content: string };

const box: React.CSSProperties = { border: "1px solid #2a2540", borderRadius: 8, padding: 14 };
const muted = "#9a95b5";
const field: React.CSSProperties = { display: "grid", gap: 4 };
const blank = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export default function SiteSettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [edits, setEdits] = useState<Record<string, RuleDraft>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/admin/me");
      if (!response.ok) { window.location.href = "/auth"; return; }
      const access: Me = await response.json();
      if (!access.canManageSite && !access.canManageRules) { window.location.href = "/admin"; return; }
      setMe(access);

      if (access.canManageSite) {
        const settingsResponse = await fetch("/api/admin/settings");
        if (!settingsResponse.ok) throw new Error("Could not load homepage settings.");
        const s = await settingsResponse.json();
        setF({
          launchStatus: s.launchStatus, playStoreUrl: blank(s.playStoreUrl), appStoreUrl: blank(s.appStoreUrl), apkUrl: blank(s.apkUrl),
          apkVersion: blank(s.apkVersion), discordUrl: blank(s.discordUrl),
          statSlots: blank(s.statSlots), statUptime: blank(s.statUptime), statCitizens: blank(s.statCitizens),
        });
      }

      if (access.canManageRules) {
        const rulesResponse = await fetch("/api/admin/rules", { cache: "no-store" });
        if (!rulesResponse.ok) {
          const data = await rulesResponse.json().catch(() => ({}));
          setMsg(data.error ?? "Could not load community rules.");
          setRules([]);
        } else {
          setRules(await rulesResponse.json());
        }
      }
    })().catch(error => setMsg(error instanceof Error ? error.message : "Could not load settings."));
  }, []);

  if (!me || (me.canManageSite && !f) || (me.canManageRules && !rules)) return <main style={{ padding: 24 }}>Loading…</main>;

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (f) setF({ ...f, [k]: e.target.value });
  };
  const text = (v: string) => (v.trim() ? v.trim() : null);
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    const body = {
      launchStatus: f.launchStatus,
      playStoreUrl: text(f.playStoreUrl), appStoreUrl: text(f.appStoreUrl), apkUrl: text(f.apkUrl),
      apkVersion: text(f.apkVersion), discordUrl: text(f.discordUrl),
      statSlots: num(f.statSlots), statUptime: num(f.statUptime), statCitizens: num(f.statCitizens),
    };
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Saved. The home page is updated." : d.error ?? "Could not save");
  }

  async function loadRules() {
    const response = await fetch("/api/admin/rules", { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMsg(data.error ?? "Could not load community rules.");
      return;
    }
    setRules(await response.json());
  }

  function setRuleDraft(rule: Rule, key: keyof RuleDraft, value: string) {
    setEdits(current => ({
      ...current,
      [rule.id]: {
        title: current[rule.id]?.title ?? rule.title,
        content: current[rule.id]?.content ?? rule.content,
        [key]: value,
      },
    }));
  }

  async function addRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, content: newContent }),
    });
    const data = await response.json().catch(() => ({}));
    setMsg(response.ok ? "Rule added and published." : data.error ?? "Could not add rule.");
    if (response.ok) {
      setNewTitle("");
      setNewContent("");
      await loadRules();
    }
  }

  async function saveRule(rule: Rule) {
    const draft = edits[rule.id] ?? { title: rule.title, content: rule.content };
    const response = await fetch("/api/admin/rules/" + rule.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json().catch(() => ({}));
    setMsg(response.ok ? "Rule saved." : data.error ?? "Could not save rule.");
    if (response.ok) {
      setEdits(current => { const next = { ...current }; delete next[rule.id]; return next; });
      await loadRules();
    }
  }

  async function deleteRule(rule: Rule) {
    if (!window.confirm("Delete the rule “" + rule.title + "”? This cannot be undone.")) return;
    const response = await fetch("/api/admin/rules/" + rule.id, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setMsg(response.ok ? "Rule deleted." : data.error ?? "Could not delete rule.");
    if (response.ok) {
      setEdits(current => { const next = { ...current }; delete next[rule.id]; return next; });
      await loadRules();
    }
  }

  async function moveRule(index: number, direction: -1 | 1) {
    if (!rules) return;
    const next = [...rules];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const item = next[index];
    next[index] = next[target];
    next[target] = item;
    const response = await fetch("/api/admin/rules/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map(rule => rule.id) }),
    });
    const data = await response.json().catch(() => ({}));
    setMsg(response.ok ? "Rule order saved." : data.error ?? "Could not reorder rules.");
    await loadRules();
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 20, display: "grid", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.4rem" }}>Home page settings</h1>
        <a href="/admin">Back to complaints</a>
      </header>

      {msg && <p role="status" aria-live="polite">{msg}</p>}

      {me.canManageSite && f && <form onSubmit={save} style={{ ...box, display: "grid", gap: 14 }}>
        <h2 style={{ fontSize: "1.1rem" }}>Homepage controls</h2>
        <label style={field}>Launch status
          <select value={f.launchStatus} onChange={set("launchStatus")}>
            <option value="COMING_SOON">Launching soon</option>
            <option value="LIVE">Now live</option>
            <option value="MAINTENANCE">Maintenance in progress</option>
          </select>
        </label>
        <label style={field}>Google Play link <input value={f.playStoreUrl} onChange={set("playStoreUrl")} placeholder="https://play.google.com/store/apps/details?id=..." /></label>
        <label style={field}>App Store link <input value={f.appStoreUrl} onChange={set("appStoreUrl")} placeholder="https://apps.apple.com/..." /></label>
        <label style={field}>Direct APK download link <input value={f.apkUrl} onChange={set("apkUrl")} placeholder="https://.../prestige-life.apk" /></label>
        <label style={field}>APK version <input value={f.apkVersion} onChange={set("apkVersion")} placeholder="1.0.0" /></label>
        <label style={field}>Discord invite link <input value={f.discordUrl} onChange={set("discordUrl")} placeholder="https://discord.gg/..." /></label>
        <small style={{ color: muted }}>A link left empty shows &quot;Coming soon&quot; on the page. Links must start with https://</small>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label style={field}>Slots <input type="number" min={0} value={f.statSlots} onChange={set("statSlots")} style={{ width: 110 }} /></label>
          <label style={field}>Uptime % <input type="number" min={0} max={100} value={f.statUptime} onChange={set("statUptime")} style={{ width: 110 }} /></label>
          <label style={field}>Citizens <input type="number" min={0} value={f.statCitizens} onChange={set("statCitizens")} style={{ width: 110 }} /></label>
        </div>
        <small style={{ color: muted }}>The three numbers on the home page. Leave one empty to hide it. Only show numbers that are true.</small>

        <button className="primary">Save homepage settings</button>
      </form>}

      {me.canManageRules && rules && <section style={{ ...box, display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ fontSize: "1.15rem" }}>Rules Manager</h2>
          <p style={{ color: muted, marginTop: 5 }}>Add, edit, remove and reorder the rules shown on the public Rules page. Only Chief Admin (Level 6) and higher can manage rules.</p>
          <p style={{ color: muted, marginTop: 5 }}>Public page: <a href="/rules" target="_blank" rel="noreferrer">/rules ↗</a></p>
        </div>

        <form onSubmit={addRule} style={{ display: "grid", gap: 8, padding: 14, border: "1px solid #2a2540", borderRadius: 8 }}>
          <h3 style={{ fontSize: "1rem" }}>Add a rule</h3>
          <label style={field}>Rule title
            <input value={newTitle} onChange={event => setNewTitle(event.target.value)} maxLength={120} required placeholder="For example: Respect other players" />
          </label>
          <label style={field}>Rule details
            <textarea value={newContent} onChange={event => setNewContent(event.target.value)} rows={5} maxLength={5000} required placeholder="Write the full rule and any explanation…" />
          </label>
          <button className="primary" disabled={!newTitle.trim() || !newContent.trim()}>Add and publish rule</button>
        </form>

        {rules.length === 0 ? <p style={{ color: muted }}>No rules have been added yet. Add the first rule above to publish it.</p> :
          rules.map((rule, index) => {
            const draft = edits[rule.id] ?? { title: rule.title, content: rule.content };
            const changed = draft.title !== rule.title || draft.content !== rule.content;
            return <article key={rule.id} style={{ display: "grid", gap: 9, padding: 14, border: "1px solid #2a2540", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <strong>Rule {index + 1}</strong>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" disabled={index === 0} onClick={() => moveRule(index, -1)} aria-label={"Move rule " + (index + 1) + " up"}>Move up ↑</button>
                  <button type="button" disabled={index === rules.length - 1} onClick={() => moveRule(index, 1)} aria-label={"Move rule " + (index + 1) + " down"}>Move down ↓</button>
                </div>
              </div>
              <label style={field}>Rule title
                <input value={draft.title} onChange={event => setRuleDraft(rule, "title", event.target.value)} maxLength={120} />
              </label>
              <label style={field}>Rule details
                <textarea value={draft.content} onChange={event => setRuleDraft(rule, "content", event.target.value)} rows={5} maxLength={5000} />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="primary" disabled={!changed || !draft.title.trim() || !draft.content.trim()} onClick={() => saveRule(rule)}>Save changes</button>
                <button type="button" onClick={() => deleteRule(rule)}>Delete rule</button>
              </div>
            </article>;
          })}
      </section>}
    </main>
  );
}
