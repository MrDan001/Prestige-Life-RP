// PATH: app/auth/page.tsx
import "../admin/admin.css";

export default function LoginPage() {
  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div>
          <div style={{ fontWeight: 700, letterSpacing: ".14em", fontSize: 15 }}>PRESTIGE <span style={{ color: "#d6197a" }}>LIFE</span></div>
          <h1 style={{ marginTop: 8 }}>Staff access</h1>
        </div>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Staff access is invitation-only. Open the private invitation link provided by the Prestige Life RP owner to activate your account.
        </p>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
          No password is required. If your invitation has expired or was revoked, contact the owner for a new link.
        </p>
        <a className="primary" href="/" style={{ textAlign: "center", textDecoration: "none" }}>Return to website</a>
      </section>
    </main>
  );
}
