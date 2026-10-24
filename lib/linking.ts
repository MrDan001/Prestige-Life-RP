// PATH: lib/linking.ts
import { db } from "@/lib/db";

/** Complaints filed before a staff member linked their game account now point at them. */
export const backfillAccused = (adminId: string, gameId: string) =>
  db.complaint.updateMany({ where: { accusedGameId: gameId, accusedAdminId: null }, data: { accusedAdminId: adminId } });