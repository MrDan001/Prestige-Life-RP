// PATH: app/api/admin/demo-comps/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const players = [["NovaSkies","EU-10482","United Kingdom"],["LunaByte","NA-20811","Canada"],["KairoZen","AS-33019","Japan"],["MilaRoux","EU-44107","France"],["AceMonroe","NA-55261","United States"],["SoraWave","AS-66302","South Korea"],["AmaraV","AF-77413","South Africa"],["RicoSantos","SA-88524","Brazil"],["EllieNorth","EU-99635","Ireland"],["ZaynOrbit","ME-10746","United Arab Emirates"],["MasonGrey","NA-11857","United States"],["IslaFern","OC-12968","New Zealand"],["TheoM","EU-13079","Germany"],["NiaSol","AF-14180","Kenya"],["LeoMarin","EU-15291","Spain"],["HarperJ","NA-16302","United States"],["MikaStorm","EU-17413","Sweden"],["AriCosta","SA-18524","Argentina"],["ChloePark","AS-19635","Singapore"],["FinnR","EU-20746","Netherlands"],["DanteVale","NA-21857","United States"],["YukiMori","AS-22968","Japan"],["LaylaK","ME-23079","Jordan"],["OscarBlake","OC-24180","Australia"],["MayaBloom","NA-25291","United States"],["EthanCross","EU-26302","United Kingdom"],["ZuriM","AF-27413","Ghana"],["NoahVale","EU-28524","Italy"],["RheaMoon","AS-29635","India"],["MaxRiver","NA-30746","Canada"],["EvaLind","EU-31857","Denmark"],["JaydenFox","NA-32968","United States"],["CamilaRey","SA-33079","Chile"],["IdrisLane","AF-34180","Nigeria"],["MiloHart","EU-35291","Belgium"],["SiennaRose","OC-36302","Australia"],["KaiW","AS-37413","Taiwan"],["RubyJames","NA-38524","United States"],["AidenCole","EU-39635","Portugal"],["PriyaSen","AS-40746","India"],["MateoR","SA-41857","Mexico"],["FreyaStone","EU-42968","Norway"],["SamiraQ","ME-43079","Turkey"],["BenjiMiles","NA-44180","United States"],["AnyaVoss","EU-45291","Poland"]];
const accusedPlayers: string[] = ["Ethan Vale","Sofia Bennett","Liam Carter","Maya Brooks","Noah Reed","Ava Mitchell","Lucas Hayes","Isabella Price","Mason Cooper","Amelia Foster","Oliver Ward","Chloe Morgan","Elijah Ross","Grace Turner","James Parker","Zoe Collins","Benjamin Gray","Lily Adams","Henry Bell","Nora Hughes","Jack Murphy","Aria Kelly","Leo Bailey","Ella Richardson","Samuel Cox","Mila Howard","Daniel Flores","Ruby Sanders","Alexander Perry","Layla Jenkins","Michael Powell","Hannah Long","Sebastian Bryant","Ivy Russell","David Griffin","Stella Diaz","Matthew Barnes","Freya Coleman","Joseph Simmons","Alice Butler","Owen Fisher","Clara Henderson","Gabriel West","Naomi Woods","Caleb James"];
const scenarios = [["Harassment","Repeated unwanted contact","This player kept following me between public areas and sending messages after I asked them to stop. I blocked the account, but they continued using public chat to get my attention. I have screenshots and would appreciate someone checking the chat logs."],["Scamming","Trade agreement not honoured","We agreed on a trade and I transferred my item first after they said their inventory was full. They left the server and have not returned the item or the payment. The trade should be visible in the transaction history."],["Exploiting","Suspicious gameplay behaviour","I noticed a player moving much faster than everyone else and appearing in a different location without using the normal travel system. I recorded a short clip. I am reporting it so the team can review it before making any decision."],["Bug report","Purchase charged but item missing","The purchase screen froze after I confirmed. My balance was reduced, but the item never appeared in my inventory. I restarted and checked storage. Could someone check the transaction and restore the item if it went through?"],["Staff conduct","Unclear or inconsistent moderation","I received a warning but was not given a clear explanation of which rule I broke. I asked politely for clarification and the conversation was closed. I would appreciate an independent review and an explanation of the decision."],["Player conduct","Disrupting an active roleplay scene","A player repeatedly drove into our scene and blocked the entrance while we were trying to finish an interaction. Several people asked them to move, but they continued until the group gave up and left."],["Account issue","Unexpected account or character change","When I logged in, one of my character details had changed even though I did not request an edit. I am concerned someone else may have accessed the account. Please review the recent account activity and let me know what steps to take."],["Property issue","Garage or property state not updating","I transferred my vehicle to another garage, but it is now missing from both locations. I have restarted the game and checked the impound list. The vehicle was present before the transfer."],["Harassment","Personal comments in voice chat","Another player made repeated personal comments about me in voice chat. I asked them to stop and muted them, but they continued through nearby chat and followed me to another area. It made the session uncomfortable."],["Scamming","Payment taken without delivery","I paid the agreed amount for an item, but the seller never delivered it. They confirmed the payment and then stopped replying. I can provide the approximate time and transaction details if needed."],["Bug report","Reward not credited after completion","I completed the activity and received the success message, but the reward was not added to my account. The activity disappeared from the list, so I cannot repeat it to test whether it happens again."],["Player conduct","Blocking a shared entrance","A player parked across a busy entrance and refused to move after several requests. New players and other residents could not get through. This has happened more than once in the same location."],["Exploiting","Possible safe-zone rule bypass","A player appeared to damage others inside an area marked as safe. I could not reproduce it when I tested the location afterwards, so I am not sure whether it was an exploit or a temporary bug."],["Staff conduct","Private report details shared publicly","Details from a report I submitted privately were repeated in a public channel. I had not agreed to share that information. Please check who accessed the report and whether the details should have remained private."],["Property issue","Item disappeared after placement","I purchased an item for my property and placed it. It appeared briefly, then vanished after I changed rooms. The payment was taken and the item is not available in storage either."]];
const DEMO_COMP_OWNER_EMAIL = "officialsafebase@gmail.com";
function canManageDemoComps(email: string) { return email.trim().toLowerCase() === DEMO_COMP_OWNER_EMAIL; }
export async function GET() {
 const auth = await requireAdmin(); if (auth.error) return auth.error;
 if (!canManageDemoComps(auth.admin.email)) return NextResponse.json({ error: "Not found." }, { status: 404 });
 const count = await db.complaint.count({ where: { demoGroup: { not: null } } });
 return NextResponse.json({ generated: count > 0, count });
}

export async function POST() {
 const auth = await requireAdmin(); if (auth.error) return auth.error;
 if (!canManageDemoComps(auth.admin.email)) return NextResponse.json({ error: "Only officialsafebase@gmail.com can add demo complaints." }, { status: 403 });
 const existing = await db.complaint.count({ where: { demoGroup: { not: null } } });
 if (existing) return NextResponse.json({ error: "The normal complaint queue already contains the demo set.", count: existing }, { status: 409 });
 const categoryRows = await db.category.findMany({ where: { name: { in: ["Rule Break", "Staff Abuse", "Hacking"] }, active: true } });
 const categoryByName = new Map(categoryRows.map(c => [c.name, c.id]));
 if (!categoryByName.has("Rule Break") || !categoryByName.has("Staff Abuse") || !categoryByName.has("Hacking"))
   return NextResponse.json({ error: "Required complaint categories are missing or inactive. No demo records were created." }, { status: 500 });
 const now = Date.now();
 const prepared = players.map((p, i) => {
   const sc = scenarios[i % scenarios.length];
   const sourceCategory = sc[0] === "Staff conduct" ? "Staff Abuse" : sc[0] === "Exploiting" ? "Hacking" : "Rule Break";
   return {
     gameId: "PL-" + p[1], username: p[0], country: p[2],
     categoryId: categoryByName.get(sourceCategory)!,
     message: sc[1] + "\\n\\n" + sc[2],
     demoGroup: i < 25 ? "A" : i < 40 ? "B" : "C",
     createdAt: new Date(now - (i * 4 + (i % 5)) * 60 * 60 * 1000),
   };
 });
 try {
   await db.$transaction(async tx => {
     await tx.player.createMany({ data: prepared.map(p => ({ gameId: p.gameId, username: p.username, country: p.country })) });
     const playerRows = await tx.player.findMany({ where: { gameId: { in: prepared.map(p => p.gameId) } }, select: { id: true, gameId: true } });
     const playerIdByGameId = new Map(playerRows.map(p => [p.gameId, p.id]));
     await tx.complaint.createMany({ data: prepared.map(p => ({
       playerId: playerIdByGameId.get(p.gameId)!,
       categoryId: p.categoryId,
       accusedName: accusedPlayers[i] ?? "Unknown player",
       message: p.message,
       demoGroup: p.demoGroup,
       status: "OPEN",
       createdAt: p.createdAt,
       updatedAt: p.createdAt,
     })) });
     const createdComplaints = await tx.complaint.findMany({ where: { playerId: { in: playerRows.map(p => p.id) } }, select: { id: true, playerId: true } });
     const playerNameById = new Map(playerRows.map(p => [p.id, prepared.find(item => item.gameId === p.gameId)?.username ?? "player"]));
     await tx.evidence.createMany({ data: createdComplaints.map((complaint, index) => ({ complaintId: complaint.id, kind: "TEXT", caption: "Training evidence (simulated)", text: `Training attachment for ${playerNameById.get(complaint.playerId) ?? "the reporting player"}: ${["Chat excerpt and timestamp supplied for moderator review.","Trade history reference and transaction details supplied for verification.","Gameplay clip description and approximate server timestamp supplied for review.","Purchase receipt reference and inventory state supplied for verification.","Moderation conversation excerpt supplied for an independent review."][index % 5]}` })) });
   });
 } catch (error) {
   console.error("Demo complaint generation failed", error);
   return NextResponse.json({ error: "Could not create the demo complaints. No partial set was committed." }, { status: 500 });
 }
 return NextResponse.json({ ok: true, created: prepared.length, allocation: { A: 25, B: 15, C: 5 }, destination: "normal complaints queue" }, { status: 201 });
}
