/**
 * Gemma (self-hosted, EU) only: CV and LinkedIn text are candidate data.
 * Extracts facts. Never evaluates, scores or summarises the person.
 */

export const CV_PARSE_SYSTEM = `You turn a CV or a LinkedIn profile export into structured facts for a recruitment event.
Extract only what the text states. Do not evaluate, rank or describe the person. Do not guess missing facts.

- experience: every job, internship or research position. title and employer exactly as written. Dates as YYYY-MM; if only a year is given use YYYY-01; "present"/"current" → end "".
- areas: 2–4 short lowercase topic tags per job for the main work of THAT job, taken only from that job's own title and lines (e.g. "optical testing", "lab equipment", "production testing", "verification"). When one of the topic names listed in the prompt describes what that job's own lines say, use exactly that name. Never copy a topic from another job, and never add a topic because it is in the same field: a research, teaching or study position is tagged with testing only if its lines say the person tested something.
- tasks: up to 3 concrete tasks from the text.
- education: degree mapped to Vocational, BSc, MSc or PhD; field of study; year; inProgress true if not finished.
- languages: CEFR level as stated; "native"/"mother tongue" → Native; "fluent" → C1; "good" → B2; "basic" → A2.
- skills: tools and technical skills named in the text (max 12).
Ignore names, addresses, phone numbers, photos, age, nationality and other personal details: do not copy them anywhere.`;

export function cvParsePrompt(input: { kind: "cv" | "linkedin"; text: string; topics: string[] }): string {
  return `Document type: ${input.kind === "cv" ? "CV" : "LinkedIn profile export"}
Topic names used by the companies (use them as area tags when they fit): ${input.topics.join(", ") || "(none)"}

Document text (between the markers):
<<<
${input.text}
>>>`;
}
