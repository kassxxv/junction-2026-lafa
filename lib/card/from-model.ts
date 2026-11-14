/**
 * Turns the model's JSON into the card the UI shows, and enforces our rules
 * instead of trusting the model:
 * - a "found" value whose quote is not in the input verbatim becomes a guess;
 * - questions are limited, de-duplicated and only point at fields that exist.
 */

import type { ModelDraft } from "./model-schema";
import {
  BRAND_FIELDS,
  EXPLORE_FIELDS,
  POSITION_FIELDS,
  type CardDraft,
  type CardQuestion,
  type DraftField,
  type DraftSection,
  type DraftSource,
  type FieldStatus,
  type GoalId,
} from "./types";

const MAX_QUESTIONS = 5;

type ModelText = { value: string; status: "found" | "guessed" | "missing"; quote: string };
type ModelList = { value: string[]; status: "found" | "guessed" | "missing"; quote: string };

/** Whitespace-insensitive check that the quote really appears in the source. */
function locateQuote(quote: string, source: string): string | undefined {
  const q = quote.trim();
  if (!q) return undefined;
  if (source.includes(q)) return q;
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  return norm(source).includes(norm(q)) ? q : undefined;
}

function field(
  id: string,
  def: { label: string; kind: "text" | "list"; required: boolean },
  m: ModelText | ModelList,
  source: DraftSource,
): DraftField {
  const empty = Array.isArray(m.value) ? m.value.filter(Boolean).length === 0 : m.value.trim() === "";
  const value = Array.isArray(m.value) ? m.value.map((v) => v.trim()).filter(Boolean) : m.value.trim();
  let status: FieldStatus = empty ? "missing" : m.status === "found" ? "source" : m.status === "guessed" ? "ai" : "missing";
  let quote: string | undefined;
  if (status === "source") {
    quote = locateQuote(m.quote, source.text);
    if (!quote) status = "ai"; // claimed evidence not found in the input → treat as a guess
  }
  return {
    id,
    label: def.label,
    kind: def.kind,
    required: def.required,
    value: status === "missing" ? (def.kind === "list" ? [] : "") : value,
    status,
    ...(quote ? { sourceId: source.id, quote } : {}),
  };
}

/** Maps a model question target like "positions[0].experience" to our field id. */
function targetToFieldId(target: string): string | "goals" | undefined {
  const t = target.trim();
  if (t === "goals") return "goals";
  if (t === "company.summary") return "summary";
  if (t === "company.event_goal") return "event-goal";
  const pos = /^positions\[(\d+)\]\.(\w+)$/.exec(t);
  if (pos) return `position-${Number(pos[1]) + 1}-${pos[2]}`;
  const sec = /^(explore|brand)\.(\w+)$/.exec(t);
  if (sec) return `${sec[1]}-${sec[2]}`;
  return undefined;
}

export function toCardDraft(model: ModelDraft, input: { companyName: string; text: string }): CardDraft {
  const source: DraftSource = { id: "input", label: "Your text", kind: "typed", text: input.text };

  const sections: DraftSection[] = [
    {
      id: "company",
      title: "Company",
      fields: [
        { id: "name", label: "Company name", required: true, kind: "text", value: input.companyName, status: "staff" },
        field("summary", { label: "What the company does", kind: "text", required: true }, model.company.summary, source),
        field(
          "event-goal",
          { label: "What you hope to get from the event", kind: "text", required: true },
          model.company.event_goal,
          source,
        ),
      ],
    },
    ...model.positions.map((p, i): DraftSection => {
      const id = `position-${i + 1}`;
      return {
        id,
        title: p.title.value.trim() || "Open role",
        goal: "fill",
        fields: POSITION_FIELDS.map((def) => field(`${id}-${def.key}`, def, p[def.key], source)),
      };
    }),
    {
      id: "explore",
      title: "Meeting people for later",
      goal: "explore",
      fields: EXPLORE_FIELDS.map((def) => field(`explore-${def.key}`, def, model.explore[def.key], source)),
    },
    {
      id: "brand",
      title: "Presenting your company",
      goal: "brand",
      fields: BRAND_FIELDS.map((def) => field(`brand-${def.key}`, def, model.brand[def.key], source)),
    },
  ];

  const goals = [...new Set(model.goals.value)] as GoalId[];
  // Only fields of sections that are shown for the chosen goals can be asked about.
  const askable = sections.filter((s) => !s.goal || goals.includes(s.goal));
  const fieldsById = new Map(askable.flatMap((s) => s.fields).map((f) => [f.id, f]));

  const questions: CardQuestion[] = [];
  const seen = new Set<string>();
  for (const [i, q] of model.questions.entries()) {
    const target = targetToFieldId(q.target);
    if (!target || seen.has(target)) continue;
    seen.add(target);
    const id = `q${i}-${target}`;
    if (target === "goals") {
      questions.push({ id, kind: "goals", title: q.question, why: q.why, suggested: goals });
      continue;
    }
    const f = fieldsById.get(target);
    if (!f || f.status === "source" || f.status === "staff") continue; // never ask about what we already know
    if (target.endsWith("candidate_question") && typeof f.value === "string" && f.value) {
      questions.push({ id, kind: "confirm-text", fieldId: f.id, title: q.question, why: q.why, draft: f.value });
      continue;
    }
    const options = q.options.map((o) => o.trim()).filter(Boolean).slice(0, 4);
    questions.push({
      id,
      kind: "choice",
      fieldId: f.id,
      title: q.question,
      why: q.why,
      options,
      suggested: options.includes(q.suggested) ? q.suggested : undefined,
      multiple: q.multiple || f.kind === "list",
    });
  }

  const final = questions.slice(0, MAX_QUESTIONS);

  // The candidate question is what candidates will answer, so the company must always see it.
  for (const f of fieldsById.values()) {
    if (!f.id.endsWith("-candidate_question") || f.status !== "ai" || typeof f.value !== "string" || !f.value) continue;
    if (final.some((q) => q.kind !== "goals" && q.fieldId === f.id)) continue;
    const q: CardQuestion = {
      id: `auto-${f.id}`,
      kind: "confirm-text",
      fieldId: f.id,
      title: "Candidates answer one question from you. Does this one work?",
      why: "We drafted it from what you told us about the role.",
      draft: f.value,
    };
    if (final.length < MAX_QUESTIONS) final.push(q);
    else final[final.length - 1] = q;
  }

  return { goals, sections, sources: [source], questions: final };
}
