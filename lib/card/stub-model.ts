import type { ModelDraft } from "./model-schema";

/**
 * Fallback when Gemini is unavailable: a synthetic, clearly-sample draft in the model's own
 * shape, so it goes through the same mapping as real output. Quotes will not match the
 * company's real text, so they become guesses — which is honest for sample data.
 */
const t = (value: string, status: "found" | "guessed" | "missing" = "guessed") => ({ value, status, quote: "" });
const l = (value: string[], status: "found" | "guessed" | "missing" = "guessed") => ({ value, status, quote: "" });

export const STUB_MODEL_DRAFT: ModelDraft = {
  company: { summary: t(""), event_goal: t("", "missing") },
  goals: { value: ["fill"], status: "guessed", quote: "" },
  positions: [
    {
      title: t("Backend Developer"),
      why_open: t("", "missing"),
      main_tasks: t("", "missing"),
      must_have: l(["Python", "SQL"]),
      can_learn: l([]),
      language: t("English"),
      experience: t("", "missing"),
      candidate_question: t("Tell us about a technical problem you solved recently. What did you do yourself?"),
    },
  ],
  explore: { areas: l([], "missing"), good_to_have: l([], "missing") },
  brand: { pitch: t("", "missing") },
  questions: [
    {
      target: "goals",
      question: "What do you hope to get from the event?",
      why: "We could not read this from your text.",
      options: [],
      suggested: "",
      multiple: true,
    },
    {
      target: "company.event_goal",
      question: "What would make this event a success for you?",
      why: "For example how many people you hope to hire or meet.",
      options: [],
      suggested: "",
      multiple: false,
    },
    {
      target: "positions[0].experience",
      question: "How much experience do you expect?",
      why: "Candidates read “experience” very differently.",
      options: ["Under 2 years", "2–4 years", "5 years or more"],
      suggested: "2–4 years",
      multiple: false,
    },
    {
      target: "positions[0].main_tasks",
      question: "What will the person mainly do in this job?",
      why: "This helps candidates see if the role fits them.",
      options: [],
      suggested: "",
      multiple: false,
    },
  ],
};
