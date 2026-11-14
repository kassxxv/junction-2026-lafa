/**
 * Company card → three suggested tasks for candidates. Gemini only: company data, never candidate data.
 * A task is answered in writing in about 20 minutes and is discussed at the start of the meeting.
 * It is not a test with one right answer and is never scored by AI.
 */

export const TASK_SUGGEST_SYSTEM = `You suggest short work tasks that a company can give candidates before a 1:1 meeting at a recruitment event run by the City of Espoo.
Each task:
- takes about 20 minutes and is answered in writing (5-15 sentences, or a short list);
- asks the candidate to apply it to a real project or job from their own past work, so the answer is personal and cannot be copied from someone else;
- is about the actual work of the role in the card, at the level the requirements describe;
- has no single right answer: it shows how the person thinks, what they did and what they would check;
- never asks for personal data, unpaid real work for the company, or anything that needs special software;
- is written in plain English, addressed to the candidate ("you").
The company will discuss the answer with the candidate at the start of the meeting.
Return exactly three tasks that differ from each other (for example: explain a past setup, plan a measurement, find the fault in a described situation).`;

export function taskSuggestPrompt(card: { companyName: string; field: string; summary: string; roleTitle: string; requirements: string[] }): string {
  return `Company: ${card.companyName}
Field: ${card.field || "(not set)"}
What the company does: ${card.summary || "(not given)"}
Role: ${card.roleTitle || "(not given)"}
Requirements:
${card.requirements.length ? card.requirements.map((r) => `- ${r}`).join("\n") : "- (none given)"}`;
}
