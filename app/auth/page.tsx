// PATH: app/auth/page.tsx
"use client";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
    });
    if (res.ok) {
      window.location.href = "/admin";
      return;
    }
    setError((await res.json().catch(() => null))?.error ?? "Sign in failed");
    setBusy(false);
  }

  return (
    <main style={{ maxWidth: 360, margin: "0 auto", padding: "96px 20px" }}>
      <h1 style={{ fontSize: "1.6rem", marginBottom: 20 }}>Admin sign in</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input name="email" type="email" placeholder="Email" required autoComplete="username" style={{ padding: 10 }} />
        <input name="password" type="password" placeholder="Password" required autoComplete="current-password" style={{ padding: 10 }} />
        <button disabled={busy} style={{ padding: 10, cursor: "pointer" }}>{busy ? "Signing in…" : "Sign in"}</button>
        {error && <p role="alert" style={{ color: "#ff6b6b" }}>{error}</p>}
      </form>
    </main>
  );
}
