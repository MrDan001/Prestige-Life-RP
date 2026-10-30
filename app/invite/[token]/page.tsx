// PATH: app/invite/[token]/page.tsx
"use client";

import { use, useState } from "react";
import "../../admin/admin.css";

export default function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "This invitation could not be accepted.");
        setBusy(false);
        return;
      }
      window.location.href = "/admin/profile?setupPasskey=1";
    } catch {
      setError("A network error occurred. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div>
          <div style={{ fontWeight: 700, letterSpacing: ".14em", fontSize: 15 }}>PRESTIGE <span style={{ color: "#d6197a" }}>LIFE</span></div>
          <h1 style={{ marginTop: 8 }}>Accept staff invitation</h1>
        </div>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          This private invitation can be used once. Accepting it activates your assigned staff account and signs you in for 30 days.
        </p>
        <button className="primary" type="button" onClick={accept} disabled={busy}>
          {busy ? "Verifying invitation…" : "Accept invitation"}
        </button>
        {error && <p role="alert" style={{ margin: 0, color: "#ff8fb4" }}>{error}</p>}
      </section>
    </main>
  );
}
