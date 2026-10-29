export default function Header() {
  return (
    <header className="header">
      <a href="#" className="logo" aria-label="Prestige Life RP home">
        <span className="logo-main">♛ PRESTIGE</span>
        <span className="logo-sub">LIVE RP</span>
      </a>
      <nav className="nav" aria-label="Main navigation">
        <a href="#features">Features</a>
        <a href="#download">Download</a>
        <a href="#join">How to Join</a>
      </nav>
      <a href="#download" className="btn btn-primary btn-sm">Play</a>
    </header>
  );
}