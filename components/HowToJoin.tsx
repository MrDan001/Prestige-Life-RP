// PATH: components/HowToJoin.tsx
import type { Site } from "@/lib/site";

export default function HowToJoin({ site }: { site: Site }) {
  const steps = [
    site.discordUrl ? (
      <a key="d" href={site.discordUrl} target="_blank" rel="noopener noreferrer">Join our Discord</a>
    ) : (
      "Join our Discord"
    ),
    "Read the rules",
    "Install the app",
    "Open it and start your story",
  ];

  return (
    <section id="join" className="section">
      <h2>How to Join</h2>
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={i}>
            <span className="step-n">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </section>
  );
}