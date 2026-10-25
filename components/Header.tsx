// PATH: components/Header.tsx
export default function Header() {
  return (
    <header className="header">
      <a href="#" className="logo">PRESTIGE LIFE</a>
      <nav className="nav">
        <a href="#features">Features</a>
        <a href="#download">Download</a>
        <a href="#join">How to Join</a>
      </nav>
      <a href="#download" className="btn btn-primary btn-sm">Play</a>
    </header>
  );
}