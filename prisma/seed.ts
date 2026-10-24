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

async function main() {
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password) throw new Error("Set OWNER_EMAIL and OWNER_PASSWORD in .env");

  // Owner login comes from .env only. No default passwords.
  await db.admin.upsert({
    where: { email: email.toLowerCase() },
    update: { kind: "OWNER", level: 6, title: "Owner" },
    create: {
      email: email.toLowerCase(),
      name: "Owner",
      title: "Owner",
      passwordHash: await bcrypt.hash(password, 12),
      kind: "OWNER",
      level: 6,
    },
  });

  // Starting examples only. Owner, tech and developers can edit these later.
  const defaults = [
    { name: "Rule Break", minReplyLevel: 3, minCloseLevel: 4 },
    { name: "Staff Abuse", minReplyLevel: 5, minCloseLevel: 5 },
    { name: "Hacking", minReplyLevel: 6, minCloseLevel: 6 },
  ];
  for (const c of defaults) await db.category.upsert({ where: { name: c.name }, update: {}, create: c });

  // Starter templates, created once. Placeholders must match lib/templates.ts.
  if ((await db.responseTemplate.count()) === 0) {
    const cats = await db.category.findMany();
    const sign = "Regards, {admin}, Prestige Life Staff ({date})";
    const bodies = [
      { verdict: "COMPLAINANT" as const, name: "Complaint upheld", body: `Hello {complainant}, thank you for your report {complaint_id} against {accused}. After reviewing the evidence we found the complaint {verdict}. Appropriate action has been taken.\n\n${sign}` },
      { verdict: "ACCUSED" as const, name: "Complaint not upheld", body: `Hello {complainant}, thank you for your report {complaint_id} against {accused}. After reviewing the evidence our decision is {verdict}, so no action will be taken against {favoured}.\n\n${sign}` },
      { verdict: "INSUFFICIENT" as const, name: "Insufficient evidence", body: `Hello {complainant}, thank you for your report {complaint_id} against {accused}. Our review is {verdict}. If you have more evidence, please file a new complaint.\n\n${sign}` },
    ];
    for (const c of cats) for (const b of bodies) await db.responseTemplate.create({ data: { categoryId: c.id, ...b } });
  }

  console.log("Owner, starter categories and templates ready:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());