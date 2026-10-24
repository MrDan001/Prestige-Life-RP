// PATH: components/Hero.tsx
import Counter from "./Counter";

export default function Hero() {
  return (
    <section className="hero">
      {/* Put your own image at /public/hero.jpg and it will show behind the gradient */}
      <div className="hero-bg" />
      <div className="hero-content">
        <p className="badge">Launching Soon</p>
        <h1>PRESTIGE LIFE RP</h1>
        <p className="tagline">
          Your city. Your story. A serious roleplay world built from the ground up for mobile — every choice leaves a mark.
        </p>
        <div className="cta-row">
          <a href="#join" className="btn btn-primary">Start Playing</a>
          <a href="#" className="btn btn-ghost">Join Discord</a>
        </div>
        <div className="stats">
          <Counter to={100} label="Slots" />
          <Counter to={99} suffix="%" label="Uptime" />
          <Counter to={500} suffix="+" label="Citizens" />
        </div>
      </div>
    </section>
  );
}
