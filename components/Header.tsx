// PATH: components/Header.tsx
export default function Header() {
  return (
    <header className="header">
      <a href="#" className="logo">PRESTIGE LIFE</a>
      <nav className="nav">
        <a href="#features">Features</a>
        <a href="#join">How to Join</a>
      </nav>
      <a href="#join" className="btn btn-primary btn-sm">Play</a>
    </header>
  );
}
