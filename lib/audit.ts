// PATH: lib/audit.ts
import { db } from "@/lib/db";

export const audit = (actorId: string, action: string, targetId: string | null, detail: string) =>
  db.auditLog.create({ data: { actorId, action, targetId, detail } });