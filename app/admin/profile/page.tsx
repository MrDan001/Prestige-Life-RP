"use client";
import { useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

type Me = {
  name: string; email: string; kind: string; level: number; gameId: string | null;
  canManageStaff: boolean; canManageCategories: boolean; canManageTemplates: boolean; canManageSite: boolean; hasPasskey: boolean;
};
type Passkey = { id: string; name: string; deviceType: string; backedUp: boolean; createdAt: string; lastUsedAt: string | null };

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [profileResponse, keysResponse] = await Promise.all([fetch("/api/admin/me"), fetch("/api/admin/passkeys")]);
    if (profileResponse.ok) setMe(await profileResponse.json());
    if (keysResponse.ok) setPasskeys(await keysResponse.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addPasskey() {
    setBusy(true); setMsg("");
    try {
      const optionsResponse = await fetch("/api/admin/passkeys/register/options", { method: "POST" });
      const optionsData = await optionsResponse.json().catch(() => ({}));
      if (!optionsResponse.ok) throw new Error(optionsData.error ?? "Could not start passkey setup.");
      const credential = await startRegistration({ optionsJSON: optionsData.options });
      const verifyResponse = await fetch("/api/admin/passkeys/register/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: optionsData.challengeId, response: credential, name: "My device passkey" }),
      });
      const result = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(result.error ?? "Could not save passkey.");
      setMsg("Passkey added successfully. You can now sign in again without an invitation.");
      await load();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Passkey setup failed.");
    } finally { setBusy(false); }
  }

  async function removePasskey(id: string) {
    const response = await fetch("/api/admin/passkeys", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    const result = await response.json().catch(() => ({}));
    setMsg(response.ok ? "Passkey removed." : result.error ?? "Could not remove passkey.");
    if (response.ok) await load();
  }

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

  async function logout() {
    if (!window.confirm("Sign out of Prestige Life RP on this device?")) return;
    const res = await fetch("/api/admin/logout", { method: "POST" });
    if (res.ok) window.location.href = "/auth";
    else setMsg("Could not sign out. Please try again.");
  }

  if (!me) return <p className="muted" style={{ padding: "24px" }}>Loading profile...</p>;
  const rank = me.kind === "ADMIN" ? `Level ${me.level} admin` : me.kind.charAt(0) + me.kind.slice(1).toLowerCase() + " · full rights";

  return (
    <div style={{ padding: "24px 32px" }}>
      <header className="topbar" style={{ paddingLeft: 0, paddingRight: 0 }}><h1>My Profile</h1></header>
      <div style={{ maxWidth: "600px", display: "grid", gap: "20px", marginTop: "24px" }}>
        <div className="panel" style={{ display: "grid", gap: "12px" }}>
          <strong>Account Details</strong>
          <div><small className="muted">Name</small><p style={{ margin: "2px 0 0" }}><strong>{me.name}</strong></p></div>
          <div><small className="muted">Email Address</small><p style={{ margin: "2px 0 0" }}>{me.email || "Not specified"}</p></div>
          <div><small className="muted">Role / Rank</small><p style={{ margin: "2px 0 0" }}>{rank}</p></div>
        </div>

        <div className="panel" style={{ display: "grid", gap: "12px", borderColor: "var(--line)" }}>
          <strong>Passkey security</strong>
          <p className="muted" style={{ margin: 0 }}>Use your phone fingerprint, face unlock, device PIN, or a compatible security key to sign in. No password or email service is involved.</p>
          {!passkeys.length && <p style={{ margin: 0, color: "#ffb3cf" }}>You have not registered a passkey yet. Set one up before signing out.</p>}
          {passkeys.map(key => <div key={key.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <div style={{ minWidth: 0 }}><strong>{key.name}</strong><p className="muted" style={{ margin: "3px 0 0", fontSize: 12 }}>Added {new Date(key.createdAt).toLocaleDateString()} · {key.backedUp ? "Synced passkey" : "Device-bound passkey"}</p></div>
            <button type="button" onClick={() => removePasskey(key.id)} disabled={passkeys.length <= 1}>Remove</button>
          </div>)}
          <button type="button" className="primary" onClick={addPasskey} disabled={busy}>{busy ? "Waiting for your device…" : "Add a passkey for this device"}</button>
          <small className="muted">We recommend registering a second device or a synced passkey as a backup. Keep at least one passkey on your account.</small>
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
        </div>
        <div className="panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div><strong>Sign out</strong><p className="muted" style={{ margin: "3px 0 0" }}>End your current admin session on this device.</p></div>
          <button type="button" onClick={logout}>Sign out</button>
        </div>
        {msg && <p role="status" className="panel" style={{ margin: 0, overflowWrap: "anywhere" }}>{msg}</p>}
      </div>
    </div>
  );
}
