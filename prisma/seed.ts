// PATH: prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password) throw new Error("Set OWNER_EMAIL and OWNER_PASSWORD in .env");

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

main().finally(() => db.$disconnect());