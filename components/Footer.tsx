// PATH: components/Footer.tsx
export default function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} Prestige Life Roleplay. All rights reserved.</p>
      <a href="/auth">Admin access</a>
    </footer>
  );
}
