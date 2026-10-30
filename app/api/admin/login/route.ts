// PATH: app/api/admin/login/route.ts
import { NextResponse } from "next/server";
/** Legacy password login is intentionally disabled. */
export async function POST() { return NextResponse.json({ error: "Password sign-in is disabled. Use your private staff invitation link." }, { status: 410 }); }
