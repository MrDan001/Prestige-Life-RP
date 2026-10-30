-- Staff passkeys and one-use WebAuthn challenges.
CREATE TABLE IF NOT EXISTS public."AdminPasskey" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "publicKey" BYTEA NOT NULL,
  "counter" BIGINT NOT NULL DEFAULT 0,
  "transports" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "deviceType" TEXT NOT NULL,
  "backedUp" BOOLEAN NOT NULL DEFAULT false,
  "name" TEXT NOT NULL DEFAULT 'My passkey',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "AdminPasskey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminPasskey_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdminPasskey_credentialId_key" ON public."AdminPasskey"("credentialId");
CREATE INDEX IF NOT EXISTS "AdminPasskey_adminId_createdAt_idx" ON public."AdminPasskey"("adminId","createdAt");

CREATE TABLE IF NOT EXISTS public."AdminPasskeyChallenge" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "challenge" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminPasskeyChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminPasskeyChallenge_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AdminPasskeyChallenge_adminId_purpose_expiresAt_idx" ON public."AdminPasskeyChallenge"("adminId","purpose","expiresAt");
CREATE INDEX IF NOT EXISTS "AdminPasskeyChallenge_expiresAt_idx" ON public."AdminPasskeyChallenge"("expiresAt");

ALTER TABLE public."AdminPasskey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminPasskeyChallenge" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AdminPasskey", public."AdminPasskeyChallenge" FROM PUBLIC, anon, authenticated;
