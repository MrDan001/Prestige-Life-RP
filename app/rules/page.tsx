import "./rules.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  let rules: { id: string; title: string; content: string }[] = [];
  let unavailable = false;

  try {
    rules = await db.rule.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, content: true },
    });
  } catch {
    unavailable = true;
  }

  return (
    <>
      <Header />
      <main className="rules-page">
        <section className="rules-intro">
          <p className="rules-eyebrow">PRESTIGE LIFE RP · COMMUNITY STANDARDS</p>
          <h1>Community <span>Rules</span></h1>
          <p className="rules-lead">
            These standards help keep Prestige Life RP fair, respectful and enjoyable for everyone.
            Please read them before taking part in the community.
          </p>
        </section>

        {unavailable ? (
          <section className="rules-empty" role="status">
            <h2>Rules are temporarily unavailable</h2>
            <p>Please try again shortly.</p>
          </section>
        ) : rules.length > 0 ? (
          <ol className="rules-list">
            {rules.map((rule, index) => (
              <li className="rules-card" key={rule.id}>
                <span className="rules-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div className="rules-copy">
                  <h2>{rule.title}</h2>
                  <p>{rule.content}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <section className="rules-empty">
            <h2>Rules are being prepared</h2>
            <p>The community rules will appear here once they have been published by the staff team.</p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
