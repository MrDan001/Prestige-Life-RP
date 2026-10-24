// PATH: app/api/game/link-codes/route.ts
import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { isGameServer, unauthorized } from "@/lib/auth";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const makeCode = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const schema = z.object({ gameId: z.string().min(1).max(64), username: z.string().min(1).max(64) });

/** Game server asks for a link code when a player/staff taps "Link to website" in the app. Valid 10 minutes. */
export async function POST(req: Request) {
  if (!isGameServer(req)) return unauthorized();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "gameId and username required" }, { status: 400 });
  const { gameId, username } = parsed.data;

  await db.linkCode.deleteMany({ where: { OR: [{ gameId, usedAt: null }, { expiresAt: { lt: new Date(Date.now() - 86_400_000) } }] } });

  for (let i = 0; i < 3; i++) {
    const code = makeCode();
    try {
      const row = await db.linkCode.create({ data: { code, gameId, username, expiresAt: new Date(Date.now() + 10 * 60_000) } });
      return NextResponse.json({ code: `${code.slice(0, 4)}-${code.slice(4)}`, expiresAt: row.expiresAt });
    } catch {
      /* code collision, try again */
    }
  }
  return NextResponse.json({ error: "Could not create a code, try again" }, { status: 500 });
}