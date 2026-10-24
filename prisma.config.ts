// PATH: prisma.config.ts   (project root, NOT inside the prisma folder)
import fs from "node:fs";
import { defineConfig } from "@prisma/config";

// Prisma 7 no longer reads .env by itself, so load it here (also strips the hidden BOM character).
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: process.env.DATABASE_URL },
});