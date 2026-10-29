const features = [
  { icon: "♧", title: "Active Community", text: "Meet players, make friends, build your network." },
  { icon: "▣", title: "Realistic Economy", text: "Work, earn, invest and build your empire." },
  { icon: "◇", title: "Serious Roleplay", text: "Respect, creativity and immersion come first." },
  { icon: "∞", title: "Endless Possibilities", text: "Be who you want. Do what you want. The choice is yours." },
];
export default function Features() {
  return <section id="features" className="feature-strip" aria-label="Prestige Life RP features">
    {features.map((feature) => <article key={feature.title} className="feature-item">
      <span className="feature-icon" aria-hidden="true">{feature.icon}</span><h2>{feature.title}</h2><p>{feature.text}</p>
    </article>)}
  </section>;
}