export default function Header() {
  return (
    <header className="header">
      <a href="/" className="logo" aria-label="Prestige Life RP home">
        <img
          className="logo-image"
          src="/prestige-life-logo.jpg"
          alt="Prestige Life RP"
          width="180"
          height="120"
        />
      </a>
      <nav className="nav" aria-label="Main navigation">
        <a href="#features">Features</a>
        <a href="/rules">Rules</a>
        <a href="#download">Download</a>
        <a href="#join">How to Join</a>
      </nav>
      <a href="#download" className="btn btn-primary btn-sm">Play</a>
    </header>
  );
}
