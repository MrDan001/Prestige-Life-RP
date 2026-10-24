// PATH: app/api/game/staff/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isGameServer, unauthorized } from "@/lib/auth";
import { canAccessSite } from "@/lib/permissions";

/** Game asks whether a game account belongs to staff: GET /api/game/staff?gameId=123 */
export async function GET(req: Request) {
  if (!isGameServer(req)) return unauthorized();
  const gameId = new URL(req.url).searchParams.get("gameId");
  if (!gameId) return NextResponse.json({ error: "gameId required" }, { status: 400 });

  const a = await db.admin.findUnique({ where: { gameId }, select: { id: true, name: true, title: true, kind: true, level: true, extraRights: true } });
  if (!a) return NextResponse.json({ isStaff: false });
  return NextResponse.json({ isStaff: true, name: a.name, title: a.title, kind: a.kind, level: a.level, websiteAccess: canAccessSite(a) });
}