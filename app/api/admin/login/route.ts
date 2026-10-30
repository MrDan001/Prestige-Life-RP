// PATH: app/api/admin/login/route.ts
import { NextResponse } from "next/server";

/** Password authentication is retired. Staff access is granted only by a valid one-use invitation. */
export async function POST() {
  return NextResponse.json(
    { error: "Password sign-in is disabled. Use your private staff invitation link." },
    { status: 410 },
  );
}
