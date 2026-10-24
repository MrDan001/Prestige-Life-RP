// PATH: lib/evidence.ts
import { z } from "zod";

export const MAX_EVIDENCE = 20;

const httpsUrl = z.string().url().max(500).refine((u) => u.startsWith("https://"), "Evidence links must be https");

/** One piece of evidence sent by the game: a link (image, video, other) or pasted chat-log text. */
export const evidenceItem = z
  .object({
    kind: z.enum(["IMAGE", "VIDEO", "LINK", "TEXT"]),
    url: httpsUrl.optional(),
    text: z.string().max(20000).optional(),
    caption: z.string().max(200).optional(),
  })
  .refine((e) => (e.kind === "TEXT" ? !!e.text : !!e.url), "TEXT needs text; other kinds need a url");