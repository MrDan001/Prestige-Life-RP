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

export const NEEDS_VERDICT_MSG = "Pick a verdict for this template, or remove {favoured} and {verdict} from the text.";

/** Builds the canonical player-facing message for an upheld complaint. */
export const buildUpheldJudgmentMessage = (input: {
  complainant: string;
  complaintId: string;
  accused: string;
  ruleCode: string;
  punishment: string;
  duration: string;
  issuedAt?: Date;
}) => {
  const issuedDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(input.issuedAt ?? new Date());

  return [
    `Hello ${input.complainant},`,
    "",
    `Thank you for your report #${input.complaintId} against ${input.accused}.`,
    "",
    "After carefully reviewing the complaint and the evidence provided, your complaint has been UPHELD.",
    "",
    `The following disciplinary action has been issued against ${input.accused}:`,
    "",
    "DISCIPLINARY ACTION",
    `- Violated Rule: ${input.ruleCode.trim().toUpperCase()}`,
    `- Punishment: ${input.punishment}`,
    `- Duration: ${input.duration}`,
    "",
    "This decision has been recorded and the punishment has been issued in accordance with Prestige Life RP rules.",
    "",
    "Thank you for helping us maintain fairness and order within the community.",
    "",
    "Regards,",
    "PR.BOT",
    "Prestige Life Staff",
    issuedDate,
  ].join("\n");
};
