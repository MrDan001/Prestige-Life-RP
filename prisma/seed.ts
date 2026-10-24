// PATH: prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create default admin/owner
  const passwordHash = await bcrypt.hash("admin123", 10);
  const owner = await db.admin.upsert({
    where: { email: "owner@prestigeliferp.com" },
    update: {},
    create: {
      email: "owner@prestigeliferp.com",
      name: "Owner",
      title: "Server Owner",
      passwordHash,
      kind: "OWNER",
      level: 6,
      extraRights: ["MANAGE_CATEGORIES", "MANAGE_STAFF", "MANAGE_TEMPLATES"],
    },
  });

  // Create default starter categories
  const categories = [
    { name: "General RDM", minReplyLevel: 1, minCloseLevel: 2 },
    { name: "Staff Abuse", minReplyLevel: 3, minCloseLevel: 4 },
    { name: "Property & Economy", minReplyLevel: 1, minCloseLevel: 2 },
  ];

  for (const catData of categories) {
    const category = await db.category.upsert({
      where: { name: catData.name },
      update: {},
      create: catData,
    });

    // Seed default response templates for verdicts
    const verdicts = ["COMPLAINANT", "ACCUSED", "INSUFFICIENT"] as const;
    for (const verdict of verdicts) {
      await db.responseTemplate.create({
        data: {
          categoryId: category.id,
          name: `${catData.name} - ${verdict}`,
          verdict: verdict,
          body: `Hello {complainant}, regarding your complaint against {accused} in category {category} (Case #{caseNumber}), after reviewing the evidence, our verdict is in favour of {favoured}. Admin: {adminName} ({date}).`,
        },
      });
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });