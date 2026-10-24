// PATH: app/api/admin/complaints/[id]/notes/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canAct } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ message: z.string().min(1).max(2000) });

/** Private staff note. Visible to all staff with site access, never sent to the game or player. */
export async function POST(req: Request, { params }: Ctx) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Write a note first" }, { status: 400 });

  const c = await db.complaint.findUnique({
    where: { id },
    include: { category: true, accusedAdmin: { select: { id: true, kind: true, level: true } } },
  });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAct(a.actor, c, "reply")) return NextResponse.json({ error: "You cannot add notes to this complaint" }, { status: 403 });

  const note = await db.note.create({ data: { complaintId: id, adminId: a.actor.id, message: parsed.data.message } });
  return NextResponse.json(note, { status: 201 });
}