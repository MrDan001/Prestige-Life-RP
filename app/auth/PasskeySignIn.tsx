"use client";

import { useState } from "react";
import { startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";

export default function PasskeySignIn() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function signIn() {
    setBusy(true);
    setMessage("");
    try {
      if (!browserSupportsWebAuthn()) throw new Error("This browser does not support passkeys. Try an updated Chrome, Safari, or Edge browser.");
      const optionsResponse = await fetch("/api/admin/passkeys/auth/options", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      });
      const data = await optionsResponse.json().catch(() => ({}));
      if (!optionsResponse.ok) throw new Error(data.error ?? "Could not start passkey sign-in.");
      const credential = await startAuthentication({ optionsJSON: data.options });
      const verifyResponse = await fetch("/api/admin/passkeys/auth/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, challengeId: data.challengeId, response: credential }),
      });
      const verified = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(verified.error ?? "Passkey sign-in failed.");
      window.location.href = "/admin";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign in with this passkey.");
      setBusy(false);
    }
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div>
          <div style={{ fontWeight: 700, letterSpacing: ".14em", fontSize: 15 }}>PRESTIGE <span style={{ color: "#d6197a" }}>LIFE</span></div>
          <h1 style={{ marginTop: 8 }}>Staff sign in</h1>
        </div>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Sign in securely with the passkey saved on your phone, computer, or security key. No password or email link is needed.
        </p>
        <label style={{ display: "grid", gap: 6, color: "var(--muted)", fontSize: 13 }}>
          Registered staff email
          <input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" required />
        </label>
        <button className="primary" type="button" onClick={signIn} disabled={busy || !email.trim()}>
          {busy ? "Waiting for passkey…" : "Sign in with passkey"}
        </button>
        {message && <p role="alert" style={{ margin: 0, color: "#ff8fb4" }}>{message}</p>}
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
          First time here or changed devices? Ask the owner for a fresh staff invitation to register a passkey.
        </p>
        <a href="/" style={{ textAlign: "center" }}>Return to website</a>
      </section>
    </main>
  );
}
