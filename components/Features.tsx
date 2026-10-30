const featureIcons = {
  community: (
    <>
      <circle cx="24" cy="13" r="5.2" />
      <circle cx="10.8" cy="20" r="3.8" />
      <circle cx="37.2" cy="20" r="3.8" />
      <path d="M14.2 38.5c.8-7.1 4.2-10.7 9.8-10.7s9 3.6 9.8 10.7" />
      <path d="M4.6 37c.5-5.1 3-7.8 7.3-7.8 1.2 0 2.3.2 3.2.7M43.4 37c-.5-5.1-3-7.8-7.3-7.8-1.2 0-2.3.2-3.2.7" />
    </>
  ),
  economy: (
    <>
      <rect x="6.5" y="16.5" width="35" height="25" rx="3" />
      <path d="M17 16.5v-4c0-1.7 1.3-3 3-3h8c1.7 0 3 1.3 3 3v4M6.5 25h35M20 25v4.5h8V25" />
    </>
  ),
  roleplay: (
    <>
      <path d="M24 5.5 39 11v10.5c0 9.5-5.8 16.1-15 21-9.2-4.9-15-11.5-15-21V11z" />
      <path d="m17.5 24.2 4.5 4.5 9.2-10" />
    </>
  ),
  possibilities: (
    <path d="M24 24c-5.9-8-9.6-10.2-13.5-7.1-3.6 2.9-3.6 11.3 0 14.2C14.4 34.2 18.1 32 24 24Zm0 0c5.9-8 9.6-10.2 13.5-7.1 3.6 2.9 3.6 11.3 0 14.2C33.6 34.2 29.9 32 24 24Z" />
  ),
};

type FeatureIconName = keyof typeof featureIcons;

const features = [
  { icon: "community", title: "Active Community", text: "Meet players, make friends, build your network." },
  { icon: "economy", title: "Realistic Economy", text: "Work, earn, invest and build your empire." },
  { icon: "roleplay", title: "Serious Roleplay", text: "Respect, creativity and immersion come first." },
  { icon: "possibilities", title: "Endless Possibilities", text: "Be who you want. Do what you want. The choice is yours." },
] as const;

function FeatureIcon({ name }: { name: FeatureIconName }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden="true"
    >
      {featureIcons[name]}
    </svg>
  );
}

export default function Features() {
  return (
    <section id="features" className="feature-strip" aria-label="Prestige Live RP features">
      {features.map((feature) => (
        <article key={feature.title} className="feature-item">
          <span className="feature-icon">
            <FeatureIcon name={feature.icon} />
          </span>
          <h2>{feature.title}</h2>
          <p>{feature.text}</p>
        </article>
      ))}
    </section>
  );
}
