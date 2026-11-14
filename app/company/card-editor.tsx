"use client";

import { AlertCircle, ArrowLeft, Check, Info, Plus, Quote, Sparkles, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { confirmCompanyCard, previewPool, resetCompanyDemo } from "@/lib/matchready/card-actions";
import { EVENT, formatDateRange, formatDay } from "@/lib/matchready/event";
import { requirementText } from "@/lib/matchready/facts";
import { MAX_COMPANIES_PER_CANDIDATE } from "@/lib/matchready/config";
import {
  CEFR,
  GOAL_LABEL,
  REQ_TYPE_LABEL,
  type CardRequirement,
  type CardRole,
  type CompanyCardDraft,
  type GoalId,
  type PoolStats,
  type ReqType,
} from "@/lib/matchready/card-schema";
import type { CompanyProps } from "./company-flow";

const fmtDate = (iso: string) => formatDay(iso);

let keySeq = 0;
const newKey = () => `new-${++keySeq}`;

function blankRequirement(type: ReqType): CardRequirement {
  return {
    key: newKey(),
    type,
    label: type === "language" ? "English" : type === "education" ? "BSc" : "",
    minYears: type === "experience" ? 1 : null,
    level: type === "language" ? "B2" : null,
    detail: null,
    mustHave: false,
    keywords: [],
    origin: "text",
  };
}

export function CardEditor({
  company,
  initial,
  sample,
  companyDeadline,
  demo,
  onBack,
}: {
  company: CompanyProps;
  initial: CompanyCardDraft;
  sample: boolean;
  companyDeadline: string;
  demo: boolean;
  onBack?: () => void;
}) {
  const [card, setCard] = useState<CompanyCardDraft>(() => ({
    ...initial,
    roles: initial.roles.length ? initial.roles : [{ key: "role-1", title: "", details: "", starter: "", requirements: [] }],
  }));
  const [confirmed, setConfirmed] = useState(false);
  const [pool, setPool] = useState<PoolStats | null>(null);
  const [livePool, setLivePool] = useState<PoolStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const role = card.roles[0];
  const musts = role.requirements.filter((r) => r.mustHave).length;
  const hiring = card.goals.includes("fill");

  // Live "price tag": how many people in the pool meet the current must-haves (aggregate only).
  const reqKey = useMemo(() => JSON.stringify([card.field, role.requirements]), [card.field, role.requirements]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const valid = role.requirements.filter((r) => r.label.trim());
      previewPool(card.field, valid).then(setLivePool).catch(() => setLivePool(null));
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reqKey captures field + requirements
  }, [reqKey]);

  const update = (patch: Partial<CompanyCardDraft>) => {
    setConfirmed(false);
    setCard((c) => ({ ...c, ...patch }));
  };
  const updateRole = (patch: Partial<CardRole>) => update({ roles: card.roles.map((r, i) => (i === 0 ? { ...r, ...patch } : r)) });
  const updateReq = (key: string, patch: Partial<CardRequirement>) =>
    updateRole({ requirements: role.requirements.map((r) => (r.key === key ? { ...r, ...patch, origin: patch.origin ?? r.origin } : r)) });

  function confirm() {
    setError(null);
    startTransition(async () => {
      const r = await confirmCompanyCard({
        companyId: company.id,
        summary: card.summary,
        eventGoal: card.eventGoal,
        field: card.field,
        goals: card.goals,
        roles: hiring ? card.roles.filter((x) => x.title.trim()).map(({ title, details, starter, requirements }) => ({ title, details, starter, requirements: requirements.filter((q) => q.label.trim()) })) : [],
        sourceText: card.sourceText,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setPool(r.pool);
      setConfirmed(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // After confirming, the company sees the result and what happens next, not the same form with a grey button.
  if (confirmed && pool) {
    return (
      <ConfirmedView
        companyName={company.name}
        card={card}
        pool={pool}
        hiring={hiring}
        companyDeadline={companyDeadline}
        onEdit={() => setConfirmed(false)}
        onStartOver={demo ? () => startTransition(async () => { await resetCompanyDemo(company.id); window.location.reload(); }) : undefined}
        pending={pending}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-12">
      {sample && (
        <p className="mb-6 flex gap-2 rounded-lg bg-status-ai-bg px-4 py-3 text-sm text-status-ai">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Our assistant is not available right now, so this card starts from a sample. Please check and change every part.
        </p>
      )}
      {card.readUrl && !card.readUrlOk && (
        <p className="mb-6 flex gap-2 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          We could not open {card.readUrl.replace(/^https?:\/\//, "")}, so the card is based on your text only.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Company card</h1>
              <p className="text-sm text-muted-foreground">{company.name}</p>
            </div>
            {confirmed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-confirmed-bg px-3 py-1 text-sm font-medium text-status-confirmed">
                <Check className="size-4" /> Confirmed by company
              </span>
            ) : (
              <span className="rounded-full bg-status-ai-bg px-3 py-1 text-sm font-medium text-status-ai">
                Draft from {card.readUrlOk ? "your website" : "your text"} · not confirmed
              </span>
            )}
          </div>

          <div className="space-y-7 px-6 py-6">
            <Row label="Goal">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GOAL_LABEL) as GoalId[]).map((g) => {
                  const on = card.goals.includes(g);
                  return (
                    <button
                      key={g}
                      aria-pressed={on}
                      onClick={() => update({ goals: on ? card.goals.filter((x) => x !== g) : [...card.goals, g] })}
                      className={`rounded-full border px-3.5 py-1.5 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {GOAL_LABEL[g]}
                    </button>
                  );
                })}
              </div>
            </Row>

            <Row label="Field">
              <select
                value={card.field}
                onChange={(e) => update({ field: e.target.value })}
                className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Choose a field</option>
                {company.eventFields.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Row>

            <Row label="What you want from the event">
              <Input value={card.eventGoal} onChange={(e) => update({ eventGoal: e.target.value })} placeholder="For example: hire one test engineer and meet two juniors" className="bg-card" />
            </Row>

            {hiring && (
              <>
                <Row label="Role">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <Input value={role.title} onChange={(e) => updateRole({ title: e.target.value })} placeholder="Job title" className="bg-card font-medium" />
                    <Input value={role.details} onChange={(e) => updateRole({ details: e.target.value })} placeholder="Full-time · Espoo" className="bg-card" />
                  </div>
                </Row>

                <div>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-semibold">Requirements</h2>
                    <span className="text-sm text-muted-foreground">
                      Tick what is a must-have. The 3–5 that really matter work best.
                    </span>
                  </div>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {role.requirements.map((r) => (
                      <RequirementRow key={r.key} r={r} onChange={(p) => updateReq(r.key, p)} onRemove={() => updateRole({ requirements: role.requirements.filter((x) => x.key !== r.key) })} />
                    ))}
                    {!role.requirements.length && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No requirements yet. Add the ones that matter.</li>}
                  </ul>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Add:</span>
                    {(Object.keys(REQ_TYPE_LABEL) as ReqType[]).map((t) => (
                      <Button key={t} size="sm" variant="outline" className="bg-card" onClick={() => updateRole({ requirements: [...role.requirements, blankRequirement(t)] })}>
                        <Plus data-icon="inline-start" />
                        {REQ_TYPE_LABEL[t]}
                      </Button>
                    ))}
                  </div>
                  {musts > 5 && (
                    <p className="mt-3 flex gap-2 text-sm text-status-ai">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" /> {musts} must-haves. Each one makes the group of people you can meet smaller.
                    </p>
                  )}
                </div>

                <Row label="Conversation starter" hint="Candidates answer it in a few sentences. It goes to your meeting as the first topic and is never used for selection.">
                  <Textarea value={role.starter} onChange={(e) => updateRole({ starter: e.target.value })} className="min-h-16 bg-card" />
                </Row>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
            {onBack ? (
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft data-icon="inline-start" />
                Back to questions
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap items-center gap-3">
              {error && <span className="text-sm text-destructive">{error}</span>}
              <Button size="lg" disabled={pending} onClick={confirm} className="bg-status-confirmed hover:bg-status-confirmed/85">
                <Check data-icon="inline-start" />
                {pending ? "Saving…" : company.status === "confirmed" ? "Save changes" : "Confirm card"}
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold">Why confirm early?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Once you confirm, you see how many matching people are already in the talent pool, and candidates can choose
                you after {fmtDate(companyDeadline)}.
              </p>
              {livePool && hiring && (
                <p className="mt-4 flex gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
                  <Users className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Right now <strong className="tabular-nums">{livePool.matchAll}</strong> of {livePool.inField} people
                    in {livePool.field ?? "the pool"} meet your must-haves.
                  </span>
                </p>
              )}
            </div>
          <p className="flex gap-2 px-1 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 size-3.5 shrink-0" />
            Drafted by an AI assistant from what you sent. Marked “suggested” where it guessed. Nothing is shared until you
            confirm.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
      <div className="pt-1.5 text-sm font-medium text-muted-foreground">{label}</div>
      <div>
        {children}
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function RequirementRow({ r, onChange, onRemove }: { r: CardRequirement; onChange: (p: Partial<CardRequirement>) => void; onRemove: () => void }) {
  return (
    <li className="grid gap-3 px-4 py-3 md:grid-cols-[96px_minmax(0,1fr)_auto] md:items-center">
      <select
        value={r.type}
        onChange={(e) => onChange({ type: e.target.value as ReqType, origin: "text" })}
        aria-label="Requirement type"
        className="h-8 w-fit rounded-md bg-muted px-2 text-xs font-medium text-muted-foreground outline-none"
      >
        {(Object.keys(REQ_TYPE_LABEL) as ReqType[]).map((t) => (
          <option key={t} value={t}>
            {REQ_TYPE_LABEL[t]}
          </option>
        ))}
      </select>

      <div className="min-w-0 space-y-1.5">
        <input
          value={r.label}
          onChange={(e) => onChange({ label: e.target.value, origin: "text" })}
          placeholder={r.type === "has_done" ? "A task, e.g. Test automation with Python" : r.type === "experience" ? "Area, e.g. Optical component testing" : ""}
          aria-label="Requirement"
          className="w-full rounded-md bg-transparent px-1 py-0.5 font-medium outline-none focus:bg-muted/50"
        />
        <div className="flex flex-wrap items-center gap-2 px-1">
        {r.type === "experience" && (
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            <input
              type="number"
              min={0}
              max={30}
              value={r.minYears ?? ""}
              placeholder="any"
              onChange={(e) => onChange({ minYears: Number(e.target.value) || null, origin: "text" })}
              className="w-14 rounded-md border border-input bg-card px-1.5 py-0.5 text-center text-foreground placeholder:text-muted-foreground"
            />
            + years
          </label>
        )}
        {r.type === "language" && (
          <select value={r.level ?? "B2"} onChange={(e) => onChange({ level: e.target.value, origin: "text" })} className="rounded-md border border-input bg-card px-1.5 py-0.5 text-sm" aria-label="Level">
            {CEFR.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        )}
        {r.type === "education" && (
          <input
            value={r.detail ?? ""}
            onChange={(e) => onChange({ detail: e.target.value || null, origin: "text" })}
            placeholder="Fields, e.g. Physics or Photonics"
            className="min-w-48 flex-1 rounded-md border border-input bg-card px-2 py-0.5 text-sm"
          />
        )}
        {r.origin === "text" && r.quote ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1 rounded-full bg-status-source-bg px-2 py-0.5 text-xs text-status-source">
                <Quote className="size-3" /> from your text
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-72">“{r.quote}”</TooltipContent>
          </Tooltip>
        ) : r.origin === "ai" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-status-ai-bg px-2 py-0.5 text-xs text-status-ai">
            <Sparkles className="size-3" /> suggested
          </span>
        ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          role="switch"
          aria-checked={r.mustHave}
          onClick={() => onChange({ mustHave: !r.mustHave, origin: "text" })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${r.mustHave ? "border-status-ask/40 bg-status-ask-bg font-medium text-status-ask" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <span className={`size-3.5 rounded-sm border ${r.mustHave ? "border-status-ask bg-status-ask" : "border-input"}`} />
          must-have
        </button>
        <Button size="icon-sm" variant="ghost" aria-label="Remove requirement" onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

function ConfirmedView({
  companyName,
  card,
  pool,
  hiring,
  companyDeadline,
  onEdit,
  onStartOver,
  pending,
}: {
  companyName: string;
  card: CompanyCardDraft;
  pool: PoolStats;
  hiring: boolean;
  companyDeadline: string;
  onEdit: () => void;
  onStartOver?: () => void;
  pending: boolean;
}) {
  const role = card.roles[0];
  const musts = role?.requirements.filter((r) => r.mustHave && r.label.trim()) ?? [];
  const steps = [
    { date: formatDay(companyDeadline), text: `Company deadline. Professionals in your field are invited and choose up to ${MAX_COMPANIES_PER_CANDIDATE} companies.` },
    { date: formatDay(EVENT.applicationDeadline), text: "Applications close. Each applicant shows where they meet your requirements." },
    { date: formatDay(EVENT.decisionDate), text: "The organisers decide who gets a meeting with you. You get the list with meeting times on Tavata." },
    { date: formatDateRange(EVENT.startsOn, EVENT.endsOn), text: `1:1 meetings at ${EVENT.name}. After each one, you answer one question: continue or not.` },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-status-confirmed-bg px-3 py-1 text-sm font-medium text-status-confirmed">
            <Check className="size-4" /> Card confirmed
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            {hiring && role?.title ? `${companyName} is looking for: ${role.title}` : `${companyName} is on the list`}
          </h1>
          <p className="mt-2 max-w-[60ch] text-muted-foreground">
            Nothing else to do now. You can still change the card until {formatDay(companyDeadline)}.
          </p>

          {hiring && musts.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-muted-foreground">Your must-haves</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {musts.map((r) => (
                  <li key={r.key} className="rounded bg-status-ask-bg px-2 py-1 text-sm text-status-ask">
                    {requirementText(r)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="mt-8 font-semibold">What happens next</h2>
          <ol className="mt-3 space-y-3">
            {steps.map((s) => (
              <li key={s.date} className="grid gap-1 sm:grid-cols-[140px_minmax(0,1fr)]">
                <span className="text-sm font-semibold tabular-nums">{s.date}</span>
                <span className="text-sm text-muted-foreground">{s.text}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <Button variant="outline" className="bg-card" onClick={onEdit} disabled={pending}>
              <ArrowLeft data-icon="inline-start" />
              Edit card
            </Button>
            {onStartOver && (
              <button onClick={onStartOver} disabled={pending} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Start over (demo)
              </button>
            )}
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PoolPanel pool={pool} deadline={companyDeadline} />
        </aside>
      </div>
    </div>
  );
}

function PoolPanel({ pool, deadline }: { pool: PoolStats; deadline: string }) {
  const max = Math.max(1, pool.inField);
  return (
    <div className="rounded-xl border border-status-confirmed/30 bg-card p-5">
      <p className="text-sm font-medium text-status-confirmed">Already in the talent pool</p>
      <p className="mt-1 text-5xl font-semibold tabular-nums">{pool.matchAll}</p>
      <p className="font-medium">{pool.matchAll === 1 ? "person meets" : "people meet"} your must-haves</p>
      <p className="text-sm text-muted-foreground">
        of {pool.inField} in {pool.field ?? "the pool"}
      </p>
      {pool.perMustHave.length > 0 && (
        <ul className="mt-4 space-y-3">
          {pool.perMustHave.map((m) => (
            <li key={m.text} className="text-sm">
              <div className="mb-1 flex justify-between gap-3">
                <span className="truncate">{m.text}</span>
                <span className="tabular-nums text-muted-foreground">{m.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-status-confirmed" style={{ width: `${(m.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-muted-foreground">
        Invitations go out after {fmtDate(deadline)}. Names stay hidden until the organisers approve.
      </p>
    </div>
  );
}
