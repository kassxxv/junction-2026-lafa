/**
 * Company requirements → plain-language explanations for event organisers, who select for many companies and
 * are not experts in every field. Gemini only: the company's own card, never candidate data.
 * It explains words; it never says who is a good candidate.
 */

export const GLOSSARY_SYSTEM = `You help event organisers at the City of Espoo who select people for 1:1 meetings with companies.
They are not experts in every technical field. For each requirement of one company's role, explain:
- "plain": what the requirement means, in one short sentence a non-specialist understands (max 25 words);
- "inCv": what it usually looks like in a CV: typical job titles, tasks, tools or degree names, as a short comma-separated list (max 20 words).
Rules:
- Explain the words only. Never say what makes a good or bad candidate, never rank, never suggest rejecting anyone.
- Do not invent facts about the company.
- Plain English, no jargon in "plain" unless you explain it.
Return one item per requirement, with the same "key" you were given.`;

export function glossaryPrompt(card: { companyName: string; field: string; roleTitle: string; requirements: { key: string; text: string }[] }): string {
  return `Company: ${card.companyName}
Field: ${card.field || "(not set)"}
Role: ${card.roleTitle || "(not given)"}
Requirements:
${card.requirements.map((r) => `- key=${r.key}: ${r.text}`).join("\n")}`;
}
