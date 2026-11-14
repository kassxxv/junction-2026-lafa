"use client";

/**
 * Company-facing flow: describe → AI reads it (POST /api/cards/draft) → a few questions → your card.
 * Built for a busy company contact: one thing per screen, answers you can tap.
 */

import { AlertCircle, ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toCardDraft } from "@/lib/card/from-model";
import { STUB_MODEL_DRAFT } from "@/lib/card/stub-model";
import type { CardDraft, CardQuestion, DraftField, DraftSection, GoalId } from "@/lib/card/types";
import { CardDocument } from "./card-document";

type Step = "describe" | "reading" | "ask" | "card" | "sent";

/** Prototype: the invite is hardcoded. */
export const INVITED_COMPANY = "Norrvik Logistics Oy";

const EXAMPLE = `Backend Developer (Espoo, hybrid)

Norrvik Logistics Oy plans and tracks deliveries for 40 retail chains in Finland and Sweden. Our order volume has doubled in two years, so we are growing the platform team.

In your first months you will maintain and extend the order tracking API and help move our batch jobs to an event-based setup.

What we expect:
- Solid experience with Python and SQL.
- Experience with REST APIs in production.
- Docker is a plus, but we can teach it.

Our working language is English. Finnish is not required.

Maybe we are also open to meeting junior data people.`;

const READING = ["Reading what you sent", "Filling in your card", "Finding what is still missing"];

const GOAL_OPTIONS: { id: GoalId; label: string; hint: string }[] = [
  { id: "fill", label: "Hire for an open role", hint: "You have a position to fill" },
  { id: "explore", label: "Meet people for later", hint: "No fixed role, open conversations" },
  { id: "brand", label: "Present our company", hint: "A pitch, to be known as an employer" },
];

/** Sample draft for `?step=` demo jumps and when the AI is unavailable. */
const sampleDraft = () => toCardDraft(STUB_MODEL_DRAFT, { companyName: INVITED_COMPANY, text: "" });

export function CompanyFlow() {
  // `?step=ask` or `?step=card` jumps straight to a screen with sample data (demos, screenshots).
  const jump = useSearchParams().get("step");
  const initial = jump === "ask" || jump === "card" ? sampleDraft() : null;

  const [step, setStep] = useState<Step>(jump === "ask" || jump === "card" ? jump : "describe");
  const [text, setText] = useState("");
  const [reading, setReading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState<"demo" | "unavailable" | null>(initial ? "demo" : null);
  const [qIndex, setQIndex] = useState(0);
  const [questions, setQuestions] = useState<CardQuestion[]>(initial?.questions ?? []);
  const [goals, setGoals] = useState<GoalId[]>(initial?.goals ?? []);
  const [sections, setSections] = useState<DraftSection[]>(initial?.sections ?? []);

  const visible = useMemo(() => sections.filter((s) => !s.goal || goals.includes(s.goal)), [sections, goals]);
  const allFields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);
  const foundCount = allFields.filter((f) => f.status === "source").length;

  function updateField(id: string, patch: Partial<DraftField>) {
    setSections((prev) =>
      prev.map((s) => ({ ...s, fields: s.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
    );
  }

  async function analyse() {
    setError(null);
    setStep("reading");
    setReading(0);
    const timers = READING.slice(1).map((_, i) => setTimeout(() => setReading(i + 1), (i + 1) * 1200));
    try {
      const res = await fetch("/api/cards/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyName: INVITED_COMPANY, text }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { source: "live" | "stub"; draft: CardDraft };
      setSample(body.source === "stub" ? "unavailable" : null);
      setSections(body.draft.sections);
      setGoals(body.draft.goals);
      setQuestions(body.draft.questions);
      setQIndex(0);
      setStep(body.draft.questions.length ? "ask" : "card");
    } catch {
      setError("We could not read your text just now. Check your connection and try again.");
      setStep("describe");
    } finally {
      timers.forEach(clearTimeout);
    }
  }

  function answer(q: CardQuestion, value: string | string[] | null) {
    if (q.kind === "goals") setGoals((value as GoalId[]) ?? []);
    else if (value === null || (Array.isArray(value) && value.length === 0)) updateField(q.fieldId, { status: "missing" });
    else {
      const f = allFields.find((x) => x.id === q.fieldId);
      const toList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
      const v =
        f?.kind === "list"
          ? (Array.isArray(value) ? value : [value]).flatMap(toList)
          : Array.isArray(value)
            ? value.join(", ")
            : value;
      updateField(q.fieldId, { value: v, status: "confirmed" });
    }
    if (qIndex + 1 < questions.length) setQIndex(qIndex + 1);
    else setStep("card");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-16">
      {sample && step !== "describe" && step !== "sent" && (
        <p className="mb-8 flex gap-2 rounded-lg bg-status-ai-bg px-4 py-3 text-sm text-status-ai">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {sample === "unavailable"
            ? "Our assistant is not available right now, so this is a sample. Please check and change every part."
            : "Demo link: this screen shows sample data."}
        </p>
      )}

      {step === "describe" && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Who would you like to meet?</h1>
          <p className="mt-3 max-w-[56ch] text-lg text-muted-foreground">
            Paste a job ad, any text you already have, or just a few words. We fill in your card and only ask about what
            is missing.
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="For example: your job ad, or “a backend developer who can talk to customers”"
            className="mt-8 min-h-44 bg-card p-4 text-base"
            autoFocus
          />
          {error && (
            <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setText(EXAMPLE)}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Use the sample text
            </button>
            <Button size="lg" disabled={!text.trim()} onClick={analyse}>
              Continue
            </Button>
          </div>
          <p className="mt-10 text-sm text-muted-foreground">
            Takes about three minutes. You can change everything later. Links are not read yet in this prototype; paste
            the text instead.
          </p>
        </section>
      )}

      {step === "reading" && (
        <section aria-live="polite" className="py-16">
          <ol className="space-y-3">
            {READING.map((r, i) => (
              <li key={r} className={`flex items-center gap-3 text-lg ${i <= reading ? "" : "text-muted-foreground/50"}`}>
                {i < reading ? (
                  <Check className="size-5 text-status-confirmed" />
                ) : i === reading ? (
                  <Loader2 className="size-5 animate-spin text-primary" />
                ) : (
                  <span className="size-5" />
                )}
                {r}
              </li>
            ))}
          </ol>
        </section>
      )}

      {step === "ask" && questions[qIndex] && (
        <QuestionScreen
          key={questions[qIndex].id}
          question={questions[qIndex]}
          field={(() => {
            const q = questions[qIndex];
            return q.kind === "goals" ? undefined : allFields.find((f) => f.id === q.fieldId);
          })()}
          index={qIndex}
          total={questions.length}
          foundCount={foundCount}
          onBack={qIndex > 0 ? () => setQIndex(qIndex - 1) : undefined}
          onAnswer={answer}
        />
      )}

      {step === "card" && (
        <section>
          <p className="mb-8 flex items-center gap-2 text-muted-foreground">
            <Sparkles className="size-4 text-status-ai" />
            Here is your card. Click anything to change it.
          </p>
          <CardDocument sections={visible} goals={goals} onUpdate={updateField} />
          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            {questions.length > 0 ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setQIndex(0);
                  setStep("ask");
                }}
              >
                <ArrowLeft data-icon="inline-start" />
                Back to questions
              </Button>
            ) : (
              <span />
            )}
            <Button size="lg" onClick={() => setStep("sent")}>
              Send my card
            </Button>
          </div>
        </section>
      )}

      {step === "sent" && (
        <section className="py-16">
          <Check className="size-10 rounded-full bg-status-confirmed-bg p-2 text-status-confirmed" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Your card is sent</h1>
          <p className="mt-3 max-w-[52ch] text-lg text-muted-foreground">
            The event team at the City of Espoo will contact you if anything is unclear. You can come back to this link and
            change your card until 1 December.
          </p>
          <Button variant="outline" className="mt-8 bg-card" onClick={() => setStep("card")}>
            View my card
          </Button>
        </section>
      )}
    </div>
  );
}

function QuestionScreen({
  question: q,
  field,
  index,
  total,
  foundCount,
  onBack,
  onAnswer,
}: {
  question: CardQuestion;
  field?: DraftField;
  index: number;
  total: number;
  foundCount: number;
  onBack?: () => void;
  /** null = skipped */
  onAnswer: (q: CardQuestion, answer: string | string[] | null) => void;
}) {
  // Start from what is already known: the AI's suggestion or a guessed value.
  const [picked, setPicked] = useState<string[]>(() => {
    if (q.kind === "goals") return q.suggested;
    if (q.kind === "choice" && q.suggested) return [q.suggested];
    return [];
  });
  const [own, setOwn] = useState("");
  const [writing, setWriting] = useState(false);
  const multi = q.kind === "goals" || (q.kind === "choice" && q.multiple);
  const options =
    q.kind === "goals"
      ? GOAL_OPTIONS
      : q.kind === "choice"
        ? q.options.map((o) => ({ id: o, label: o, hint: "" }))
        : [];

  function toggle(v: string) {
    setPicked((p) => (multi ? (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]) : [v]));
  }

  function submit() {
    if (q.kind === "goals") return onAnswer(q, picked);
    if (q.kind === "confirm-text") return onAnswer(q, writing ? own.trim() : q.draft);
    const values = own.trim() ? [...(multi ? picked : []), own.trim()] : picked;
    onAnswer(q, multi ? values : (values[values.length - 1] ?? null));
  }

  const canContinue =
    q.kind === "confirm-text" ? !writing || own.trim().length > 0 : picked.length > 0 || own.trim().length > 0;
  const freeTextOnly = q.kind === "choice" && q.options.length === 0;

  return (
    <section>
      <div className="mb-8 flex items-center justify-between text-sm text-muted-foreground">
        {onBack ? (
          <button onClick={onBack} className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-4" /> Back
          </button>
        ) : (
          <span>{foundCount > 0 ? `We filled in ${foundCount} things from your text.` : "A few quick questions."}</span>
        )}
        <span className="tabular-nums">
          Question {index + 1} of {total}
        </span>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{q.title}</h1>
      <p className="mt-2 text-muted-foreground">{q.why}</p>

      <div className="mt-8">
        {q.kind === "confirm-text" ? (
          writing ? (
            <Textarea
              autoFocus
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              placeholder="Write your own question"
              className="min-h-28 bg-card p-4 text-base"
            />
          ) : (
            <blockquote className="rounded-xl border border-border bg-card p-5 font-serif text-lg leading-relaxed">
              {q.draft}
            </blockquote>
          )
        ) : freeTextOnly ? (
          <Textarea
            autoFocus
            value={own}
            onChange={(e) => setOwn(e.target.value)}
            placeholder={field?.kind === "list" ? "Separate several with commas" : "Your answer"}
            className="min-h-24 bg-card p-4 text-base"
          />
        ) : (
          <div className={q.kind === "goals" ? "grid gap-3 sm:grid-cols-3" : "flex flex-wrap gap-2"}>
            {options.map((o) => {
              const on = picked.includes(o.id);
              const suggested =
                q.kind === "goals" ? q.suggested.includes(o.id as GoalId) : q.kind === "choice" && q.suggested === o.id;
              return (
                <button
                  key={o.id}
                  aria-pressed={on}
                  onClick={() => toggle(o.id)}
                  className={`rounded-xl border text-left transition-colors ${
                    q.kind === "goals" ? "p-4" : "px-4 py-2.5"
                  } ${on ? "border-primary bg-accent" : "border-border bg-card hover:border-input"}`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {on && <Check className="size-4 shrink-0 text-primary" />}
                    {o.label}
                  </span>
                  {o.hint && <span className="mt-1 block text-sm text-muted-foreground">{o.hint}</span>}
                  {suggested && !on && <span className="mt-1 block text-xs text-status-ai">Likely, from your text</span>}
                </button>
              );
            })}
          </div>
        )}

        {q.kind === "choice" && !freeTextOnly && (
          <input
            value={own}
            onChange={(e) => setOwn(e.target.value)}
            placeholder="Or write your own answer"
            className="mt-4 w-full border-b border-border bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        {q.kind === "goals" ? (
          <span />
        ) : q.kind === "confirm-text" ? (
          <Button variant="ghost" onClick={() => setWriting((w) => !w)}>
            {writing ? "Use the suggested question" : "Write my own question"}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => onAnswer(q, null)}>
            I don’t know yet, skip
          </Button>
        )}
        <Button size="lg" disabled={!canContinue} onClick={submit}>
          {q.kind === "confirm-text" && !writing ? "Use this question" : "Continue"}
        </Button>
      </div>
    </section>
  );
}
