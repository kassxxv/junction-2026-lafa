/**
 * Card types shared by the UI and the server (no secrets, no server-only imports).
 */

/**
 * staff     – given by Espoo / the invite (e.g. company name): confirmed
 * source    – taken from the company's text with an exact quote: auto-confirmed
 * ai        – inferred, no direct evidence: needs a human decision
 * missing   – nothing found
 * confirmed – a person accepted or edited it
 * ask       – parked for the company to answer (staff view)
 */
export type FieldStatus = "staff" | "source" | "ai" | "missing" | "confirmed" | "ask";

export type GoalId = "fill" | "explore" | "brand";

export interface DraftField {
  id: string;
  label: string;
  required: boolean;
  kind: "text" | "list";
  value: string | string[];
  status: FieldStatus;
  /** Evidence: which source, and the exact sentence. */
  sourceId?: string;
  quote?: string;
  /** What the AI wants to know when the value is missing or unsure. */
  question?: string;
  options?: string[];
  suggested?: string;
}

export interface DraftSection {
  id: string;
  title: string;
  /** Shown only when this goal is selected. Missing = always shown. */
  goal?: GoalId;
  fields: DraftField[];
}

export interface DraftSource {
  id: string;
  label: string;
  /** link = read from a URL, typed = entered by the user, added = pasted later (removable). */
  kind: "link" | "typed" | "added";
  url?: string;
  text: string;
}

/** A follow-up question for the company. Each answer fills one field (or the goals). */
export type CardQuestion =
  | { id: string; kind: "goals"; title: string; why: string; suggested: GoalId[] }
  | {
      id: string;
      kind: "choice";
      fieldId: string;
      title: string;
      why: string;
      options: string[];
      suggested?: string;
      multiple: boolean;
    }
  | { id: string; kind: "confirm-text"; fieldId: string; title: string; why: string; draft: string };

/** What the draft step returns to the UI. */
export interface CardDraft {
  goals: GoalId[];
  sections: DraftSection[];
  sources: DraftSource[];
  questions: CardQuestion[];
}

export const GOALS: { id: GoalId; label: string; hint: string }[] = [
  { id: "fill", label: "Fill a position", hint: "They have an open role and want to fill it" },
  { id: "explore", label: "Explore talent", hint: "Open conversations, may get interested in someone" },
  { id: "brand", label: "Employer branding", hint: "Presentation or pitch to show who they are" },
];

/** Counts as done for publishing. */
export const DONE: FieldStatus[] = ["staff", "source", "confirmed"];
/** Needs a person's attention now. */
export const NEEDS_ATTENTION: FieldStatus[] = ["ai", "missing"];

/** The card template: the same parts for every company. */
export const POSITION_FIELDS = [
  { key: "title", label: "Job title", kind: "text", required: true },
  { key: "why_open", label: "Why the role is open", kind: "text", required: true },
  { key: "main_tasks", label: "Main tasks", kind: "text", required: true },
  { key: "must_have", label: "Must-have skills", kind: "list", required: true },
  { key: "can_learn", label: "Can be learned on the job", kind: "list", required: false },
  { key: "language", label: "Language needed", kind: "text", required: true },
  { key: "experience", label: "Experience level", kind: "text", required: true },
  { key: "candidate_question", label: "Question for candidates", kind: "text", required: true },
] as const;

export const EXPLORE_FIELDS = [
  { key: "areas", label: "Areas of interest", kind: "list", required: true },
  { key: "good_to_have", label: "Good to have", kind: "list", required: false },
] as const;

export const BRAND_FIELDS = [{ key: "pitch", label: "What you will present", kind: "text", required: true }] as const;
