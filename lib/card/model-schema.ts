import { z } from "zod";

/**
 * The JSON shape Gemini must return for a card draft. Kept flat and explicit so a small
 * model fills it reliably. No nulls: empty string / empty list mean "nothing".
 */

const Status = z
  .enum(["found", "guessed", "missing"])
  .describe("found = stated in the input (give the quote); guessed = inferred; missing = not in the input");

const Quote = z
  .string()
  .describe("For status found: one sentence copied EXACTLY, character for character, from the input. Otherwise empty.");

const TextField = z.object({ value: z.string(), status: Status, quote: Quote });
const ListField = z.object({ value: z.array(z.string()), status: Status, quote: Quote });

export const ModelPosition = z.object({
  title: TextField,
  why_open: TextField.describe("Why the role is open (growth, replacement, new project…)"),
  main_tasks: TextField.describe("What the person will mainly do in the job (tasks, not schedule)"),
  must_have: ListField.describe("Skills the company says are required. Short skill names."),
  can_learn: ListField.describe("Skills the company says are a plus or can be taught"),
  language: TextField.describe("Language(s) actually needed for the job"),
  experience: TextField.describe("Expected experience level, e.g. '2–4 years'"),
  candidate_question: TextField.describe(
    "ONE question candidates answer, about concrete past behaviour related to the main tasks. " +
      "Status guessed when you wrote it yourself.",
  ),
});

export const ModelQuestion = z.object({
  target: z
    .string()
    .describe(
      "Which field the answer fills: 'goals', 'company.summary', 'company.event_goal', 'positions[0].experience', " +
        "'explore.areas', 'explore.good_to_have' or 'brand.pitch'",
    ),
  question: z.string().describe("Short, friendly, specific to this company's input"),
  why: z.string().describe("One short sentence: what in their input made you ask"),
  options: z.array(z.string()).describe("2–4 short answers the company can tap. Empty if only free text makes sense."),
  suggested: z.string().describe("Your best guess, exactly one of the options, or empty"),
  multiple: z.boolean().describe("true if several options can be picked"),
});

export const ModelDraft = z.object({
  company: z.object({
    summary: TextField.describe("What the company does, one sentence"),
    event_goal: TextField.describe(
      "What the company concretely hopes to get from this event, e.g. 'Hire 2 backend developers and meet junior data people'",
    ),
  }),
  goals: z.object({
    value: z.array(z.enum(["fill", "explore", "brand"])),
    status: Status,
    quote: Quote,
  }),
  positions: z.array(ModelPosition).describe("One entry per open role mentioned. Empty if no role."),
  explore: z.object({ areas: ListField, good_to_have: ListField }),
  brand: z.object({ pitch: TextField }),
  questions: z.array(ModelQuestion).describe("0–5 questions, most important first"),
});

export type ModelDraft = z.infer<typeof ModelDraft>;
