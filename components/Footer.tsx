// PATH: components/Footer.tsx
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-meta">
        <p>© {new Date().getFullYear()} Prestige Life RP. All rights reserved.</p>
        <a href="/rules">Community Rules</a>
        <a href="/auth">Admin access</a>
      </div>
    </footer>
  );
}
