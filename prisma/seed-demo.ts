// PATH: prisma/seed-demo.ts
// Adds (or removes) demo staff and demo complaints so you can test each level.
// Run through demo-data.ps1:  .\demo-data.ps1 add   |   .\demo-data.ps1 remove
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
import bcrypt from "bcryptjs";

if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
const { Pool } = pkg;
const db = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });

const action = process.argv[2] ?? "add";
const DOMAIN = "@demo.local";
const IMG = "https://placehold.co/640x360/2b1b4a/ffffff?text=Demo+screenshot";

const STAFF = [
  { key: "l1", name: "Demo Admin L1", role: "Admin", level: 1, kind: "ADMIN" as const },
  { key: "l2", name: "Demo Curator L2", role: "Curator", level: 2, kind: "ADMIN" as const },
  { key: "l3", name: "Demo Curator L3", role: "Curator", level: 3, kind: "ADMIN" as const },
  { key: "l4", name: "Demo Admin L4", role: "Admin", level: 4, kind: "ADMIN" as const },
  { key: "l5", name: "Demo Senior Admin", role: "Senior admin", level: 5, kind: "ADMIN" as const },
  { key: "chief", name: "Demo Chief Admin", role: "Chief admin", level: 6, kind: "ADMIN" as const },
  { key: "deputy", name: "Demo Deputy Chief", role: "Deputy chief admin", level: 6, kind: "ADMIN" as const },
  { key: "tech", name: "Demo Tech", role: "Tech", level: 6, kind: "TECH" as const },
  { key: "dev", name: "Demo Developer", role: "Developer", level: 6, kind: "DEVELOPER" as const },
];

type Ev = { kind: "IMAGE" | "VIDEO" | "LINK" | "TEXT"; url?: string; text?: string; caption?: string };
type Demo = {
  cat: string; by: string; accused?: { name: string; staff?: string }; msg: string; ev: Ev[]; ago: number;
  state?: { claim: string; status?: "IN_REVIEW" | "RESOLVED"; verdict?: "COMPLAINANT"; note?: string; reply?: string };
};

const CHAT = "[12:01] BadGuy_01: freeze or I shoot\n[12:01] Tunde_K: wait what\n[12:02] BadGuy_01: nothing personal";
const DEMOS: Demo[] = [
  { cat: "Rule Break", by: "Tunde_K", accused: { name: "BadGuy_01" }, ago: 20, msg: "He shot me three times outside the bank for no reason after I left the shop.", ev: [{ kind: "IMAGE", url: IMG, caption: "Screenshot outside the bank" }, { kind: "TEXT", text: CHAT, caption: "Chat log" }, { kind: "LINK", url: "https://example.com/demo/clip-1", caption: "Video clip" }] },
  { cat: "Rule Break", by: "Ngozi_B", accused: { name: "Kelz_77" }, ago: 45, msg: "He keeps blocking the road with his car and ramming people.", ev: [{ kind: "IMAGE", url: IMG, caption: "Cropped screenshot" }] },
  { cat: "Rule Break", by: "Emeka_J", accused: { name: "Nova_X" }, ago: 70, msg: "He cheated.", ev: [] },
  { cat: "Rule Break", by: "Tunde_K", accused: { name: "BadGuy_01" }, ago: 10, msg: "He shot me three times outside the bank for no reason after I left the shop.", ev: [{ kind: "LINK", url: "https://example.com/demo/clip-1" }] },
  { cat: "Rule Break", by: "Sade_A", accused: { name: "Rico_D" }, ago: 120, msg: "He insulted me in voice chat after the race.", ev: [{ kind: "TEXT", text: "[18:40] Rico_D: you drive like a child", caption: "Chat log" }], state: { claim: "l3", status: "IN_REVIEW", note: "Waiting for the audio clip from the player." } },
  { cat: "Rule Break", by: "Femi_O", ago: 200, msg: "The game froze and I lost my car when the server restarted.", ev: [] },
  { cat: "Hacking", by: "Bola_T", accused: { name: "Nova77" }, ago: 300, msg: "He flies and teleports around the city.", ev: [{ kind: "LINK", url: "https://example.com/demo/clip-2", caption: "Video clip" }, { kind: "IMAGE", url: IMG }] },
  { cat: "Staff Abuse", by: "Mike_O", accused: { name: "Demo Admin L4", staff: "l4" }, ago: 400, msg: "An admin jailed me with no explanation.", ev: [{ kind: "TEXT", text: "[20:10] Admin: you are jailed 30 min", caption: "Chat log" }] },
  { cat: "Staff Abuse", by: "Ada_K", accused: { name: "Demo Senior Admin", staff: "l5" }, ago: 500, msg: "A senior admin took my money during a check.", ev: [{ kind: "IMAGE", url: IMG }] },
  { cat: "Staff Abuse", by: "Kunle_P", accused: { name: "Demo Chief Admin", staff: "chief" }, ago: 600, msg: "The chief admin banned me after an argument.", ev: [{ kind: "TEXT", text: "[21:05] Chief: you are banned", caption: "Chat log" }] },
  { cat: "Rule Break", by: "Zainab_L", accused: { name: "Demo Tech", staff: "tech" }, ago: 700, msg: "A tech staff member used a spawned car in a robbery.", ev: [{ kind: "LINK", url: "https://example.com/demo/clip-3" }] },
  { cat: "Rule Break", by: "Obi_M", accused: { name: "Rico_D" }, ago: 1500, msg: "He stole my car at the dealership.", ev: [{ kind: "IMAGE", url: IMG }], state: { claim: "l3", status: "RESOLVED", verdict: "COMPLAINANT", reply: "Hello Obi_M, thank you for your report. After reviewing the evidence, your complaint has been approved and appropriate action has been taken." } },
];

const ago = (m: number) => new Date(Date.now() - m * 60_000);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

async function remove() {
  const players = (await db.player.findMany({ where: { gameId: { startsWith: "demo-p-" } }, select: { id: true } })).map((p) => p.id);
  const cids = (await db.complaint.findMany({ where: { playerId: { in: players } }, select: { id: true } })).map((c) => c.id);
  const aids = (await db.admin.findMany({ where: { email: { endsWith: DOMAIN } }, select: { id: true } })).map((a) => a.id);

  await db.auditLog.deleteMany({ where: { OR: [{ targetId: { in: [...cids, ...aids] } }, { actorId: { in: aids } }] } });
  await db.note.deleteMany({ where: { OR: [{ complaintId: { in: cids } }, { adminId: { in: aids } }] } });
  await db.response.deleteMany({ where: { OR: [{ complaintId: { in: cids } }, { adminId: { in: aids } }] } });
  await db.evidence.deleteMany({ where: { complaintId: { in: cids } } });
  await db.complaint.updateMany({ where: { id: { notIn: cids }, OR: [{ claimedById: { in: aids } }, { accusedAdminId: { in: aids } }] }, data: { claimedById: null, accusedAdminId: null } });
  await db.complaint.deleteMany({ where: { id: { in: cids } } });
  await db.player.deleteMany({ where: { id: { in: players } } });
  await db.admin.deleteMany({ where: { id: { in: aids } } });
  console.log(`Removed ${cids.length} demo complaints, ${players.length} demo players and ${aids.length} demo staff accounts.`);
}

async function add() {
  const password = process.env.DEMO_PASSWORD || `Demo-${randomBytes(9).toString("base64url")}`;
  const hash = await bcrypt.hash(password, 12);
  const roles = new Map((await db.role.findMany()).map((r) => [r.name, r.id]));

  const staff = new Map<string, string>();
  for (const s of STAFF) {
    const email = `demo-${s.key}${DOMAIN}`;
    const data = { name: s.name, title: s.role, kind: s.kind, level: s.level, roleId: roles.get(s.role) ?? null, gameId: `demo-staff-${s.key}`, passwordHash: hash, suspended: false };
    const a = await db.admin.upsert({ where: { email }, update: data, create: { email, ...data } });
    staff.set(s.key, a.id);
  }

  const cats = new Map<string, string>();
  const defaults: Record<string, [number, number]> = { "Rule Break": [3, 4], "Staff Abuse": [5, 5], Hacking: [6, 6] };
  for (const [name, [r, c]] of Object.entries(defaults)) {
    const cat = await db.category.upsert({ where: { name }, update: {}, create: { name, minReplyLevel: r, minCloseLevel: c } });
    cats.set(name, cat.id);
  }

  let made = 0;
  if (await db.player.findFirst({ where: { gameId: { startsWith: "demo-p-" } } })) {
    console.log("Demo complaints already exist, so none were added. Run remove first if you want them recreated.");
  } else {
    for (const d of DEMOS) {
      const player = await db.player.upsert({ where: { gameId: `demo-p-${slug(d.by)}` }, update: {}, create: { gameId: `demo-p-${slug(d.by)}`, username: d.by } });
      const accusedStaff = d.accused?.staff ? staff.get(d.accused.staff) : undefined;
      const claimedBy = d.state ? staff.get(d.state.claim) : undefined;
      const c = await db.complaint.create({
        data: {
          playerId: player.id, categoryId: cats.get(d.cat)!, message: d.msg, createdAt: ago(d.ago),
          accusedName: d.accused?.name, accusedGameId: d.accused ? (d.accused.staff ? `demo-staff-${d.accused.staff}` : `demo-t-${slug(d.accused.name)}`) : undefined,
          accusedAdminId: accusedStaff, status: d.state?.status ?? "OPEN", verdict: d.state?.verdict,
          claimedById: claimedBy, claimedAt: claimedBy ? ago(d.ago - 5) : undefined,
          evidence: { create: d.ev.map((e) => ({ kind: e.kind, url: e.url, text: e.text, caption: e.caption })) },
        },
      });
      if (claimedBy) {
        await db.auditLog.create({ data: { actorId: claimedBy, action: "COMPLAINT_CLAIM", targetId: c.id, detail: "claimed this complaint", createdAt: ago(d.ago - 5) } });
        if (d.state?.note) await db.note.create({ data: { complaintId: c.id, adminId: claimedBy, message: d.state.note, createdAt: ago(d.ago - 10) } });
        if (d.state?.reply) {
          await db.response.create({ data: { complaintId: c.id, adminId: claimedBy, message: d.state.reply, syncedToGame: true, createdAt: ago(d.ago - 20) } });
          await db.auditLog.create({ data: { actorId: claimedBy, action: "COMPLAINT_VERDICT", targetId: c.id, detail: "none -> COMPLAINANT", createdAt: ago(d.ago - 20) } });
          await db.auditLog.create({ data: { actorId: claimedBy, action: "COMPLAINT_STATUS", targetId: c.id, detail: "OPEN -> RESOLVED (judgment: Approved)", createdAt: ago(d.ago - 20) } });
        }
      }
      made++;
    }
  }

  console.log(`\nDemo data ready: ${STAFF.length} demo staff accounts, ${made} new demo complaints.\n`);
  console.log("Demo logins (all use the same password):");
  for (const s of STAFF) console.log(`  demo-${s.key}${DOMAIN}`.padEnd(30) + `${s.role}${s.kind === "ADMIN" ? `, level ${s.level}` : ", top tier"}${s.level < 3 && s.kind === "ADMIN" ? "  (cannot sign in: below level 3)" : ""}`);
  console.log(`\nPassword: ${password}`);
  console.log("Write it down now. It is shown only this once. Running add again sets a new one.");
}

(action === "remove" ? remove() : add())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());