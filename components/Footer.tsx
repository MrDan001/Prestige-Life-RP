// PATH: components/Footer.tsx
export default function Footer() {
  return (
    <footer className="footer">
      <a href="/" className="footer-logo" aria-label="Prestige Live RP home">
        <img src="/prestige-logo.svg" alt="Prestige Live RP" width="190" height="75" />
      </a>
      <div className="footer-meta">
        <p>© {new Date().getFullYear()} Prestige Live RP. All rights reserved.</p>
        <a href="/auth">Admin access</a>
      </div>
    </footer>
  );
}
