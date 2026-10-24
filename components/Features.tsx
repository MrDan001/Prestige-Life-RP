// PATH: components/Features.tsx
const features = [
  { title: "Real Economy", text: "Own businesses, trade, and build an empire from nothing." },
  { title: "Whitelisted Jobs", text: "LSPD, EMS, mechanics, lawyers — careers that matter." },
  { title: "Gangs & Crime", text: "Heists, turf and alliances with consequences." },
  { title: "Custom Cars", text: "Hundreds of exclusive vehicles and tuning shops." },
  { title: "Housing", text: "Penthouses, mansions and hideouts you can furnish." },
  { title: "Active Staff", text: "24/7 moderation keeping roleplay serious and fair." },
];

export default function Features() {
  return (
    <section id="features" className="section">
      <h2>The Life Awaits</h2>
      <div className="grid">
        {features.map((f, i) => (
          <article key={f.title} className="card">
            <span className="num">{String(i + 1).padStart(2, "0")}</span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
