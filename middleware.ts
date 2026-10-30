// PATH: middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  let ok = false;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET!));
      ok = true;
    } catch {}
  }
  if (ok) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    if (req.nextUrl.pathname === "/api/admin/login" || req.nextUrl.pathname === "/api/admin/invitations/accept" || req.nextUrl.pathname === "/api/admin/passkeys/auth/options" || req.nextUrl.pathname === "/api/admin/passkeys/auth/verify") return NextResponse.next();
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/auth", req.url));
}

// Game routes (/api/game) use the x-game-key header instead, so they are not listed here.
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
