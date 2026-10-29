const highlights = ["Custom scripts and features","Player-owned businesses","Regular events and giveaways","Multiple career paths","Dedicated and friendly staff","A growing community"];
export default function About() {
  return <section id="about" className="about-section">
    <div className="about-art" role="img" aria-label="A cinematic view over the Prestige city skyline at sunset" />
    <div className="about-copy">
      <p className="section-eyebrow">ABOUT PRESTIGE LIVE RP</p>
      <h2>What is Prestige Live RP?</h2>
      <p>Prestige Live RP is a living roleplay city built for players who want freedom, creativity, and memorable stories. From the streets to the boardroom, from public service to nightlife, every role matters and every story counts.</p>
      <ul className="about-list">{highlights.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  </section>;
}