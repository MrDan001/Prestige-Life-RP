import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { relyingParty } from "@/lib/webauthn";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { email?: unknown } | null;
  if (typeof body?.email !== "string" || body.email.length > 254) return NextResponse.json({ error: "Enter your registered staff email." }, { status: 400 });
  const email = body.email.toLowerCase().trim();
  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin || admin.suspended) return NextResponse.json({ error: "No active passkey account was found for those details." }, { status: 404 });
  const passkeys = await db.adminPasskey.findMany({ where: { adminId: admin.id }, select: { credentialId: true, transports: true } });
  if (!passkeys.length) return NextResponse.json({ error: "This account has no passkey yet. Ask the owner to issue an invitation so you can set one up." }, { status: 404 });
  const { rpID } = relyingParty(req);
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: passkeys.map(item => ({ id: item.credentialId, transports: item.transports as any })),
    userVerification: "required",
  });
  const challengeId = randomBytes(24).toString("base64url");
  await db.adminPasskeyChallenge.create({ data: { id: challengeId, adminId: admin.id, challenge: options.challenge, purpose: "AUTHENTICATE", expiresAt: new Date(Date.now() + 5 * 60 * 1000) } });
  return NextResponse.json({ challengeId, options });
}
