import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { createSession, COOKIE } from "@/lib/auth";
import { relyingParty } from "@/lib/webauthn";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { email?: string; challengeId?: string; response?: any } | null;
  if (!body?.email || !body.challengeId || !body.response?.id) return NextResponse.json({ error: "Invalid sign-in response." }, { status: 400 });
  const admin = await db.admin.findUnique({ where: { email: body.email.toLowerCase().trim() } });
  if (!admin || admin.suspended) return NextResponse.json({ error: "Passkey sign-in could not be verified." }, { status: 401 });
  const challenge = await db.adminPasskeyChallenge.findFirst({ where: { id: body.challengeId, adminId: admin.id, purpose: "AUTHENTICATE", expiresAt: { gt: new Date() } } });
  const passkey = await db.adminPasskey.findFirst({ where: { adminId: admin.id, credentialId: body.response.id } });
  if (!challenge || !passkey) return NextResponse.json({ error: "Passkey sign-in could not be verified. Please try again." }, { status: 401 });
  const { rpID, origin } = relyingParty(req);
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports as any,
      },
      requireUserVerification: true,
    });
  } catch {
    return NextResponse.json({ error: "Passkey verification failed. Try again or contact the owner." }, { status: 401 });
  }
  if (!verification.verified) return NextResponse.json({ error: "Passkey verification failed." }, { status: 401 });
  try {
    const claimed = await db.adminPasskeyChallenge.deleteMany({ where: { id: challenge.id, adminId: admin.id, purpose: "AUTHENTICATE", expiresAt: { gt: new Date() } } });
    if (claimed.count !== 1) return NextResponse.json({ error: "This sign-in request has already been used. Try again." }, { status: 409 });
    await db.adminPasskey.update({ where: { id: passkey.id }, data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() } });
    const jwt = await createSession(admin.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE, jwt, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return NextResponse.json({ error: "Could not complete sign-in. Please try again." }, { status: 500 });
  }
}
