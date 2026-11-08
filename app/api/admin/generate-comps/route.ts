// PATH: app/api/admin/generate-comps/route.ts
import { randomInt, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const OWNER_EMAIL = "officialsafebase@gmail.com";

type Scenario = { title: string; summary: string; complaint: string; exhibitA: string; exhibitB: string };

// A broad sample of names from multiple regions keeps generated identities representative of a global community.
type GeneratedIdentityPair = {
  reporter: { username: string; country: string };
  accused: { username: string; country: string };
};

// Source names are normalized to the required Firstname_lastname format before records are created.
// Every matchup intentionally crosses country boundaries.
const globalIdentityPairs: ReadonlyArray<GeneratedIdentityPair> = [
  { reporter: { username: "NgoziB", country: "Nigeria" }, accused: { username: "KelzHH", country: "Ghana" } },
  { reporter: { username: "AdaezeCB", country: "Nigeria" }, accused: { username: "AchiengJA", country: "Kenya" } },
  { reporter: { username: "TundeX", country: "Nigeria" }, accused: { username: "MasonEE", country: "United States" } },
  { reporter: { username: "ChuksAJ", country: "Nigeria" }, accused: { username: "LiamB", country: "United Kingdom" } },
  { reporter: { username: "ZaraN", country: "Nigeria" }, accused: { username: "ThaboII", country: "South Africa" } },
  { reporter: { username: "AmakaJ", country: "Nigeria" }, accused: { username: "SophieBG", country: "France" } },
  { reporter: { username: "KeneAF", country: "Nigeria" }, accused: { username: "HarutoH", country: "Japan" } },
  { reporter: { username: "BomaCD", country: "Nigeria" }, accused: { username: "RaviJB", country: "India" } },
  { reporter: { username: "IfeO", country: "Nigeria" }, accused: { username: "LucasDC", country: "Brazil" } },
  { reporter: { username: "DamiHH", country: "Nigeria" }, accused: { username: "NoraK", country: "Germany" } },
  { reporter: { username: "ChidiE", country: "Nigeria" }, accused: { username: "MiaBI", country: "Canada" } },
  { reporter: { username: "EfeB", country: "Nigeria" }, accused: { username: "YukiFF", country: "Japan" } },
  { reporter: { username: "NnekaBA", country: "Nigeria" }, accused: { username: "OmarGG", country: "Egypt" } },
  { reporter: { username: "FemiZ", country: "Nigeria" }, accused: { username: "ElifCE", country: "Türkiye" } },
  { reporter: { username: "TomiI", country: "Nigeria" }, accused: { username: "KaiDA", country: "Australia" } },
  { reporter: { username: "KwameEF", country: "Ghana" }, accused: { username: "LinaBC", country: "Sweden" } },
  { reporter: { username: "AmaG", country: "Ghana" }, accused: { username: "DiegoIB", country: "Spain" } },
  { reporter: { username: "KojoBJ", country: "Ghana" }, accused: { username: "MilaAH", country: "Poland" } },
  { reporter: { username: "AbenaE", country: "Ghana" }, accused: { username: "NoahGC", country: "United States" } },
  { reporter: { username: "KofiII", country: "Ghana" }, accused: { username: "AvaM", country: "Ireland" } },
  { reporter: { username: "AchiengD", country: "Kenya" }, accused: { username: "FelixHC", country: "Germany" } },
  { reporter: { username: "NjeriBB", country: "Kenya" }, accused: { username: "CamilaCJ", country: "Mexico" } },
  { reporter: { username: "KamauJJ", country: "Kenya" }, accused: { username: "TheoBF", country: "France" } },
  { reporter: { username: "WanjikuI", country: "Kenya" }, accused: { username: "SitiGB", country: "Malaysia" } },
  { reporter: { username: "OtienoF", country: "Kenya" }, accused: { username: "LucaCA", country: "Italy" } },
  { reporter: { username: "LeratoCG", country: "South Africa" }, accused: { username: "EthanBH", country: "United Kingdom" } },
  { reporter: { username: "ZaneleD", country: "South Africa" }, accused: { username: "PriyaII", country: "India" } },
  { reporter: { username: "SiphoHB", country: "South Africa" }, accused: { username: "InesBE", country: "Portugal" } },
  { reporter: { username: "NalediJ", country: "South Africa" }, accused: { username: "JaeEC", country: "South Korea" } },
  { reporter: { username: "ThandoBI", country: "South Africa" }, accused: { username: "MariamF", country: "Morocco" } },
  { reporter: { username: "Mason Smith", country: "United States" }, accused: { username: "Valeria Cruz", country: "Argentina" } },
  { reporter: { username: "Ava Johnson", country: "United States" }, accused: { username: "Kenji Tanaka", country: "Japan" } },
  { reporter: { username: "JordanJB", country: "United States" }, accused: { username: "NadiaDD", country: "Lebanon" } },
  { reporter: { username: "Chloe Bennett", country: "United Kingdom" }, accused: { username: "Dewi Putri", country: "Indonesia" } },
  { reporter: { username: "Oliver James", country: "United Kingdom" }, accused: { username: "Rico Santos", country: "Philippines" } },
  { reporter: { username: "FreyaBJ", country: "United Kingdom" }, accused: { username: "AndreiI", country: "Romania" } },
  { reporter: { username: "ZedHB", country: "Canada" }, accused: { username: "SofiaCF", country: "Portugal" } },
  { reporter: { username: "MapleAE", country: "Canada" }, accused: { username: "NicoDB", country: "Chile" } },
  { reporter: { username: "EmilH", country: "Denmark" }, accused: { username: "LeilaII", country: "Tunisia" } },
  { reporter: { username: "Lukas Schneider", country: "Germany" }, accused: { username: "Ana Kovac", country: "Croatia" } },
  { reporter: { username: "Giulia Romano", country: "Italy" }, accused: { username: "Mateo Silva", country: "Colombia" } },
  { reporter: { username: "Lucia Garcia", country: "Spain" }, accused: { username: "Mateo Ruiz", country: "Colombia" } },
  { reporter: { username: "Tiago Costa", country: "Portugal" }, accused: { username: "Aminata Diallo", country: "Senegal" } },
  { reporter: { username: "MilaFB", country: "Poland" }, accused: { username: "YusufCD", country: "Turkey" } },
  { reporter: { username: "EvaCJ", country: "Netherlands" }, accused: { username: "DaraBH", country: "Sri Lanka" } },
  { reporter: { username: "ErikGG", country: "Sweden" }, accused: { username: "MinaDJ", country: "Singapore" } },
  { reporter: { username: "Nikos Papas", country: "Greece" }, accused: { username: "Linh Nguyen", country: "Vietnam" } },
  { reporter: { username: "Sasha Petrenko", country: "Ukraine" }, accused: { username: "Salma Benali", country: "Algeria" } },
  { reporter: { username: "YukiBB", country: "Japan" }, accused: { username: "ArifCB", country: "Bangladesh" } },
  { reporter: { username: "MinAI", country: "South Korea" }, accused: { username: "RaniHH", country: "Nepal" } },
  { reporter: { username: "WeiDD", country: "China" }, accused: { username: "NichaCA", country: "Thailand" } },
  { reporter: { username: "PutriBF", country: "Indonesia" }, accused: { username: "ArohaJ", country: "New Zealand" } },
  { reporter: { username: "Carlos Rivera", country: "Mexico" }, accused: { username: "Ayo Bello", country: "Nigeria" } },
  { reporter: { username: "JamalDB", country: "Jamaica" }, accused: { username: "MariamAJ", country: "Egypt" } },
  { reporter: { username: "NourCD", country: "Morocco" }, accused: { username: "KwesiGH", country: "Ghana" } },
  { reporter: { username: "Hana Tesfaye", country: "Ethiopia" }, accused: { username: "Ben Walker", country: "Australia" } },
  { reporter: { username: "MusaJA", country: "Uganda" }, accused: { username: "ZaraGB", country: "United Arab Emirates" } },
  { reporter: { username: "KofiF", country: "Ghana" }, accused: { username: "SibusisoBI", country: "South Africa" } },
  { reporter: { username: "Rosa Almeida", country: "Brazil" }, accused: { username: "Tariq Haddad", country: "Jordan" } },
  { reporter: { username: "DilanAJ", country: "Sri Lanka" }, accused: { username: "SoraCC", country: "Japan" } },
  { reporter: { username: "LailaD", country: "Egypt" }, accused: { username: "KwameBB", country: "Ghana" } },
  { reporter: { username: "NeoFE", country: "Botswana" }, accused: { username: "OliviaAI", country: "United States" } },
  { reporter: { username: "AminaCH", country: "Tanzania" }, accused: { username: "LeoGD", country: "France" } },
  { reporter: { username: "ChikaBG", country: "Nigeria" }, accused: { username: "RafaelEA", country: "Brazil" } },
  { reporter: { username: "BisiHC", country: "Nigeria" }, accused: { username: "NourBD", country: "Jordan" } },
];

function formatGeneratedPlayerName(raw: string): string {
  const surnameByInitial: Record<string, string> = {
    A: "Anderson", B: "Bello", C: "Carter", D: "Davis", E: "Evans",
    F: "Foster", G: "Garcia", H: "Harris", I: "Ibrahim", J: "Jackson",
    K: "King", L: "Lewis", M: "Morgan", N: "Nelson", O: "Okafor",
    P: "Parker", Q: "Quinn", R: "Roberts", S: "Smith", T: "Taylor",
    U: "Usman", V: "Vega", W: "Walker", X: "Xavier", Y: "Young", Z: "Zane",
  };
  const cleaned = raw.trim()
    .replace(/\\s+/g, "_")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const parts = cleaned.split("_").filter(Boolean);
  const first = (parts[0] ?? "Player").replace(/[^A-Za-z]/g, "");
  const rawLast = parts.slice(1).join("").replace(/[^A-Za-z]/g, "");
  const last = rawLast.length >= 2
    ? rawLast
    : surnameByInitial[(rawLast || "P").charAt(0).toUpperCase()] ?? "Player";
  const safeFirst = first.length >= 2 ? first : "Player";
  return safeFirst + "_" + last;
}

function shuffleGlobalIdentityPairs(): GeneratedIdentityPair[] {
  const shuffled = [...globalIdentityPairs];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
const harassment: Scenario[] = [
  { title: "Repeated unwanted contact", summary: "The reported player continued sending direct messages after the reporting player clearly asked them to stop. The contact resumed in a later session.", complaint: "I asked this player to stop messaging me, but they continued contacting me and approached me again later. I am reporting this because I want the repeated contact reviewed.", exhibitA: "CHAT EXTRACT: 19:47 — reporting player: “Please stop messaging me.” 20:06 — reported player: “I am not finished talking to you.”", exhibitB: "SESSION LOG: two further proximity interactions recorded after the stop request. The interaction was recorded after the reporting player asked for contact to stop." },
  { title: "Targeted following between locations", summary: "The reporting player alleges that the same player repeatedly followed them between separate public locations after being asked to leave them alone.", complaint: "I moved to different public areas after asking for space, but this player kept appearing where I went. I felt followed and could not use those areas comfortably.", exhibitA: "LOCATION TRACE: Central Plaza 14:10; Market 14:22; Waterfront 14:31. The entries show the reported player's movements between the listed locations.", exhibitB: "CHAT EXTRACT: 14:19 — reporting player asked for space; no acknowledgement was recorded before the next location encounter." },
  { title: "Repeated insulting messages", summary: "A sequence of personal insults was directed at the reporting player in a public chat channel during a shared activity.", complaint: "I was repeatedly insulted in public chat after I asked for the comments to stop. I am reporting the messages because they disrupted the activity and were directed at me personally.", exhibitA: "PUBLIC CHAT LOG: 16:03, 16:08 and 16:12 — three separate personal remarks attributed to the reported player.", exhibitB: "WITNESS NOTE: a participant reports seeing the exchange and the request to stop." },
  { title: "Unwanted contact during a roleplay session", summary: "The reported player repeatedly interrupted a roleplay interaction with unwanted messages and close-range approaches after being asked to stop.", complaint: "I asked this player to let our roleplay scene continue, but they kept interrupting it. I could not finish the interaction as agreed.", exhibitA: "CHAT EXTRACT: 21:23 — “Please let us finish this scene.” Followed by another interruption at 21:29.", exhibitB: "EVENT SUMMARY: three interruptions recorded in the session timeline." },
  { title: "Threatening language in public chat", summary: "The reporting player submitted a report about language they interpreted as threatening during a disagreement in a public area.", complaint: "During our disagreement, this player used words that I understood as a threat. I left the area because I did not feel comfortable continuing the interaction.", exhibitA: "CHAT EXTRACT: one disputed statement is recorded at 18:39; the reported wording is included in the submitted record.", exhibitB: "REPORT TIMESTAMP: complaint submitted at 18:42, three minutes after the disputed exchange." },
];

const scam: Scenario[] = [
  { title: "Agreed exchange not completed", summary: "The players agreed to exchange an in-game item for an agreed amount. The reporting player says they transferred their side but did not receive the agreed item.", complaint: "I sent the agreed in-game payment for an item, but the item was never delivered. I contacted the other player to complete the exchange or return my payment, but it remains unresolved.", exhibitA: "TRADE RECORD: transfer from reporting player recorded at 12:09; matching delivery is absent from this transaction log.", exhibitB: "CHAT EXTRACT: 12:04 — both parties confirm the exchange terms; 12:20 — reporting player requests completion or return." },
  { title: "Payment accepted without delivery", summary: "The reported player allegedly accepted an in-game payment for a service but did not complete the agreed service within the stated time.", complaint: "I paid this player for an agreed service, but the service was not completed by the agreed time. I asked for an update and have still not received a resolution.", exhibitA: "PAYMENT LEDGER: payment reference PAY-1048 at 10:18; no completion event appears in the transaction record.", exhibitB: "MESSAGE RECORD: the service terms and expected completion time were discussed at 10:15." },
  { title: "Disputed refund after cancelled deal", summary: "A mutually discussed cancellation was followed by a dispute about whether the transferred amount was returned.", complaint: "We agreed to cancel the deal and discuss a refund, but I have not received the amount back. I am asking staff to review the transaction and clarify what is still owed.", exhibitA: "TRANSACTION HISTORY: initial transfer and cancellation discussion appear; refund status is marked unresolved in the record.", exhibitB: "CHAT EXTRACT: 15:16 — both players discuss returning the transferred amount." },
  { title: "Misrepresented item condition", summary: "The reporting player says an item was described as meeting specific conditions before purchase, but the delivered item did not match that description.", complaint: "The item I received did not match the condition or details described before I paid. I am reporting this because I relied on the original description when making the purchase.", exhibitA: "LISTING SNAPSHOT: item description captured at 17:20.", exhibitB: "INVENTORY EVENT: item transfer recorded at 17:29 with a mismatch noted in the record." },
  { title: "Repeated requests for additional payment", summary: "After an initial agreement and payment, the reported player allegedly requested additional payment that was not part of the original terms.", complaint: "We agreed on a price and I made the payment, but the other player later demanded extra money that was not part of our original agreement. I am asking staff to review what we agreed.", exhibitA: "CHAT EXTRACT: original amount confirmed at 13:40; additional amount requested at 13:52.", exhibitB: "PAYMENT RECORD: first transfer completed at 13:46; no second transfer is recorded." },
];

const exploit: Scenario[] = [
  { title: "Suspected movement exploit", summary: "The reporting player observed repeated movement that appeared inconsistent with normal movement limits during a shared session.", complaint: "I saw this player move between locations much faster than normal movement appears to allow. I am reporting the pattern so staff can check whether it was a glitch or an unfair advantage.", exhibitA: "MOVEMENT EVENT SUMMARY: three unusually short travel intervals are recorded in the session.", exhibitB: "WITNESS STATEMENT: reporting player describes the locations and timestamps where the movement pattern appeared." },
  { title: "Suspected repeated interaction abuse", summary: "The reported player appeared to trigger the same interaction repeatedly at a rate the reporting player believed was not intended by the game.", complaint: "This player repeated the same interaction unusually quickly, even after the area reset. I am asking staff to check whether it was normal gameplay or abuse of an interaction.", exhibitA: "EVENT COUNTER: repeated interaction events recorded within a short interval during the session.", exhibitB: "SESSION NOTE: the same action sequence is described across two consecutive area states." },
  { title: "Possible duplication glitch", summary: "The reporting player alleges that an item appeared more than once after a sequence of inventory actions and requests a check of the item history.", complaint: "I noticed what appeared to be duplicate copies of the same item after the player completed an inventory action. I stopped interacting with it and am reporting it so staff can check the item history.", exhibitA: "INVENTORY SNAPSHOT: two matching item entries appear after the action sequence.", exhibitB: "EVENT TRACE: inventory update and refresh events recorded at 20:04–20:05." },
  { title: "Suspected cooldown bypass", summary: "The reported player appeared to repeat an action before its normal cooldown would have elapsed.", complaint: "This player appeared to repeat an action before its normal cooldown had finished. I am reporting the repeated actions so staff can check whether the cooldown was bypassed.", exhibitA: "ACTION TIMESTAMPS: three actions recorded at 08:31, 08:32 and 08:33.", exhibitB: "WITNESS NOTE: observer reports the action repeated sooner than expected." },
  { title: "Unusual access to restricted interaction", summary: "The reporting player alleges that an account accessed an interaction point that appeared unavailable to ordinary players at the time.", complaint: "I could not access this interaction point, but I saw another player use it at the same time. I am reporting the difference so staff can check whether access permissions were working correctly.", exhibitA: "ACCESS LOG: reporting player denied at 22:10; reported player interaction recorded at 22:12.", exhibitB: "LOCATION NOTE: both events are associated with the same interaction point." },
];

const general: Scenario[] = [
  { title: "Disruption of a shared activity", summary: "The reported player repeatedly interrupted an agreed group activity after being asked to allow the activity to continue.", complaint: "We asked this player to let the group activity continue, but they kept interrupting it. I am reporting this because the group could not finish what we had planned.", exhibitA: "EVENT LOG: interruption events recorded at 14:08 and 14:17.", exhibitB: "GROUP CHAT: request to stop recorded at 14:12." },
  { title: "Repeated obstruction in a public area", summary: "The reported player repeatedly blocked access to a shared public location and did not move after being asked to clear the area.", complaint: "This player repeatedly blocked the entrance to a shared location after I asked them to move. Other participants could not use the area normally, so I am asking staff to review it.", exhibitA: "LOCATION LOG: obstruction noted at 16:40 and 16:49.", exhibitB: "CHAT EXTRACT: request to clear the entrance at 16:44." },
  { title: "Interference with another player's session", summary: "The reported player repeatedly interfered with the reporting player's planned activity, despite being asked to stop.", complaint: "This player repeatedly interfered with the activity I was trying to complete after I asked them to stop. The session could not continue as planned.", exhibitA: "SESSION EVENTS: two interference events recorded at 18:11 and 18:22.", exhibitB: "CHAT NOTE: request to stop recorded at 18:15." },
  { title: "Dispute over use of a shared space", summary: "A disagreement arose after the reported player continued using a shared space in a way the reporting player says violated the agreed arrangement.", complaint: "We had already discussed how this shared space should be used, but the other player continued using it differently. I raised the issue with them, but we could not resolve it.", exhibitA: "CHAT RECORD: shared-space terms discussed at 12:30.", exhibitB: "EVENT SUMMARY: disputed use recorded from 12:46 to 13:01." },
  { title: "Repeated rule reminder ignored", summary: "The reported player continued the disputed behaviour after receiving a clear reminder from participants that the conduct was not acceptable.", complaint: "Participants reminded this player that the behaviour was not acceptable, but it continued afterwards. I am reporting it because the reminder was ignored and the issue continued.", exhibitA: "CHAT EXTRACT: rule reminder recorded at 19:04.", exhibitB: "EVENT SUMMARY: repeated behaviour recorded at 19:12." },
];

function scenarioFor(categoryName: string, index: number): Scenario {
  const name = categoryName.toLowerCase();
  const pool = /harass|bully|threat|abuse|toxic|stalk/i.test(name) ? harassment
    : /scam|trade|fraud|payment|transaction|theft/i.test(name) ? scam
    : /exploit|cheat|hack|glitch/i.test(name) ? exploit
    : general;
  return pool[index % pool.length];
}


type RankGroup = "MIN_LEVEL_3" | "MIN_LEVEL_6";
type GenerationRow = { categoryId: string; quantity: number; rankGroup: RankGroup };

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  if (auth.admin.email.trim().toLowerCase() !== OWNER_EMAIL) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, minReplyLevel: true, minCloseLevel: true },
  });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  if (auth.admin.email.trim().toLowerCase() !== OWNER_EMAIL) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let rows: GenerationRow[];
  try {
    const body = await request.json();
    if (!Array.isArray(body?.rows) || body.rows.length < 1 || body.rows.length > 20) {
      return NextResponse.json({ error: "Add between 1 and 20 category rows." }, { status: 400 });
    }
    rows = body.rows.map((row: any) => ({
      categoryId: String(row?.categoryId ?? ""),
      quantity: Number(row?.quantity),
      rankGroup: row?.rankGroup,
    }));
    if (rows.some(row =>
      !row.categoryId ||
      !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 50 ||
      !["MIN_LEVEL_3", "MIN_LEVEL_6"].includes(row.rankGroup)
    )) {
      return NextResponse.json({ error: "Each row needs an active category, a quantity from 1 to 50, and a valid admin rank group." }, { status: 400 });
    }
    const total = rows.reduce((sum, row) => sum + row.quantity, 0);
    if (total > 100) {
      return NextResponse.json({ error: "A single batch can contain at most 100 complaints." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid generation request." }, { status: 400 });
  }

  const batchId = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  try {
    const created = await db.$transaction(async (tx) => {
      // Cast PostgreSQL's void return to text so Prisma never has to deserialize a void column.
      await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(72110520261107)) AS advisory_lock`;

      const categoryIds = [...new Set(rows.map(row => row.categoryId))];
      const categories = await tx.category.findMany({
        where: { active: true, id: { in: categoryIds } },
        orderBy: { name: "asc" },
      });
      const categoryById = new Map(categories.map(category => [category.id, category]));
      for (const row of rows) {
        const category = categoryById.get(row.categoryId);
        if (!category) throw new Error("One of the selected categories is no longer active. Refresh the page and try again.");
        if (row.rankGroup === "MIN_LEVEL_3" && category.minReplyLevel > 3) {
          throw new Error(`${category.name} does not support a minimum reply rank of 3. Choose a category with a minimum reply level of 3 or lower. Rank 6 and top-tier admins can also reply because higher ranks inherit access to lower-rank complaints.`);
        }
        if (row.rankGroup === "MIN_LEVEL_6" && category.minReplyLevel !== 6) {
          throw new Error(`${category.name} is not configured for a minimum reply rank of 6. Choose a category with a minimum reply level of 6.`);
        }
      }

      const results: { id: string; rankGroup: RankGroup; categoryName: string }[] = [];
      let sequence = 0;
      let shuffledIdentityPairs = shuffleGlobalIdentityPairs();
      for (const row of rows) {
        const category = categoryById.get(row.categoryId)!;
        for (let item = 0; item < row.quantity; item++) {
          const i = sequence++;
          if (i > 0 && i % globalIdentityPairs.length === 0) {
            shuffledIdentityPairs = shuffleGlobalIdentityPairs();
          }
          const scenario = scenarioFor(category.name, i);
          const identityPair = shuffledIdentityPairs[i % shuffledIdentityPairs.length];
          const reporterName = formatGeneratedPlayerName(identityPair.reporter.username);
          const accusedName = formatGeneratedPlayerName(identityPair.accused.username);
          const reporterGameId = `PL-${randomUUID().slice(0, 12).toUpperCase()}`;
          const accusedGameId = `PL-${randomUUID().slice(0, 12).toUpperCase()}`;
          const player = await tx.player.create({
            data: { gameId: reporterGameId, username: reporterName, country: identityPair.reporter.country },
          });
          const message = [
            "PROBLEM",
            `${scenario.title}: ${scenario.summary}`,
            "",
            "REPORTER'S COMPLAINT",
            scenario.complaint,
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
                  { kind: "TEXT", text: `EXHIBIT A\n${scenario.exhibitA}`, caption: "Supporting record" },
                  { kind: "TEXT", text: `EXHIBIT B\n${scenario.exhibitB}`, caption: "Additional supporting record" },
                ],
              },
            },
          });
          await tx.auditLog.create({
            data: {
              actorId: auth.actor.id,
              action: "COMPLAINT_CREATED",
              targetId: complaint.id,
              detail: `Category: ${category.name}; minimum reply rank: ${row.rankGroup === "MIN_LEVEL_6" ? "6 (rank 6 and top tier)" : "3 (rank 3 and above, including rank 6 and top tier)"}; no admin pre-assigned.`,
            },
          });
          results.push({ id: complaint.id, rankGroup: row.rankGroup, categoryName: category.name });
        }
      }
      return results;
    }, { timeout: 60000 });

    return NextResponse.json({
      ok: true,
      batchId,
      created: created.length,
      minimumRankThreePlus: created.filter(item => item.rankGroup === "MIN_LEVEL_3").length,
      minimumRankSixPlus: created.filter(item => item.rankGroup === "MIN_LEVEL_6").length,
      assigned: 0,
      categories: [...new Set(created.map(item => item.categoryName))],
      ids: created.map(item => item.id),
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The batch could not be generated.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
