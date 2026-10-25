// PATH: app/auth/page.tsx
"use client";
import "../admin/admin.css";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: f.get("email"), password: f.get("password") }) });
    if (res.ok) { window.location.href = "/admin"; return; }
    setError((await res.json().catch(() => null))?.error ?? "Sign in failed. Please try again.");
    setBusy(false);
  }

  return (
    <main className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div>
          <div style={{ fontWeight: 700, letterSpacing: ".14em", fontSize: 15 }}>PRESTIGE <span style={{ color: "#d6197a" }}>LIFE</span></div>
          <h1 style={{ marginTop: 8 }}>Staff sign in</h1>
        </div>
        <input name="email" type="email" placeholder="Email" aria-label="Email" required autoComplete="username" />
        <input name="password" type="password" placeholder="Password" aria-label="Password" required autoComplete="current-password" />
        <button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        {error && <p role="alert" style={{ margin: 0, color: "#ff8fb4" }}>{error}</p>}
      </form>
    </main>
  );
}