// PATH: lib/templates.ts
// Pure helpers (no server imports) so the Templates page can use them too.
export const PLACEHOLDERS = ["complainant", "accused", "favoured", "verdict", "category", "admin", "complaint_id", "date"] as const;
export type Verdict = "COMPLAINANT" | "ACCUSED" | "INSUFFICIENT";

export const VERDICT_LABEL: Record<Verdict, string> = {
  COMPLAINANT: "In favour of the complainant",
  ACCUSED: "In favour of the accused",
  INSUFFICIENT: "Insufficient evidence",
};

export const unknownPlaceholders = (body: string) =>
  [...new Set([...body.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]))].filter(
    (k) => !(PLACEHOLDERS as readonly string[]).includes(k)
  );

/** Templates using these need a verdict before they can be filled in. */
export const usesVerdict = (body: string) => /\{(favoured|verdict)\}/.test(body);

export const verdictVars = (verdict: Verdict, complainant: string, accused: string) => ({
  favoured: verdict === "COMPLAINANT" ? complainant : verdict === "ACCUSED" ? accused : "neither party",
  verdict:
    verdict === "COMPLAINANT" ? "in favour of the complainant" : verdict === "ACCUSED" ? "in favour of the accused" : "inconclusive due to insufficient evidence",
});

export const render = (body: string, vars: Record<string, string>) => body.replace(/\{([a-z_]+)\}/g, (m, k) => vars[k] ?? m);