// PATH: diagnose.mjs
// Run from the project root:  node diagnose.mjs
// Checks .env, the database connection, the tables and the owner login. It never prints passwords or keys.
import fs from "node:fs";
import pg from "pg";
import bcrypt from "bcryptjs";

const env = {};
let raw = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
const hadBom = raw.charCodeAt(0) === 0xfeff;
raw = raw.replace(/^\uFEFF/, "");
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
console.log(`      .env is ${raw ? "present" : "MISSING or empty"}; names found: ${Object.keys(env).join(", ") || "none"}`);
if (hadBom) console.log("WARN  .env starts with a hidden BOM character, which can hide the first line from the app. Run fix-env.ps1.");
if ("DATABASE_URL" in env && !env.DATABASE_URL) console.log("WARN  DATABASE_URL is in .env but empty.");
const ok = (good, msg) => console.log((good ? "OK    " : "FAIL  ") + msg);

for (const k of ["DATABASE_URL", "SESSION_SECRET", "GAME_API_KEY", "OWNER_EMAIL", "OWNER_PASSWORD"]) ok(!!env[k], `.env has ${k}`);
if (!env.DATABASE_URL) process.exit(1);

let u;
try {
  u = new URL(env.DATABASE_URL);
} catch {
  ok(false, "DATABASE_URL is not a valid URL. Check for spaces, and URL-encode special characters in the password (@ becomes %40).");
  process.exit(1);
}
console.log(`      host: ${u.hostname}   port: ${u.port || "5432"}   user: ${u.username.slice(0, 6)}...`);
if (u.hostname.startsWith("db.") && u.hostname.endsWith(".supabase.co"))
  console.log("WARN  This is Supabase's direct host, which only works over IPv6. Many home and phone networks need the pooler address (pooler.supabase.com) instead.");

const pool = new pg.Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 10000 });
try {
  await pool.query("select 1");
  ok(true, "connected to the database");
} catch (e) {
  ok(false, "cannot connect: " + e.message);
  process.exit(1);
}

const wanted = ["Admin", "Category", "Player", "Complaint", "Response", "Note", "Evidence", "ResponseTemplate", "LinkCode", "AuditLog"];
const found = (await pool.query("select table_name from information_schema.tables where table_schema = 'public'")).rows.map(r => r.table_name).filter(t => wanted.includes(t));
ok(found.length === wanted.length, `Prestige Life tables: ${found.length} of ${wanted.length} found`);

if (found.includes("Admin")) {
  const r = await pool.query('select kind, level, "passwordHash" from "Admin" where lower(email) = lower($1)', [env.OWNER_EMAIL ?? ""]);
  ok(r.rows.length === 1, "an account exists for OWNER_EMAIL");
  if (r.rows[0]) {
    ok(r.rows[0].kind === "OWNER", `account kind is ${r.rows[0].kind}`);
    ok(await bcrypt.compare(env.OWNER_PASSWORD ?? "", r.rows[0].passwordHash), "OWNER_PASSWORD in .env matches the saved password");
  } else {
    console.log("      accounts in Admin table:", (await pool.query('select count(*)::int as n from "Admin"')).rows[0].n, "(run: npx prisma db seed)");
  }
}
await pool.end();
