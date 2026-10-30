// PATH: app/api/admin/logout/route.ts
import { NextResponse } from "next/server";
import { COOKIE, revokeCurrentSession } from "@/lib/auth";

export async function POST() {
  await revokeCurrentSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
