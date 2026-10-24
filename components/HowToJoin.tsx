// PATH: components/HowToJoin.tsx
const steps = ["Join our Discord", "Read the rules", "Install on your phone", "Connect & live"];

export default function HowToJoin() {
  return (
    <section id="join" className="section">
      <h2>How to Join</h2>
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={s}>
            <span className="step-n">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div className="download">
        <a href="#" className="btn btn-primary">Download APK</a>
        <p>Direct install for Android — no store needed.</p>
      </div>
    </section>
  );
}
