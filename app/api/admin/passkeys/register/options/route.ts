import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { relyingParty } from "@/lib/webauthn";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { rpName, rpID } = relyingParty(req);
  await db.adminPasskeyChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const existing = await db.adminPasskey.findMany({ where: { adminId: auth.admin.id }, select: { credentialId: true, transports: true } });
  const options = await generateRegistrationOptions({
    rpName, rpID,
    userID: new TextEncoder().encode(auth.admin.id),
    userName: auth.admin.email,
    userDisplayName: auth.admin.name,
    attestationType: "none",
    excludeCredentials: existing.map(item => ({ id: item.credentialId, transports: item.transports as any })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  const challengeId = randomBytes(24).toString("base64url");
  await db.adminPasskeyChallenge.create({ data: { id: challengeId, adminId: auth.admin.id, challenge: options.challenge, purpose: "REGISTER", expiresAt: new Date(Date.now() + 5 * 60 * 1000) } });
  return NextResponse.json({ challengeId, options });
}
