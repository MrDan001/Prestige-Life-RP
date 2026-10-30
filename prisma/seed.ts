// PATH: prisma/seed.ts
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
import bcrypt from "bcryptjs";

// Load .env (the seed runs outside Next.js, and Prisma 7 does not load it either).
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

type J = { name: string; text: string; minLevel: number; verdict: "COMPLAINANT" | "ACCUSED" | "INSUFFICIENT" | null; closesAs: "RESOLVED" | "DISMISSED" };
const open = "Hello {complainant}, thank you for your report {complaint_id} against {accused}. ";
const sign = "\n\nRegards, {admin}, Prestige Life Staff ({date})";

// One-click judgments. Level 3+ can issue the first eight; the rest need level 5+ (senior admin and above).
const JUDGMENTS: J[] = [
  { name: "Approved", minLevel: 3, verdict: "COMPLAINANT", closesAs: "RESOLVED", text: "After reviewing the evidence, your complaint has been approved and appropriate action has been taken." },
  { name: "Rejected (lack of evidence)", minLevel: 3, verdict: "INSUFFICIENT", closesAs: "DISMISSED", text: "Your complaint has been rejected because there is not enough evidence to confirm a rule violation. You are welcome to file a new complaint with clearer evidence." },
  { name: "Rejected (empty complaint)", minLevel: 3, verdict: null, closesAs: "DISMISSED", text: "Your complaint has been rejected because it did not describe what happened. Please file a new complaint that explains the situation." },
  { name: "Rejected (no violation)", minLevel: 3, verdict: "ACCUSED", closesAs: "DISMISSED", text: "We found no rule violation by {accused}, so your complaint has been rejected." },
  { name: "Rejected (already punished)", minLevel: 3, verdict: null, closesAs: "DISMISSED", text: "{accused} has already been punished for this incident, so your complaint has been rejected." },
  { name: "Rejected (duplicate complaint)", minLevel: 3, verdict: null, closesAs: "DISMISSED", text: "Your complaint has been rejected because you have already reported the same incident." },
  { name: "Rejected (cropped evidence)", minLevel: 3, verdict: "INSUFFICIENT", closesAs: "DISMISSED", text: "Your complaint has been rejected because the evidence was cropped or edited and does not show the full incident. Please submit the full, uncut recording in a new complaint." },
  { name: "Technical issue", minLevel: 3, verdict: null, closesAs: "RESOLVED", text: "This was caused by a technical issue, not a rule violation. We have passed it on to the development team." },
  { name: "Rejected (no amnesty)", minLevel: 5, verdict: null, closesAs: "DISMISSED", text: "Your request has been rejected: no amnesty can be granted in this case." },
  { name: "Approved (Amnesty +)", minLevel: 5, verdict: "COMPLAINANT", closesAs: "RESOLVED", text: "Your complaint has been approved and an amnesty has been granted in this case." },
  { name: "Rejected (valid)", minLevel: 5, verdict: null, closesAs: "DISMISSED", text: "The punishment was valid, so your complaint has been rejected." },
  { name: "Rejected (not violating)", minLevel: 5, verdict: "ACCUSED", closesAs: "DISMISSED", text: "The actions you described do not violate the rules, so your complaint has been rejected." },
  { name: "Approved (discussion)", minLevel: 5, verdict: "COMPLAINANT", closesAs: "RESOLVED", text: "After discussion between the administrators, your complaint has been approved and appropriate action has been taken." },
  { name: "Wrong complaint", minLevel: 5, verdict: null, closesAs: "DISMISSED", text: "Your complaint has been rejected because it was filed against the wrong person or in the wrong category. Please file a new complaint." },
];

async function main() {
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password) throw new Error("Set OWNER_EMAIL and OWNER_PASSWORD in .env");

  // Owner login comes from .env only. No default passwords.
  await db.admin.upsert({
    where: { email: email.toLowerCase() },
    update: { kind: "OWNER", level: 6, title: "Owner" },
    create: { email: email.toLowerCase(), name: "Owner", title: "Owner", passwordHash: await bcrypt.hash(password, 12), kind: "OWNER", level: 6 },
  });

  // Starting examples only. Owner, PRM and developers can edit these later.
  const defaults = [
    { name: "Rule Break", minReplyLevel: 3, minCloseLevel: 4 },
    { name: "Staff Abuse", minReplyLevel: 5, minCloseLevel: 5 },
    { name: "Hacking", minReplyLevel: 6, minCloseLevel: 6 },
  ];
  for (const c of defaults) await db.category.upsert({ where: { name: c.name }, update: {}, create: c });

  // Judgment buttons: added once each, never overwritten (the owner may have edited them).
  for (const [i, j] of JUDGMENTS.entries()) {
    const exists = await db.responseTemplate.findFirst({ where: { name: j.name, categoryId: null } });
    if (!exists)
      await db.responseTemplate.create({ data: { name: j.name, categoryId: null, minLevel: j.minLevel, verdict: j.verdict, closesAs: j.closesAs, sortOrder: i + 1, body: open + j.text + sign } });
  }

  // Switch off the old per-category starter templates from earlier stages (switched off, not deleted).
  await db.responseTemplate.updateMany({
    where: { categoryId: { not: null }, name: { in: ["Complaint upheld", "Complaint not upheld", "Insufficient evidence"] } },
    data: { active: false },
  });

  // Built-in roles. Curator is only a title for levels 2-4. Level 6 has two titles (chief and deputy chief).
  const roles = [
    { name: "Admin", kind: "ADMIN" as const, minLevel: 1, maxLevel: 4 },
    { name: "Curator", kind: "ADMIN" as const, minLevel: 2, maxLevel: 4 },
    { name: "Senior admin", kind: "ADMIN" as const, minLevel: 5, maxLevel: 5 },
    { name: "Chief admin", kind: "ADMIN" as const, minLevel: 6, maxLevel: 6 },
    { name: "Deputy chief admin", kind: "ADMIN" as const, minLevel: 6, maxLevel: 6 },
    { name: "PRM", kind: "TECH" as const, minLevel: 6, maxLevel: 6 },
    { name: "Developer", kind: "DEVELOPER" as const, minLevel: 6, maxLevel: 6 },
    { name: "PRM 2", kind: "OWNER" as const, minLevel: 6, maxLevel: 6 },
  ];
  for (const r of roles) await db.role.upsert({ where: { name: r.name }, update: {}, create: { ...r, system: true } });

  // Attach existing staff to a matching role (their titles are left as they are).
  const byName = new Map((await db.role.findMany()).map((r) => [r.name.toLowerCase(), r.id]));
  for (const a of await db.admin.findMany({ where: { roleId: null } })) {
    const id =
      byName.get(a.title.toLowerCase()) ??
      (a.kind !== "ADMIN" ? byName.get(a.kind.toLowerCase()) : a.level === 5 ? byName.get("senior admin") : a.level <= 4 ? byName.get("admin") : undefined);
    if (id) await db.admin.update({ where: { id: a.id }, data: { roleId: id } });
  }

  console.log("Owner, starter categories, judgment buttons and roles ready:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());