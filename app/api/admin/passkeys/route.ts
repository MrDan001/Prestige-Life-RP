import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const items = await db.adminPasskey.findMany({ where: { adminId: auth.admin.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, deviceType: true, backedUp: true, createdAt: true, lastUsedAt: true } });
  return NextResponse.json(items);
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Passkey not found." }, { status: 400 });
  const count = await db.adminPasskey.count({ where: { adminId: auth.admin.id } });
  if (count <= 1) return NextResponse.json({ error: "Keep at least one passkey on your account. Add another device before removing this one." }, { status: 409 });
  const removed = await db.adminPasskey.deleteMany({ where: { id: body.id, adminId: auth.admin.id } });
  return removed.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Passkey not found." }, { status: 404 });
}
