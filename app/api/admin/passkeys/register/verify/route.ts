import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { relyingParty } from "@/lib/webauthn";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null) as { challengeId?: string; response?: any; name?: string } | null;
  if (!body?.challengeId || !body.response) return NextResponse.json({ error: "Invalid passkey response" }, { status: 400 });
  const challenge = await db.adminPasskeyChallenge.findFirst({ where: { id: body.challengeId, adminId: auth.admin.id, purpose: "REGISTER", expiresAt: { gt: new Date() } } });
  if (!challenge) return NextResponse.json({ error: "Passkey setup expired. Please try again." }, { status: 410 });
  const { rpID, origin } = relyingParty(req);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch {
    return NextResponse.json({ error: "Your device could not verify this passkey. Please try again." }, { status: 400 });
  }
  if (!verification.verified || !verification.registrationInfo) return NextResponse.json({ error: "Passkey verification failed." }, { status: 400 });
  const info = verification.registrationInfo;
  const credential = info.credential;
  try {
    await db.$transaction(async tx => {
      const claimed = await tx.adminPasskeyChallenge.deleteMany({ where: { id: challenge.id, adminId: auth.admin.id, purpose: "REGISTER", expiresAt: { gt: new Date() } } });
      if (claimed.count !== 1) throw new Error("CHALLENGE_USED");
      await tx.adminPasskey.create({ data: {
        adminId: auth.admin.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: credential.transports ?? [],
        deviceType: info.credentialDeviceType,
        backedUp: info.credentialBackedUp,
        name: typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : "My passkey",
      } });
    });
  } catch {
    return NextResponse.json({ error: "This passkey is already registered or the setup request was already used." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
