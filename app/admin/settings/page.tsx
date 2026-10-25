// PATH: app/admin/settings/page.tsx
"use client";
import { useEffect, useState } from "react";

type Form = {
  launchStatus: string; playStoreUrl: string; appStoreUrl: string; apkUrl: string; apkVersion: string; discordUrl: string;
  statSlots: string; statUptime: string; statCitizens: string;
};

const box: React.CSSProperties = { border: "1px solid #2a2540", borderRadius: 8, padding: 14 };
const muted = "#9a95b5";
const field: React.CSSProperties = { display: "grid", gap: 4 };
const blank = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export default function SiteSettingsPage() {
  const [f, setF] = useState<Form | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/me").then(async r => {
      if (!r.ok) { window.location.href = "/auth"; return; }
      if (!(await r.json()).canManageSite) { window.location.href = "/admin"; return; }
      const s = await (await fetch("/api/admin/settings")).json();
      setF({
        launchStatus: s.launchStatus, playStoreUrl: blank(s.playStoreUrl), appStoreUrl: blank(s.appStoreUrl), apkUrl: blank(s.apkUrl),
        apkVersion: blank(s.apkVersion), discordUrl: blank(s.discordUrl),
        statSlots: blank(s.statSlots), statUptime: blank(s.statUptime), statCitizens: blank(s.statCitizens),
      });
    });
  }, []);

  if (!f) return <main style={{ padding: 24 }}>Loading…</main>;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
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

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: 20, display: "grid", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.4rem" }}>Home page settings</h1>
        <a href="/admin">Back to complaints</a>
      </header>

      <form onSubmit={save} style={{ ...box, display: "grid", gap: 14 }}>
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

        <button>Save</button>
        {msg && <p role="status">{msg}</p>}
      </form>
    </main>
  );
}