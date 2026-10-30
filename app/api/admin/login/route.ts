// PATH: app/api/admin/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { COOKIE, createSession } from "@/lib/auth";
import { canAccessSite } from "@/lib/permissions";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const admin = await db.admin.findUnique({ where: { email: parsed.data.email.toLowerCase() } });

  // passwordHash can be null during a future auth migration; never pass null to bcrypt.
  if (!admin || !admin.passwordHash) {
    return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
  }

  const ok = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!ok) return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });

  if (admin.suspended) return NextResponse.json({ error: "This account is suspended" }, { status: 403 });
  if (!canAccessSite(admin))
    return NextResponse.json({ error: "Your rank does not have website access yet" }, { status: 403 });

  const res = NextResponse.json({ id: admin.id, name: admin.name, title: admin.title });
  res.cookies.set(COOKIE, await createSession(admin.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
