import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

async function getCase(id: string) {
  return db.complaint.findUnique({
    where: { id },
    select: {
      id: true, status: true, verdict: true, createdAt: true,
      category: { select: { name: true } },
      accusedName: true,
      accusedAdmin: { select: { name: true } },
      responses: {
        orderBy: { createdAt: "desc" }, take: 1,
        select: {
          message: true, ruleCode: true, punishmentType: true, punishmentDuration: true, createdAt: true,
          admin: { select: { name: true } },
        },
      },
    },
  });
}

const caseNumber = (id: string) => id.slice(-6).toUpperCase();
const statusLabel = (status: string) => status === "RESOLVED" ? "Resolved" : status === "DISMISSED" ? "Dismissed" : "Under review";
const verdictLabel = (verdict: string | null) => verdict === "COMPLAINANT" ? "Complaint upheld" : verdict === "ACCUSED" ? "Reported player cleared" : verdict === "INSUFFICIENT" ? "Insufficient evidence" : "Not decided";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Complaint #${caseNumber(id)} · Prestige Life RP` };
}

export default async function PublicComplaintPage({ params }: Props) {
  const { id } = await params;
  const complaint = await getCase(id);
  if (!complaint) notFound();
  const judgment = complaint.responses[0] ?? null;
  const accused = complaint.accusedAdmin?.name ?? complaint.accusedName ?? "Player";

  return (
    <>
      <Header />
      <main style={{ minHeight: "65vh", maxWidth: 860, margin: "0 auto", padding: "52px 22px 70px", color: "#f4f1ff" }}>
        <p style={{ letterSpacing: ".16em", fontSize: 11, color: "#d6a8ff", fontWeight: 700 }}>PRESTIGE LIFE RP · PLAYER CASE</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", margin: "10px 0" }}>Complaint <span style={{ color: "#d6a8ff" }}>#{caseNumber(complaint.id)}</span></h1>
        <p style={{ color: "#aaa4bf", marginBottom: 28 }}>A shareable case reference. Private report details and submitted evidence are not displayed on this page.</p>

        <section style={{ border: "1px solid #342b4b", borderRadius: 16, background: "#151222", padding: 24, display: "grid", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "space-between" }}>
            <div><small style={{ color: "#aaa4bf" }}>Case status</small><h2 style={{ margin: "5px 0 0" }}>{statusLabel(complaint.status)}</h2></div>
            <div><small style={{ color: "#aaa4bf" }}>Verdict</small><h2 style={{ margin: "5px 0 0" }}>{verdictLabel(complaint.verdict)}</h2></div>
          </div>
          <div style={{ display: "grid", gap: 5 }}><small style={{ color: "#aaa4bf" }}>Category</small><strong>{complaint.category.name}</strong></div>
          <div style={{ display: "grid", gap: 5 }}><small style={{ color: "#aaa4bf" }}>Reported player</small><strong>{accused}</strong></div>
          <div style={{ display: "grid", gap: 5 }}><small style={{ color: "#aaa4bf" }}>Submitted</small><strong>{complaint.createdAt.toLocaleString()}</strong></div>

          {judgment ? (
            <div style={{ borderTop: "1px solid #342b4b", paddingTop: 18, display: "grid", gap: 12 }}>
              <h2 style={{ fontSize: 20, margin: 0 }}>Judgment</h2>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, margin: 0 }}>{judgment.message}</p>
              {judgment.ruleCode && <p style={{ margin: 0 }}><strong>Violated rule:</strong> {judgment.ruleCode}</p>}
              {judgment.punishmentType && <p style={{ margin: 0 }}><strong>Punishment:</strong> {judgment.punishmentType}</p>}
              {judgment.punishmentDuration && <p style={{ margin: 0 }}><strong>Duration:</strong> {judgment.punishmentDuration}</p>}
              <small style={{ color: "#aaa4bf" }}>Issued by {judgment.admin.name} · {judgment.createdAt.toLocaleString()}</small>
            </div>
          ) : (
            <p style={{ borderTop: "1px solid #342b4b", paddingTop: 18, color: "#aaa4bf" }}>No judgment has been issued yet.</p>
          )}
        </section>
        <p style={{ marginTop: 18, color: "#aaa4bf", fontSize: 13 }}>Case ID: {complaint.id}</p>
      </main>
      <Footer />
    </>
  );
}
