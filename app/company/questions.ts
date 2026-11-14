/**
 * STUB — the follow-up questions the AI would ask after reading the company's input.
 * Only things it could not find. Each answer fills a field of the card.
 */

import type { GoalId } from "../cards/new/stub-draft";

export type Question =
  | {
      id: string;
      kind: "goals";
      title: string;
      why: string;
      options: { id: GoalId; label: string; hint: string }[];
      suggested: GoalId[];
    }
  | {
      id: string;
      kind: "choice";
      /** Card field this answer fills. */
      fieldId: string;
      title: string;
      why: string;
      options: string[];
      suggested?: string;
      multiple?: boolean;
    }
  | {
      id: string;
      kind: "confirm-text";
      fieldId: string;
      title: string;
      why: string;
      draft: string;
    };

export const STUB_QUESTIONS: Question[] = [
  {
    id: "goals",
    kind: "goals",
    title: "What do you hope to get from the event?",
    why: "Your text mentions a backend developer and maybe junior data people.",
    options: [
      { id: "fill", label: "Hire for an open role", hint: "You have a position to fill" },
      { id: "explore", label: "Meet people for later", hint: "No fixed role, open conversations" },
      { id: "brand", label: "Present our company", hint: "A pitch, to be known as an employer" },
    ],
    suggested: ["fill", "explore"],
  },
  {
    id: "experience",
    kind: "choice",
    fieldId: "experience",
    title: "How much experience do you expect from the backend developer?",
    why: "Your job ad says “solid experience”, which candidates read very differently.",
    options: ["Under 2 years", "2–4 years", "5 years or more"],
    suggested: "2–4 years",
  },
  {
    id: "candidate-question",
    kind: "confirm-text",
    fieldId: "candidate-question",
    title: "Candidates answer one question from you. Does this one work?",
    why: "We based it on what your ad says you value.",
    draft: "Tell us about a time you explained a technical problem to someone non-technical. What did you do?",
  },
  {
    id: "explore-plus",
    kind: "choice",
    fieldId: "explore-plus",
    title: "What would make a junior data person interesting to you?",
    why: "So the right people come and talk to you. Pick any that fit.",
    options: ["Excel", "SQL", "A data course", "Curiosity about logistics"],
    multiple: true,
  },
];
