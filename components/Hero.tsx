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
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-content">
        <p className="hero-kicker">ROLEPLAY · COMMUNITY · ENDLESS POSSIBILITIES</p>
        <p className="badge">{BADGE[site.launchStatus]}</p>
        <h1><span>Your Story.</span><span className="accent">Our World.</span></h1>
        <p className="tagline">
          Prestige Life RP is a next-generation roleplay community where you create your own story.
          Build a career, grow a business, uphold the law, or make your name on the streets — the city is yours.
        </p>
        <div className="cta-row">
          <a href="#download" className="btn btn-primary">Download the app <span aria-hidden="true">→</span></a>
          {site.discordUrl && <a href={site.discordUrl} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">Join Discord</a>}
        </div>
        {stats.length > 0 && <div className="stats">{stats}</div>}
      </div>
    </section>
  );
}