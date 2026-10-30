// PATH: scripts/local-owner-invite.ts
// LOCAL TEST DATABASE ONLY. Creates a one-use invitation for the owner account so you can
// register the first passkey on localhost.
//
// Run from the project root, passing the TEST project ref as a safety check:
//   npx tsx scripts/local-owner-invite.ts otcnppzbqbzfpydsqwlr
//
// It refuses to run unless DATABASE_URL contains that ref, so it cannot touch your live database.
import fs from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";

if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const ref = process.argv[2];
const url = process.env.DATABASE_URL ?? "";
if (!ref || ref.length < 10) throw new Error("Pass the TEST Supabase project ref as the first argument.");
if (!url.includes(ref)) throw new Error("DATABASE_URL does not contain that project ref. Refusing to run.");

const email = (process.argv[3] ?? process.env.OWNER_EMAIL ?? "").toLowerCase().trim();
if (!email) throw new Error("No email. Set OWNER_EMAIL in .env or pass an email as the second argument.");

const { Pool } = pkg;
const pool = new Pool({ connectionString: url });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin) throw new Error(`No admin with email ${email} in the test database. Run db-init.ps1 first.`);

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.$transaction([
    db.adminInvitation.updateMany({ where: { adminId: admin.id, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } }),
    db.adminInvitation.create({ data: { adminId: admin.id, tokenHash, expiresAt, createdById: admin.id } }),
  ]);

  console.log(`\nInvitation created for ${email} (expires ${expiresAt.toISOString()}).`);
  console.log(`Open this link in the browser on localhost:\n\nhttp://localhost:3000/invite/${token}\n`);
}

main().catch(error => { console.error(error); process.exit(1); }).finally(() => db.$disconnect());