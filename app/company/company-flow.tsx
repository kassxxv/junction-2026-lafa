"use client";

/**
 * Company-facing flow, on stub data: describe → we read it → a few questions → your card.
 * Built for a busy company contact: one thing per screen, answers you can tap.
 */

import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STUB_SECTIONS, type DraftField, type DraftSection, type GoalId } from "../cards/new/stub-draft";
import { CardDocument } from "./card-document";
import { STUB_QUESTIONS, type Question } from "./questions";

type Step = "describe" | "reading" | "ask" | "card" | "sent";

const EXAMPLE = `https://norrvik-logistics.example/careers/backend-developer

We need a backend developer. Maybe also open to junior data people.`;

const READING = ["Reading your job ad", "Finding what is still missing"];

/** Company view starts from the same draft; nothing is parked for “ask company” here. */
const initialSections = (): DraftSection[] =>
  STUB_SECTIONS.map((s) => ({
    ...s,
    fields: s.fields.map((f) => (f.status === "ask" ? { ...f, status: "missing" as const } : f)),
  }));

export function CompanyFlow() {
  const [step, setStep] = useState<Step>("describe");
  const [text, setText] = useState("");
  const [reading, setReading] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [goals, setGoals] = useState<GoalId[]>([]);
  const [sections, setSections] = useState<DraftSection[]>(initialSections);

  const visible = useMemo(() => sections.filter((s) => !s.goal || goals.includes(s.goal)), [sections, goals]);

  function updateField(id: string, patch: Partial<DraftField>) {
    setSections((prev) =>
      prev.map((s) => ({ ...s, fields: s.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
    );
  }

  function startReading() {
    setStep("reading");
    READING.forEach((_, i) => setTimeout(() => setReading(i), i * 900));
    setTimeout(() => setStep("ask"), READING.length * 900 + 300);
  }

  function next() {
    if (qIndex + 1 < STUB_QUESTIONS.length) setQIndex(qIndex + 1);
    else setStep("card");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-16">
      {step === "describe" && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Who would you like to meet?</h1>
          <p className="mt-3 max-w-[56ch] text-lg text-muted-foreground">
            Paste a link to a job ad or your website, any text you already have, or just a few words. We fill in your
            card and only ask about what is missing.
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="For example: a link to your job ad, or “a backend developer who can talk to customers”"
            className="mt-8 min-h-44 bg-card p-4 text-base"
            autoFocus
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setText(EXAMPLE)}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Use the sample text
            </button>
            <Button size="lg" disabled={!text.trim()} onClick={startReading}>
              Continue
            </Button>
          </div>
          <p className="mt-10 text-sm text-muted-foreground">Takes about three minutes. You can change everything later.</p>
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

      {step === "ask" && (
        <QuestionScreen
          key={STUB_QUESTIONS[qIndex].id}
          question={STUB_QUESTIONS[qIndex]}
          index={qIndex}
          total={STUB_QUESTIONS.length}
          foundCount={sections.flatMap((s) => s.fields).filter((f) => f.status === "source").length}
          onBack={qIndex > 0 ? () => setQIndex(qIndex - 1) : undefined}
          onAnswer={(q, answer) => {
            if (q.kind === "goals") setGoals(answer as GoalId[]);
            else if (answer === null) updateField(q.fieldId, { status: "missing" });
            else updateField(q.fieldId, { value: answer, status: "confirmed" });
            next();
          }}
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
            <Button variant="ghost" onClick={() => setStep("ask")}>
              <ArrowLeft data-icon="inline-start" />
              Back to questions
            </Button>
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
  index,
  total,
  foundCount,
  onBack,
  onAnswer,
}: {
  question: Question;
  index: number;
  total: number;
  foundCount: number;
  onBack?: () => void;
  /** null = skipped */
  onAnswer: (q: Question, answer: string | string[] | GoalId[] | null) => void;
}) {
  const [picked, setPicked] = useState<string[]>(
    q.kind === "goals" ? q.suggested : q.kind === "choice" && q.suggested ? [q.suggested] : [],
  );
  const [own, setOwn] = useState("");
  const [writing, setWriting] = useState(false);
  const multi = q.kind === "goals" || (q.kind === "choice" && q.multiple);

  function toggle(v: string) {
    setPicked((p) => (multi ? (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]) : [v]));
  }

  function submit() {
    if (q.kind === "goals") return onAnswer(q, picked);
    if (q.kind === "confirm-text") return onAnswer(q, writing ? own.trim() : q.draft);
    const values = own.trim() ? [...picked, own.trim()] : picked;
    onAnswer(q, q.multiple ? values : (values[values.length - 1] ?? null));
  }

  const canContinue =
    q.kind === "confirm-text" ? !writing || own.trim().length > 0 : picked.length > 0 || own.trim().length > 0;

  return (
    <section>
      <div className="mb-8 flex items-center justify-between text-sm text-muted-foreground">
        {onBack ? (
          <button onClick={onBack} className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-4" /> Back
          </button>
        ) : (
          <span>We filled in {foundCount} things from your text.</span>
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
        ) : (
          <div className={q.kind === "goals" ? "grid gap-3 sm:grid-cols-3" : "flex flex-wrap gap-2"}>
            {(q.kind === "goals" ? q.options : q.options.map((o) => ({ id: o, label: o, hint: "" }))).map((o) => {
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
                    {on && <Check className="size-4 text-primary" />}
                    {o.label}
                  </span>
                  {o.hint && <span className="mt-1 block text-sm text-muted-foreground">{o.hint}</span>}
                  {suggested && !on && <span className="mt-1 block text-xs text-status-ai">Likely, from your text</span>}
                </button>
              );
            })}
          </div>
        )}

        {q.kind === "choice" && (
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
