// PATH: app/admin/profile/page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";

type Me = {
  name: string; email: string; kind: string; level: number; gameId: string | null;
  canManageStaff: boolean; canManageCategories: boolean; canManageTemplates: boolean; canManageSite: boolean;
};

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/me");
    if (r.ok) setMe(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function link(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = new FormData(e.currentTarget).get("code");
    const res = await fetch("/api/admin/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    setMsg(res.ok ? "Account successfully linked!" : (await res.json().catch(() => ({}))).error ?? "Could not link");
    if (res.ok) load();
  }

  async function unlink() {
    const res = await fetch("/api/admin/link", { method: "DELETE" });
    setMsg(res.ok ? "Account unlinked." : "Could not unlink");
    if (res.ok) load();
  }

  if (!me) return <p className="muted" style={{ padding: "24px" }}>Loading profile...</p>;

  const rank = me.kind === "ADMIN" ? `Level ${me.level} admin` : me.kind.charAt(0) + me.kind.slice(1).toLowerCase() + " · full rights";

  return (
    <div style={{ padding: "24px 32px" }}>
      <header className="topbar" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <h1>My Profile</h1>
      </header>

      <div style={{ maxWidth: "600px", display: "grid", gap: "20px", marginTop: "24px" }}>
        <div className="panel" style={{ display: "grid", gap: "12px" }}>
          <strong>Account Details</strong>
          <div><small className="muted">Name</small><p style={{ margin: "2px 0 0" }}><strong>{me.name}</strong></p></div>
          <div><small className="muted">Email Address</small><p style={{ margin: "2px 0 0" }}>{me.email || "Not specified"}</p></div>
          <div><small className="muted">Role / Rank</small><p style={{ margin: "2px 0 0" }}>{rank}</p></div>
        </div>

        <div className="panel" style={{ display: "grid", gap: "12px" }}>
          <strong>Game Account Linking</strong>
          <p className="muted" style={{ margin: 0 }}>Manage your linked game character code.</p>
          
          {me.gameId ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ padding: "8px 12px", background: "rgba(255,255,255,0.05)", borderRadius: "6px" }}>{me.gameId}</span>
              <button type="button" onClick={unlink}>Unlink Account</button>
            </div>
          ) : (
            <form onSubmit={link} style={{ display: "flex", gap: "10px" }}>
              <input name="code" placeholder="Enter link code..." aria-label="Game link code" required style={{ flex: 1, padding: "8px 12px" }} />
              <button type="submit" className="primary">Link Account</button>
            </form>
          )}

          {msg && <p role="status" style={{ margin: 0 }}>{msg}</p>}
        </div>
      </div>
    </div>
  );
}