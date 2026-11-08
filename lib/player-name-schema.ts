import { z } from "zod";

export const playerNameSchema = z.string()
  .trim()
  .min(5, "Use Firstname_lastname with at least two letters in each part.")
  .max(64)
  .regex(/^[A-Za-z]{2,}_[A-Za-z]{2,}$/, "Use Firstname_lastname: letters only, one underscore, and at least two letters on each side.");
