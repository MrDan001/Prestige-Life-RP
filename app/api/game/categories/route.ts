// PATH: app/api/game/categories/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isGameServer, unauthorized } from "@/lib/auth";

/** The game builds its complaint form from this live list. */
export async function GET(req: Request) {
  if (!isGameServer(req)) return unauthorized();
  const cats = await db.category.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { name: true } });
  return NextResponse.json(cats.map((c) => c.name));
}