// PATH: app/api/admin/generate-comps/route.ts
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const OWNER_EMAIL = "officialsafebase@gmail.com";

type Scenario = { title: string; summary: string; timeline: string; impact: string; exhibitA: string; exhibitB: string };

const names = [
  ["Tomi Adeyemi", "Kelechi Nwosu"], ["Zara Bello", "Daniel Okafor"], ["Musa Ibrahim", "Amaka Eze"],
  ["Chiamaka Obi", "Femi Adebayo"], ["Aisha Sani", "Tunde Balogun"], ["David Etim", "Nneka Umeh"],
  ["Ruth James", "Emeka Nnamdi"], ["Ibrahim Yusuf", "Dara Ojo"], ["Mariam Lawal", "Victor Udo"],
  ["Samuel Peters", "Ifunanya Chukwu"], ["Boma Briggs", "Lara Hassan"], ["Chisom Eke", "Yusuf Garba"],
  ["Adaora Nwankwo", "Michael Danjuma"], ["Tariq Sule", "Grace Ibe"], ["Olu Martins", "Nora Akpan"],
  ["Efe Okon", "Seyi Ajayi"], ["Fatima Bello", "Chuka Obi"], ["Benedict John", "Hauwa Musa"],
  ["Nnamdi Kalu", "Precious Edet"], ["Moyo Akin", "Ifeoma Daniel"],
];

const harassment: Scenario[] = [
  { title: "Repeated unwanted contact", summary: "The reported player continued sending direct messages after the reporting player clearly asked them to stop. The contact resumed in a later session.", timeline: "19:42 — first message received. 19:47 — reporting player asked for the contact to stop. 20:06 — further messages received. 20:11 — the reported player approached the reporting player again in the public hub.", impact: "The reporting player says the repeated contact disrupted normal play and made them leave the shared area.", exhibitA: "SIMULATED CHAT EXTRACT: 19:47 — reporting player: “Please stop messaging me.” 20:06 — reported player: “I am not finished talking to you.”", exhibitB: "SIMULATED SESSION LOG: two further proximity interactions recorded after the stop request. This is a generated scenario record, not a live platform log." },
  { title: "Targeted following between locations", summary: "The reporting player alleges that the same player repeatedly followed them between separate public locations after being asked to leave them alone.", timeline: "14:10 — both players present at Central Plaza. 14:18 — reporting player moved to the market. 14:22 — reported player arrived. 14:31 — reporting player moved to the waterfront; reported player arrived shortly afterwards.", impact: "The reporting player describes the pattern as intimidating and says it prevented them from using public areas comfortably.", exhibitA: "SIMULATED LOCATION TRACE: Central Plaza 14:10; Market 14:22; Waterfront 14:31. Entries are fictional and created for this scenario.", exhibitB: "SIMULATED CHAT EXTRACT: 14:19 — reporting player asked for space; no acknowledgement was recorded before the next location encounter." },
  { title: "Repeated insulting messages", summary: "A sequence of personal insults was directed at the reporting player in a public chat channel during a shared activity.", timeline: "16:03 — first insulting message. 16:05 — reporting player asked for the comments to stop. 16:08 and 16:12 — further personal remarks appeared in the same channel.", impact: "The reporting player says the exchange escalated a disagreement and disrupted the activity for nearby participants.", exhibitA: "SIMULATED PUBLIC CHAT LOG: 16:03, 16:08 and 16:12 — three separate personal remarks attributed to the reported player.", exhibitB: "SIMULATED WITNESS NOTE: a fictional participant reports seeing the exchange and the request to stop." },
  { title: "Unwanted contact during a roleplay session", summary: "The reported player repeatedly interrupted a roleplay interaction with unwanted messages and close-range approaches after being asked to stop.", timeline: "21:14 — roleplay interaction began. 21:19 — first interruption. 21:23 — request to stop was made. 21:29 — a further interruption occurred.", impact: "The reporting player says the interruptions prevented the scene from continuing as agreed.", exhibitA: "SIMULATED CHAT EXTRACT: 21:23 — “Please let us finish this scene.” Followed by another interruption at 21:29.", exhibitB: "SIMULATED EVENT SUMMARY: three interruptions recorded in the fictional session timeline." },
  { title: "Threatening language in public chat", summary: "The reporting player submitted a report about language they interpreted as threatening during a disagreement in a public area.", timeline: "18:36 — disagreement began. 18:39 — disputed statement posted. 18:42 — reporting player left the area and submitted the report.", impact: "The reporting player says the wording made them feel unsafe continuing the interaction.", exhibitA: "SIMULATED CHAT EXTRACT: one disputed statement is recorded at 18:39; exact wording is intentionally represented as fictional scenario evidence.", exhibitB: "SIMULATED REPORT TIMESTAMP: complaint submitted at 18:42, three minutes after the disputed exchange." },
];

const scam: Scenario[] = [
  { title: "Agreed exchange not completed", summary: "The players agreed to exchange an in-game item for an agreed amount. The reporting player says they transferred their side but did not receive the agreed item.", timeline: "12:04 — exchange terms discussed. 12:09 — reporting player transferred the agreed amount. 12:12 — the other item had not been delivered. 12:20 — follow-up request received no resolution.", impact: "The reporting player says they lost the transferred value and requests review of the exchange record.", exhibitA: "SIMULATED TRADE RECORD: transfer from reporting player recorded at 12:09; matching delivery is absent from this fictional scenario log.", exhibitB: "SIMULATED CHAT EXTRACT: 12:04 — both parties confirm the exchange terms; 12:20 — reporting player requests completion or return." },
  { title: "Payment accepted without delivery", summary: "The reported player allegedly accepted an in-game payment for a service but did not complete the agreed service within the stated time.", timeline: "10:15 — service and price agreed. 10:18 — payment transfer recorded. 10:45 — expected completion time passed. 11:02 — reporting player requested an update.", impact: "The reporting player says the transaction remains unresolved and asks staff to verify the payment and agreement.", exhibitA: "SIMULATED PAYMENT LEDGER: fictional transfer reference SIM-PAY-1048 at 10:18; no completion event appears in the scenario record.", exhibitB: "SIMULATED MESSAGE RECORD: the service terms and expected completion time were discussed at 10:15." },
  { title: "Disputed refund after cancelled deal", summary: "A mutually discussed cancellation was followed by a dispute about whether the transferred amount was returned.", timeline: "15:02 — deal agreed. 15:11 — cancellation requested. 15:16 — refund discussed. 15:30 — reporting player says the balance had not been restored.", impact: "The parties disagree about the outstanding balance and the reporting player requests an impartial transaction review.", exhibitA: "SIMULATED TRANSACTION HISTORY: initial transfer and cancellation discussion appear; refund status is marked unresolved in the fictional record.", exhibitB: "SIMULATED CHAT EXTRACT: 15:16 — both players discuss returning the transferred amount." },
  { title: "Misrepresented item condition", summary: "The reporting player says an item was described as meeting specific conditions before purchase, but the delivered item did not match that description.", timeline: "17:20 — item description shared. 17:27 — payment completed. 17:29 — item received. 17:34 — discrepancy reported to the seller.", impact: "The reporting player requests review of the original description and the item transfer record.", exhibitA: "SIMULATED LISTING SNAPSHOT: fictional item description captured at 17:20.", exhibitB: "SIMULATED INVENTORY EVENT: item transfer recorded at 17:29 with a mismatch noted in the scenario." },
  { title: "Repeated requests for additional payment", summary: "After an initial agreement and payment, the reported player allegedly requested additional payment that was not part of the original terms.", timeline: "13:40 — original terms agreed. 13:46 — first payment made. 13:52 — additional payment requested. 13:57 — reporting player disputed the changed terms.", impact: "The reporting player says the agreement changed after payment and asks staff to review the conversation and transfer history.", exhibitA: "SIMULATED CHAT EXTRACT: original amount confirmed at 13:40; additional amount requested at 13:52.", exhibitB: "SIMULATED PAYMENT RECORD: first transfer completed at 13:46; no second transfer is recorded in this fictional scenario." },
];

const exploit: Scenario[] = [
  { title: "Suspected movement exploit", summary: "The reporting player observed repeated movement that appeared inconsistent with normal movement limits during a shared session.", timeline: "09:14 — first unusual movement observed. 09:16 — the same pattern repeated near the station. 09:19 — a third occurrence was reported.", impact: "The reporting player says the behaviour may have created an unfair advantage and requests technical review rather than an immediate conclusion.", exhibitA: "SIMULATED MOVEMENT EVENT SUMMARY: three unusually short travel intervals are recorded for this fictional scenario.", exhibitB: "SIMULATED WITNESS STATEMENT: reporting player describes the locations and timestamps where the movement pattern appeared." },
  { title: "Suspected repeated interaction abuse", summary: "The reported player appeared to trigger the same interaction repeatedly at a rate the reporting player believed was not intended by the game.", timeline: "11:05 — repeated interaction began. 11:07 — activity continued after the area reset. 11:10 — reporting player captured the final sequence.", impact: "The reporting player requests review of server-side interaction events to determine whether a bug or exploit was used.", exhibitA: "SIMULATED EVENT COUNTER: repeated interaction events recorded within a short interval in this generated case.", exhibitB: "SIMULATED SESSION NOTE: the same action sequence is described across two consecutive area states." },
  { title: "Possible duplication glitch", summary: "The reporting player alleges that an item appeared more than once after a sequence of inventory actions and requests a check of the item history.", timeline: "20:02 — item held in inventory. 20:04 — inventory action sequence occurred. 20:05 — duplicate appearance reported. 20:09 — reporting player stopped interacting with the item.", impact: "The reporting player asks staff to verify whether the event was a display issue, an ordinary game bug or deliberate exploitation.", exhibitA: "SIMULATED INVENTORY SNAPSHOT: two matching item entries appear after the fictional action sequence.", exhibitB: "SIMULATED EVENT TRACE: inventory update and refresh events recorded at 20:04–20:05." },
  { title: "Suspected cooldown bypass", summary: "The reported player appeared to repeat an action before its normal cooldown would have elapsed.", timeline: "08:31 — first action. 08:32 — second action. 08:33 — third action. The reporting player says the observed interval was unusually short.", impact: "The report requests a server log review to establish whether a cooldown bypass occurred.", exhibitA: "SIMULATED ACTION TIMESTAMPS: three fictional actions recorded at 08:31, 08:32 and 08:33.", exhibitB: "SIMULATED WITNESS NOTE: observer reports the action repeated sooner than expected." },
  { title: "Unusual access to restricted interaction", summary: "The reporting player alleges that an account accessed an interaction point that appeared unavailable to ordinary players at the time.", timeline: "22:10 — access denied to reporting player. 22:12 — reported player appeared to use the interaction. 22:15 — reporting player documented the difference.", impact: "The reporting player requests review of permissions and access logs before any finding is made.", exhibitA: "SIMULATED ACCESS LOG: reporting player denied at 22:10; reported player interaction recorded at 22:12.", exhibitB: "SIMULATED LOCATION NOTE: both events are associated with the same fictional interaction point." },
];

const general: Scenario[] = [
  { title: "Disruption of a shared activity", summary: "The reported player repeatedly interrupted an agreed group activity after being asked to allow the activity to continue.", timeline: "14:02 — activity began. 14:08 — first interruption. 14:12 — group request to stop. 14:17 — another interruption occurred.", impact: "The reporting player says the repeated disruption prevented the group from completing the activity.", exhibitA: "SIMULATED EVENT LOG: interruption events recorded at 14:08 and 14:17.", exhibitB: "SIMULATED GROUP CHAT: request to stop recorded at 14:12." },
  { title: "Repeated obstruction in a public area", summary: "The reported player repeatedly blocked access to a shared public location and did not move after being asked to clear the area.", timeline: "16:40 — first obstruction. 16:44 — request to clear the entrance. 16:49 — access remained blocked. 16:53 — report submitted.", impact: "The reporting player says other participants were unable to use the location normally.", exhibitA: "SIMULATED LOCATION LOG: obstruction noted at 16:40 and 16:49.", exhibitB: "SIMULATED CHAT EXTRACT: request to clear the entrance at 16:44." },
  { title: "Interference with another player's session", summary: "The reported player repeatedly interfered with the reporting player's planned activity, despite being asked to stop.", timeline: "18:05 — activity started. 18:11 — first interference. 18:15 — request to stop. 18:22 — further interference observed.", impact: "The reporting player says the session could not proceed as planned and requests staff review.", exhibitA: "SIMULATED SESSION EVENTS: two interference events recorded at 18:11 and 18:22.", exhibitB: "SIMULATED CHAT NOTE: request to stop recorded at 18:15." },
  { title: "Dispute over use of a shared space", summary: "A disagreement arose after the reported player continued using a shared space in a way the reporting player says violated the agreed arrangement.", timeline: "12:30 — shared-space arrangement discussed. 12:46 — disputed use began. 12:52 — reporting player raised the issue. 13:01 — dispute remained unresolved.", impact: "The reporting player asks staff to review the arrangement and the recorded interaction.", exhibitA: "SIMULATED CHAT RECORD: shared-space terms discussed at 12:30.", exhibitB: "SIMULATED EVENT SUMMARY: disputed use recorded from 12:46 to 13:01." },
  { title: "Repeated rule reminder ignored", summary: "The reported player continued the disputed behaviour after receiving a clear reminder from participants that the conduct was not acceptable.", timeline: "19:00 — behaviour first reported. 19:04 — reminder issued. 19:12 — same behaviour observed again. 19:18 — report submitted.", impact: "The reporting player requests an administrator review of the repeated conduct and the surrounding context.", exhibitA: "SIMULATED CHAT EXTRACT: rule reminder recorded at 19:04.", exhibitB: "SIMULATED EVENT SUMMARY: repeated behaviour recorded at 19:12." },
];

function scenarioFor(categoryName: string, index: number): Scenario {
  const name = categoryName.toLowerCase();
  const pool = /harass|bully|threat|abuse|toxic|stalk/i.test(name) ? harassment
    : /scam|trade|fraud|payment|transaction|theft/i.test(name) ? scam
    : /exploit|cheat|hack|glitch/i.test(name) ? exploit
    : general;
  return pool[index % pool.length];
}

export async function POST() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  if (auth.admin.email.trim().toLowerCase() !== OWNER_EMAIL) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const batchId = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  try {
    const created = await db.$transaction(async (tx) => {
      // Serialize generation requests so concurrent clicks cannot interleave a batch.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(72110520261107)`;

      const categories = await tx.category.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      });
      const rankThreeToFive = categories.filter(c => c.minReplyLevel <= 3);
      const rankSixPlus = categories.filter(c => c.minReplyLevel === 6 && c.minCloseLevel <= 6);
      if (!rankThreeToFive.length || !rankSixPlus.length) {
        throw new Error(
          !rankThreeToFive.length
            ? "No active category currently allows rank 3 admins to claim and close complaints. Review category minimum levels first."
            : "No active category has a rank-6 reply requirement. At least one category must have minimum reply level 6 and close level 6 or lower for the five senior-tier cases."
        );
      }

      const results: { id: string; eligibility: string }[] = [];
      for (let i = 0; i < 20; i++) {
        const seniorTier = i >= 15;
        const eligibleCategories = seniorTier ? rankSixPlus : rankThreeToFive;
        const category = eligibleCategories[i % eligibleCategories.length];
        const scenario = scenarioFor(category.name, i);
        const [reporterName, accusedName] = names[i];
        const reporterGameId = `SIM-R-${batchId}-${String(i + 1).padStart(2, "0")}`;
        const accusedGameId = `SIM-A-${batchId}-${String(i + 1).padStart(2, "0")}`;
        const player = await tx.player.create({
          data: { gameId: reporterGameId, username: reporterName },
        });
        const message = [
          `INCIDENT: ${scenario.title}`,
          `CATEGORY: ${category.name}`,
          `REPORTING PLAYER: ${reporterName} (${reporterGameId})`,
          `REPORTED PLAYER: ${accusedName} (${accusedGameId})`,
          "",
          "SUMMARY",
          scenario.summary,
          "",
          "TIMELINE",
          scenario.timeline,
          "",
          "IMPACT / CONTEXT",
          scenario.impact,
          "",
          "REQUESTED REVIEW",
          "Please review the attached scenario exhibits and determine whether the reported conduct is supported. No finding or sanction is pre-decided.",
          "",
          "PROVENANCE",
          "This is a generated simulation case. The names, player IDs, incident and exhibits are fictional and are not a real player-submitted allegation.",
        ].join("\n");

        const complaint = await tx.complaint.create({
          data: {
            playerId: player.id,
            categoryId: category.id,
            accusedName,
            accusedGameId,
            message,
            status: "OPEN",
            evidence: {
              create: [
                {
                  kind: "TEXT",
                  text: `SIMULATED EXHIBIT A\n${scenario.exhibitA}\n\nScenario batch: ${batchId}`,
                  caption: "Simulated evidence — generated scenario, not verified player-submitted material.",
                },
                {
                  kind: "TEXT",
                  text: `SIMULATED EXHIBIT B\n${scenario.exhibitB}\n\nScenario batch: ${batchId}`,
                  caption: "Simulated supporting evidence — generated scenario, not a live system record.",
                },
              ],
            },
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: auth.actor.id,
            action: "COMPLAINT_CREATED",
            targetId: complaint.id,
            detail: `Generated simulation batch ${batchId}; eligible claim ranks: ${seniorTier ? "level 6 and top tier" : "levels 3–5"}; no admin pre-assigned.`,
          },
        });
        results.push({ id: complaint.id, eligibility: seniorTier ? "LEVEL_6_PLUS" : "LEVEL_3_TO_5" });
      }
      return results;
    }, { timeout: 30000 });

    return NextResponse.json({
      ok: true,
      batchId,
      created: created.length,
      rankThreeToFive: created.filter(c => c.eligibility === "LEVEL_3_TO_5").length,
      rankSixPlus: created.filter(c => c.eligibility === "LEVEL_6_PLUS").length,
      assigned: 0,
      ids: created.map(c => c.id),
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The batch could not be generated.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
