// PATH: app/api/admin/complaints/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const complaint = await db.complaint.findUnique({
    where: { id },
    include: { player: true, responses: { include: { admin: { select: { name: true } } }, orderBy: { createdAt: "asc" } } },
  });
  return complaint ? NextResponse.json(complaint) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

const patch = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]).optional(),
  reply: z.string().min(1).max(2000).optional(),
});

/** Admin replies and/or changes status. A reply is queued so the game can pick it up. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.status && !parsed.data.reply))
    return NextResponse.json({ error: "Send a status and/or reply" }, { status: 400 });

  const exists = await db.complaint.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [complaint] = await db.$transaction([
    db.complaint.update({ where: { id }, data: { status: parsed.data.status } }),
    ...(parsed.data.reply
      ? [db.response.create({ data: { complaintId: id, adminId: session!.sub, message: parsed.data.reply } })]
      : []),
  ]);
  return NextResponse.json(complaint);
}
