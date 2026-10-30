import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

export function relyingParty(req: Request) {
  const requestUrl = new URL(req.url);
  const origin = process.env.WEBAUTHN_ORIGIN || requestUrl.origin;
  const rpID = process.env.WEBAUTHN_RP_ID || requestUrl.hostname;
  return { rpName: "Prestige Life RP", rpID, origin };
}

export function credentialTransports(values: string[]) {
  return values as AuthenticatorTransportFuture[];
}
