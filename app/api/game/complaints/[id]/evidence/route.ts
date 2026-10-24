// PATH: app/api/game/complaints/[id]/evidence/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { isGameServer, unauthorized } from "@/lib/auth";
import { evidenceItem, MAX_EVIDENCE } from "@/lib/evidence";

type Ctx = { params: Promise<{ id: string }> };
const MAX_FILE = 4 * 1024 * 1024; // hosting limit on request size

/**
 * Game attaches evidence to a complaint it created.
 * JSON:      { kind: "LINK" | "IMAGE" | "VIDEO" | "TEXT", url (https), text, caption }
 * Multipart: file (image/* or video/*, max 4 MB) + optional caption  -> stored in Vercel Blob
 */
export async function POST(req: Request, { params }: Ctx) {
  if (!isGameServer(req)) return unauthorized();
  const { id } = await params;

  if (!(await db.complaint.findUnique({ where: { id }, select: { id: true } })))
    return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  if ((await db.evidence.count({ where: { complaintId: id } })) >= MAX_EVIDENCE)
    return NextResponse.json({ error: `Maximum ${MAX_EVIDENCE} pieces of evidence per complaint` }, { status: 400 });

  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    if (!process.env.BLOB_READ_WRITE_TOKEN)
      return NextResponse.json({ error: "File uploads are not set up yet. Send an https link instead." }, { status: 501 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file field required" }, { status: 400 });
    if (file.size > MAX_FILE) return NextResponse.json({ error: "File too large (max 4 MB). Send an https link instead." }, { status: 413 });
    const kind = file.type.startsWith("image/") ? "IMAGE" : file.type.startsWith("video/") ? "VIDEO" : null;
    if (!kind) return NextResponse.json({ error: "Only image or video files" }, { status: 400 });

    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const blob = await put(`evidence/${id}/${safe}`, file, { access: "public", addRandomSuffix: true });
    const row = await db.evidence.create({
      data: { complaintId: id, kind, url: blob.url, caption: String(form.get("caption") ?? "").slice(0, 200) || null },
    });
    return NextResponse.json({ id: row.id }, { status: 201 });
  }

  const parsed = evidenceItem.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid evidence", details: parsed.error.flatten() }, { status: 400 });
  const row = await db.evidence.create({ data: { complaintId: id, ...parsed.data } });
  return NextResponse.json({ id: row.id }, { status: 201 });
}