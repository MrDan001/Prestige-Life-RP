import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureRuleStorage } from "@/lib/rules";

export async function GET() {
  const access = await requireAdmin();
  if (access.error) return access.error;
  await ensureRuleStorage();
  return NextResponse.json(await db.rule.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { code: true, title: true },
  }));
}
