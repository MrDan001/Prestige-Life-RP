// PATH: components/Hero.tsx
import Counter from "./Counter";
import type { Site } from "@/lib/site";

const BADGE = { COMING_SOON: "Launching Soon", LIVE: "Now Live", MAINTENANCE: "Maintenance in progress" } as const;

export default function Hero({ site }: { site: Site }) {
  const stats = [
    site.statSlots !== null && <Counter key="s" to={site.statSlots} label="Slots" />,
    site.statUptime !== null && <Counter key="u" to={site.statUptime} suffix="%" label="Uptime" />,
    site.statCitizens !== null && <Counter key="c" to={site.statCitizens} suffix="+" label="Citizens" />,
  ].filter(Boolean);

  return (
    <section className="hero">
      {/* Put your own image at /public/hero.jpg and it will show behind the gradient */}
      <div className="hero-bg" />
      <div className="hero-content">
        <p className="badge">{BADGE[site.launchStatus]}</p>
        <h1>PRESTIGE LIFE RP</h1>
        <p className="tagline">
          Your city. Your story. A serious roleplay world built from the ground up for mobile — every choice leaves a mark.
        </p>
        <div className="cta-row">
          <a href="#download" className="btn btn-primary">Download the app</a>
          {site.discordUrl && <a href={site.discordUrl} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">Join Discord</a>}
        </div>
        {stats.length > 0 && <div className="stats">{stats}</div>}
      </div>
    </section>
  );
}