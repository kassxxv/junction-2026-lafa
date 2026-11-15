import { z } from "zod";

/**
 * Company card (bridgy). Shared by the UI and the server: no secrets, no server-only imports.
 * The model returns `ModelCard`; code verifies quotes and maps it to `CompanyCardDraft`.
 */

const Status = z.enum(["found", "guessed", "missing"]).describe("found = stated in the input (give the quote); guessed = inferred; missing = not in the input");
const Quote = z.string().describe("For status found: one sentence copied EXACTLY from the input. Otherwise empty.");
const Text = z.object({ value: z.string(), status: Status, quote: Quote });

export const ModelRequirement = z.object({
  type: z.enum(["experience", "has_done", "education", "language"]),
  label: z
    .string()
    .describe("experience: the area ('Optical component testing'); has_done: a concrete task ('Test automation with Python'); education: minimum degree ('BSc', 'MSc', 'PhD', 'Vocational'); language: the language ('English')"),
  min_years: z.number().describe("experience only: minimum years, 0 if not stated"),
  level: z.string().describe("language only: CEFR level A1–C2, empty otherwise"),
  detail: z.string().describe("education only: fields of study, e.g. 'Photonics, Physics or Electrical Engineering'"),
  must_have: z.boolean().describe("true only if the input says it is required / must; otherwise false"),
  keywords: z.array(z.string()).describe("2–4 short lowercase phrases that would show this in a CV, e.g. 'optical testing'"),
  status: Status,
  quote: Quote,
});

export const ModelCard = z.object({
  summary: Text.describe("What the company does, one sentence"),
  event_goal: Text.describe("What they concretely want from this event"),
  field: z.string().describe("One of the event fields given in the prompt, or empty"),
  goals: z.object({ value: z.array(z.enum(["fill", "explore", "brand"])), status: Status }),
  roles: z
    .array(
      z.object({
        title: Text,
        details: z.string().describe("e.g. 'Full-time, Espoo', empty if unknown"),
        requirements: z.array(ModelRequirement).describe("The requirements the company states, most important first. Up to 6."),
        conversation_starter: z
          .string()
          .describe("ONE short question for candidates about something they actually did, linked to the role. Used as the first topic of the meeting, never for selection."),
      }),
    )
    .describe("One entry per open role. Empty if no role."),
  questions: z
    .array(
      z.object({
        target: z
          .string()
          .describe("'goals' | 'event_goal' | 'role_title' | 'req:<index>:must_have' | 'req:<index>:min_years' | 'req:<index>:level' (index into roles[0].requirements)"),
        question: z.string().describe("Short and specific to their input, e.g. 'The job ad mentions a PhD. Is it required?'"),
        options: z.array(z.string()).describe("2–4 short answers to tap. For must_have use exactly ['Yes, required', 'No, nice to have']."),
        suggested: z.string().describe("Exactly one of the options, or empty"),
      }),
    )
    .describe("0–3 questions, only where the answer changes the card. Most important first."),
});
export type ModelCard = z.infer<typeof ModelCard>;

/* ---------------- What the UI edits and the server saves ---------------- */

export type GoalId = "fill" | "explore" | "brand";
export type ReqType = "experience" | "has_done" | "education" | "language";
export type Origin = "text" | "ai"; // text = found in their input (quote verified); ai = suggested

export interface CardRequirement {
  key: string;
  type: ReqType;
  label: string;
  minYears: number | null;
  level: string | null;
  detail: string | null;
  mustHave: boolean;
  keywords: string[];
  origin: Origin;
  quote?: string;
}

export interface CardRole {
  key: string;
  title: string;
  details: string;
  starter: string;
  requirements: CardRequirement[];
}

export interface CardQuestion {
  id: string;
  target: string;
  question: string;
  options: string[];
  suggested?: string;
}

export interface CompanyCardDraft {
  summary: string;
  eventGoal: string;
  field: string;
  goals: GoalId[];
  roles: CardRole[];
  questions: CardQuestion[];
  /** What we read: the company's text plus any page we fetched. Kept as sent. */
  sourceText: string;
  readUrl: string | null;
  readUrlOk: boolean;
  /** Optional task for candidates, discussed at the start of the meeting. Empty = no task. */
  task: string;
}

/** Gemini's suggestions for that task (company data only). */
export const TaskSuggestions = z.object({
  tasks: z
    .array(z.object({ title: z.string().describe("3-8 words"), prompt: z.string().describe("The task as the candidate reads it, 2-5 sentences") }))
    .describe("Exactly three different tasks"),
});
export type TaskSuggestions = z.infer<typeof TaskSuggestions>;

export interface PoolStats {
  field: string | null;
  inField: number;
  matchAll: number;
  perMustHave: { text: string; count: number }[];
  /** Barrier check: for every requirement, how many people with a CV in the field meet it (aggregate only, never a person). */
  perRequirement?: { key: string; count: number }[];
  /** People in the field whose CV can be checked: the base of the counts above. */
  withCv?: number;
}

export const GOAL_LABEL: Record<GoalId, string> = {
  fill: "Hire for a role",
  explore: "Browse the pool",
  brand: "Just network",
};

export const REQ_TYPE_LABEL: Record<ReqType, string> = {
  experience: "Experience",
  has_done: "Has done",
  education: "Education",
  language: "Language",
};

export const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
