"use client";

/**
 * Company flow: paste anything → we read it (Context.dev for links, Gemini drafts) → up to 3
 * click-to-answer questions → the standard card with typed requirements → confirm.
 */

import { AlertCircle, ArrowLeft, Check, Loader2, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { draftCompanyCard } from "@/lib/matchready/card-actions";
import { GOAL_LABEL, type CardQuestion, type CompanyCardDraft, type GoalId, type PoolStats } from "@/lib/matchready/card-schema";
import { demoCompanyText } from "@/lib/matchready/demo";
import type { CompanyPortal } from "@/lib/matchready/meetings";
import { CardEditor } from "./card-editor";

export interface CompanyProps {
  id: string;
  name: string;
  field: string | null;
  eventFields: string[];
  status: "draft" | "confirmed";
}

type Step = "describe" | "reading" | "ask" | "card";

const READING = (url: string | null) => [url ? `Reading ${url.replace(/^https?:\/\//, "")}` : "Reading what you sent", "Finding the role and requirements", "Checking what is unclear"];

/** Applies one answer to the draft. */
function applyAnswer(draft: CompanyCardDraft, q: CardQuestion, answer: string | string[]): CompanyCardDraft {
  const d: CompanyCardDraft = structuredClone(draft);
  const value = Array.isArray(answer) ? answer : [answer];
  const m = /^req:(\d+):(must_have|min_years|level)$/.exec(q.target);
  if (q.target === "goals") {
    const byLabel = Object.entries(GOAL_LABEL) as [GoalId, string][];
    d.goals = byLabel.filter(([, label]) => value.includes(label)).map(([id]) => id);
  } else if (q.target === "event_goal") {
    const a = (value[0] ?? "").trim();
    // A bare number or range ("5-10", "10+") answers "how many people?": turn it into a goal sentence.
    d.eventGoal = /^\d+\s*(?:[-–]\s*\d+|\+)?$/.test(a) ? `Meet ${a.replace(/\s+/g, "")} people at the event` : a || d.eventGoal;
  } else if (q.target === "role_title") {
    if (!d.roles.length) d.roles.push({ key: "role-1", title: "", details: "", starter: "", requirements: [] });
    d.roles[0].title = value[0] ?? "";
  } else if (m && d.roles[0]?.requirements[Number(m[1])]) {
    const req = d.roles[0].requirements[Number(m[1])];
    if (m[2] === "must_have") req.mustHave = /^yes/i.test(value[0] ?? "");
    if (m[2] === "min_years") req.minYears = Number((value[0] ?? "").match(/\d+/)?.[0] ?? req.minYears ?? 0) || null;
    if (m[2] === "level") req.level = (value[0] ?? "").toUpperCase().match(/[ABC][12]/)?.[0] ?? req.level;
    req.origin = "text"; // the company decided it
  }
  return d;
}

export function CompanyFlow({
  company,
  companyDeadline,
  demo,
  saved,
  portal,
}: {
  company: CompanyProps;
  companyDeadline: string;
  demo: boolean;
  /** The confirmed card, if there is one: the company lands on its card page instead of the input step. */
  saved: { draft: CompanyCardDraft; pool: PoolStats } | null;
  portal: CompanyPortal | null;
}) {
  const [useSaved, setUseSaved] = useState(Boolean(saved));
  const [step, setStep] = useState<Step>("describe");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<CompanyCardDraft | null>(null);
  const [sample, setSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [, startTransition] = useTransition();

  const demoText = () => demoCompanyText(window.location.origin);

  function analyse() {
    setError(null);
    setStep("reading");
    setReading(0);
    const url = text.match(/\S+\.\S+\/\S*/)?.[0] ?? null;
    const steps = READING(url);
    const timers = steps.slice(1).map((_, i) => setTimeout(() => setReading(i + 1), (i + 1) * 1400));
    startTransition(async () => {
      const r = await draftCompanyCard(company.id, text);
      timers.forEach(clearTimeout);
      if (!r.ok) {
        setError(r.error);
        setStep("describe");
        return;
      }
      setDraft(r.draft);
      setSample(r.sample);
      setQIndex(0);
      setStep(r.draft.questions.length ? "ask" : "card");
    });
  }

  if (useSaved && saved) {
    return (
      <CardEditor
        company={company}
        initial={saved.draft}
        sample={false}
        companyDeadline={companyDeadline}
        demo={demo}
        initialPool={saved.pool}
        portal={portal}
        onBack={() => setUseSaved(false)}
        backLabel="Draft again from new text"
      />
    );
  }

  if (step === "card" && draft) {
    return (
      <CardEditor
        company={company}
        initial={draft}
        sample={sample}
        companyDeadline={companyDeadline}
        demo={demo}
        onBack={draft.questions.length ? () => { setQIndex(0); setStep("ask"); } : () => setStep("describe")}
        backLabel={draft.questions.length ? "Back to questions" : "Back to your text"}
      />
    );
  }

  return (
    <div className="page-narrow px-5 py-10 sm:py-16">
      {step === "describe" && (
        <section>
          <h1 className="title-page">Who do you want to meet at the event?</h1>
          <p className="mt-3 max-w-[56ch] text-lg text-muted-foreground">
            A job ad, two lines or a link. We draft the card and ask only what is unclear.
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste anything…"
            className="mt-8 min-h-40 bg-card p-4 text-base"
            autoFocus
          />
          {error && (
            <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setText(demoText())} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Fill demo text
            </button>
            <Button size="lg" onClick={analyse}>
              {text.trim() ? "Create card" : "Draft from our website"}
            </Button>
          </div>
          <p className="mt-10 flex gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            An AI assistant drafts the card from what you send. You check and confirm it. It never ranks candidates.
          </p>
        </section>
      )}

      {step === "reading" && (
        <section aria-live="polite" className="py-16">
          <ol className="space-y-3">
            {READING(text.match(/\S+\.\S+\/\S*/)?.[0] ?? null).map((r, i) => (
              <li key={r} className={`flex items-center gap-3 text-lg ${i <= reading ? "" : "text-muted-foreground/50"}`}>
                {i < reading ? <Check className="size-5 text-status-confirmed" /> : i === reading ? <Loader2 className="size-5 animate-spin text-primary" /> : <span className="size-5" />}
                {r}
              </li>
            ))}
          </ol>
        </section>
      )}

      {step === "ask" && draft && draft.questions[qIndex] && (
        <QuestionScreen
          key={draft.questions[qIndex].id}
          q={draft.questions[qIndex]}
          index={qIndex}
          total={draft.questions.length}
          multi={draft.questions[qIndex].target === "goals"}
          onBack={qIndex > 0 ? () => setQIndex(qIndex - 1) : () => setStep("describe")}
          backLabel={qIndex > 0 ? "Previous question" : "Back to your text"}
          onAnswer={(answer) => {
            const q = draft.questions[qIndex];
            const next = answer === null ? draft : applyAnswer(draft, q, answer);
            setDraft(next);
            if (qIndex + 1 < draft.questions.length) setQIndex(qIndex + 1);
            else setStep("card");
          }}
        />
      )}
    </div>
  );
}

function QuestionScreen({
  q,
  index,
  total,
  multi,
  onBack,
  backLabel,
  onAnswer,
}: {
  q: CardQuestion;
  index: number;
  total: number;
  multi: boolean;
  onBack: () => void;
  backLabel: string;
  onAnswer: (answer: string | string[] | null) => void;
}) {
  const [picked, setPicked] = useState<string[]>(q.suggested ? [q.suggested] : []);
  const [own, setOwn] = useState("");
  const freeText = q.options.length === 0;
  const toggle = (o: string) => setPicked((p) => (multi ? (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]) : [o]));
  const answer = freeText ? own.trim() : own.trim() && !multi ? own.trim() : multi && own.trim() ? [...picked, own.trim()] : multi ? picked : picked[0];
  const can = Array.isArray(answer) ? answer.length > 0 : Boolean(answer);

  return (
    <section>
      <div className="mb-8 flex items-center justify-between text-sm text-muted-foreground">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline underline-offset-4">
          <ArrowLeft className="size-4" /> {backLabel}
        </button>
        <span className="tabular-nums">
          {total === 1 ? "One question" : `Question ${index + 1} of ${total}`}
        </span>
      </div>
      <h1 className="title-page">{q.question}</h1>

      <div className="mt-8">
        {freeText ? (
          <Textarea autoFocus value={own} onChange={(e) => setOwn(e.target.value)} placeholder="Your answer" className="min-h-24 bg-card p-4 text-base" />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {q.options.map((o) => {
                const on = picked.includes(o);
                return (
                  <button
                    key={o}
                    aria-pressed={on}
                    onClick={() => toggle(o)}
                    className={`rounded-xl border px-4 py-2.5 text-left font-medium transition-colors ${on ? "border-primary bg-accent" : "border-border bg-card hover:border-input"}`}
                  >
                    <span className="flex items-center gap-2">
                      {on && <Check className="size-4 text-primary" />}
                      {o}
                    </span>
                    {o === q.suggested && !on && <span className="mt-0.5 block text-xs font-normal text-status-ai">Likely, from your text</span>}
                  </button>
                );
              })}
            </div>
            {!/must_have$/.test(q.target) && (
              <input
                value={own}
                onChange={(e) => setOwn(e.target.value)}
                placeholder="Or write your own answer"
                className="mt-4 w-full border-b border-border bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            )}
          </>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => onAnswer(null)}>
          Skip
        </Button>
        <Button size="lg" disabled={!can} onClick={() => onAnswer(answer as string | string[])}>
          Continue
        </Button>
      </div>
    </section>
  );
}
