"use client";

import { AlertCircle, ArrowLeft, Check, Info, Plus, Quote, Sparkles, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MeetingAnswers } from "@/components/meeting-answers";
import { confirmCompanyCard, previewPool, resetCompanyDemo, suggestCardTasks } from "@/lib/matchready/card-actions";
import { answerAsCompany } from "@/lib/matchready/meeting-actions";
import type { CompanyPortal } from "@/lib/matchready/meetings";

export type EventDates = { name: string; applicationDeadline: string; decisionDate: string; startsOn: string; endsOn: string };
import { formatDateRange, formatDay } from "@/lib/matchready/event";
import { requirementText } from "@/lib/matchready/facts";
import { MAX_COMPANIES_PER_CANDIDATE, TASK_MINUTES } from "@/lib/matchready/config";
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
  backLabel = "Back to questions",
  initialPool = null,
  portal = null,
  event,
}: {
  company: CompanyProps;
  initial: CompanyCardDraft;
  sample: boolean;
  companyDeadline: string;
  demo: boolean;
  onBack?: () => void;
  backLabel?: string;
  /** Set when the card was already confirmed: the company lands on its card page, not the form. */
  initialPool?: PoolStats | null;
  /** Selection status and meetings for the company page. */
  portal?: CompanyPortal | null;
  /** The event as set in Event settings, for the "what happens next" dates. */
  event: EventDates;
}) {
  const [card, setCard] = useState<CompanyCardDraft>(() => ({
    ...initial,
    roles: initial.roles.length ? initial.roles : [{ key: "role-1", title: "", details: "", starter: "", requirements: [] }],
  }));
  const [confirmed, setConfirmed] = useState(Boolean(initialPool));
  const [pool, setPool] = useState<PoolStats | null>(initialPool);
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
        task: hiring ? card.task : "",
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
        portal={portal}
        event={event}
      />
    );
  }

  return (
    <div className="page-wide px-5 py-8 sm:py-12">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </button>
      )}
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
              <h1 className="title-panel">Company card</h1>
              <p className="text-sm text-muted-foreground">{company.name}</p>
            </div>
            {confirmed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-confirmed-bg px-3 py-1 text-sm font-medium text-status-confirmed">
                <Check className="size-4" /> Confirmed by company
              </span>
            ) : (
              <span className="rounded-full bg-status-ai-bg px-3 py-1 text-sm font-medium text-status-ai">
                Draft from {card.readUrlOk ? "your website" : "your text"}, not confirmed yet
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
              <NativeSelect wrapperClassName="max-w-80" value={card.field} onChange={(e) => update({ field: e.target.value })} aria-label="Field">
                <option value="">Choose a field</option>
                {company.eventFields.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </NativeSelect>
            </Row>

            <Row label="What you want from the event">
              <Input value={card.eventGoal} onChange={(e) => update({ eventGoal: e.target.value })} placeholder="For example: hire one test engineer and meet two juniors" className="bg-card" />
            </Row>

            {hiring && (
              <>
                <Row label="Role">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <Input value={role.title} onChange={(e) => updateRole({ title: e.target.value })} placeholder="Job title" className="bg-card font-medium" />
                    <Input value={role.details} onChange={(e) => updateRole({ details: e.target.value })} placeholder="Full-time, Espoo" className="bg-card" />
                  </div>
                </Row>

                <div>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-semibold">Requirements</h2>
                    <span className="text-sm text-muted-foreground">
                      Mark the 3–5 must-haves that really matter.
                    </span>
                  </div>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {role.requirements.map((r) => (
                      <RequirementRow
                        key={r.key}
                        r={r}
                        barrier={barrierFor(livePool, r.key)}
                        englishInText={/\benglish\b/i.test(card.sourceText)}
                        onChange={(p) => updateReq(r.key, p)}
                        onRemove={() => updateRole({ requirements: role.requirements.filter((x) => x.key !== r.key) })}
                      />
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

                <Row label="Conversation starter" hint="Candidates answer in a few sentences. It opens your meeting and is never used for selection.">
                  <Textarea value={role.starter} onChange={(e) => updateRole({ starter: e.target.value })} className="min-h-16 bg-card" />
                </Row>

                <Row
                  label="Task (optional)"
                  hint={`Candidates apply it to their own past work in about ${TASK_MINUTES} minutes and walk you through the answer at the start of the meeting. Nobody scores it automatically.`}
                >
                  <TaskField
                    companyId={company.id}
                    request={{ summary: card.summary, field: card.field, roleTitle: role.title, requirements: role.requirements.filter((r) => r.label.trim()).map((r) => requirementText(r)) }}
                    value={card.task}
                    onChange={(task) => update({ task })}
                  />
                </Row>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
            {onBack ? (
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft data-icon="inline-start" />
                {backLabel}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap items-center gap-3">
              {error && <span className="text-sm text-destructive">{error}</span>}
              {!error && hiring && musts === 0 && (
                <span className="flex max-w-[34ch] items-start gap-1.5 text-sm text-status-ai">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {role.requirements.length ? "No must-have marked: everyone in your field can apply." : "No requirements yet: everyone in your field can apply."}
                </span>
              )}
              <Button size="lg" disabled={pending} onClick={confirm}>
                <Check data-icon="inline-start" />
                {pending ? "Saving…" : company.status === "confirmed" ? "Save changes" : "Confirm card"}
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {hiring ? (
            livePool ? (
              <PoolPanel pool={livePool} deadline={companyDeadline} niceToHave={niceToHave(role.requirements)} live />
            ) : (
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Counting the talent pool…</div>
            )
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold">Talent pool</h2>
              <p className="mt-1 text-sm text-muted-foreground">Candidates can choose you after {fmtDate(companyDeadline)}.</p>
            </div>
          )}
          <p className="flex gap-2 px-1 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 size-3.5 shrink-0" />
            Drafted by AI. “Suggested” means it guessed. Nothing is shared until you confirm.
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

/** Barrier check for one requirement: how many people with a CV in the field it would leave out. Aggregate only. */
interface Barrier {
  excluded: number;
  base: number;
  field: string | null;
}

function barrierFor(pool: PoolStats | null, key: string): Barrier | null {
  const hit = pool?.perRequirement?.find((p) => p.key === key);
  if (!pool || !hit || !pool.withCv) return null;
  return { excluded: pool.withCv - hit.count, base: pool.withCv, field: pool.field };
}

function BarrierNote({ r, barrier, englishInText }: { r: CardRequirement; barrier: Barrier; englishInText: boolean }) {
  const share = barrier.excluded / barrier.base;
  const high = share >= 0.5;
  const language = r.type === "language" && !/english/i.test(r.label) && share >= 0.3;
  if (!barrier.excluded) return <p className="px-1 text-xs text-muted-foreground">Everyone with a CV in {barrier.field ?? "the pool"} meets this.</p>;
  return (
    <div className="px-1 text-xs">
      <p className={`flex items-center gap-1.5 ${r.mustHave && high ? "text-status-ai" : "text-muted-foreground"}`}>
        {r.mustHave && high ? <AlertCircle className="size-3.5 shrink-0" /> : <Users className="size-3.5 shrink-0" />}
        <span>
          {r.mustHave ? "Excludes" : "As a must-have: excludes"} <strong className="tabular-nums">{barrier.excluded}</strong> of {barrier.base}
        </span>
        <span aria-hidden className="ml-1 inline-flex h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
          <span className={`h-full ${r.mustHave && high ? "bg-status-ai" : "bg-foreground/30"}`} style={{ width: `${Math.round(share * 100)}%` }} />
        </span>
      </p>
      {language && r.mustHave && (
        <p className="mt-1 text-status-ai">
          Language is the most common barrier for international professionals. Needed from day one, or can it be learned on the job?
          {englishInText && " Your text mentions English."}
        </p>
      )}
    </div>
  );
}

function RequirementRow({
  r,
  barrier,
  englishInText,
  onChange,
  onRemove,
}: {
  r: CardRequirement;
  barrier: Barrier | null;
  englishInText: boolean;
  onChange: (p: Partial<CardRequirement>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="grid gap-3 px-4 py-3.5 md:grid-cols-[8rem_minmax(0,1fr)_auto] md:items-start">
      <NativeSelect
        wrapperClassName="w-full md:w-32"
        value={r.type}
        onChange={(e) => onChange({ type: e.target.value as ReqType, origin: "text" })}
        aria-label="Requirement type"
        className="bg-muted text-xs font-medium text-muted-foreground md:text-xs"
      >
        {(Object.keys(REQ_TYPE_LABEL) as ReqType[]).map((t) => (
          <option key={t} value={t}>
            {REQ_TYPE_LABEL[t]}
          </option>
        ))}
      </NativeSelect>

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
          <NativeSelect wrapperClassName="w-20" value={r.level ?? "B2"} onChange={(e) => onChange({ level: e.target.value, origin: "text" })} aria-label="Level">
            {CEFR.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </NativeSelect>
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
              <span className="inline-flex cursor-help items-center gap-1 text-xs text-muted-foreground underline decoration-dotted underline-offset-2">
                <Quote className="size-3" /> from your text
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-72">“{r.quote}”</TooltipContent>
          </Tooltip>
        ) : r.origin === "ai" ? (
          <span className="inline-flex items-center gap-1 text-xs text-status-ai">
            <Sparkles className="size-3" /> suggested by AI, check it
          </span>
        ) : null}
        </div>
        {barrier && <BarrierNote r={r} barrier={barrier} englishInText={englishInText} />}
      </div>

      <div className="flex items-center gap-1">
        <button
          role="switch"
          aria-checked={r.mustHave}
          onClick={() => onChange({ mustHave: !r.mustHave, origin: "text" })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${r.mustHave ? "border-primary bg-accent font-medium text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <span className={`flex size-3.5 items-center justify-center rounded-sm border ${r.mustHave ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{r.mustHave && <Check className="size-3" />}</span>
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
  portal,
  event,
}: {
  portal: CompanyPortal | null;
  event: EventDates;
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
    { date: formatDay(event.applicationDeadline), text: "Applications close. Each applicant shows where they meet your requirements." },
    { date: formatDay(event.decisionDate), text: "The organisers decide who gets a meeting with you. You get the list with meeting times on Tavata." },
    { date: formatDateRange(event.startsOn, event.endsOn), text: `1:1 meetings at ${event.name}. After each one, you answer one question: continue or not.` },
  ];

  return (
    <div className="page-wide px-5 py-8 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-status-confirmed-bg px-3 py-1 text-sm font-medium text-status-confirmed">
            <Check className="size-4" /> Card confirmed
          </span>
          <h1 className="title-page mt-4">
            {hiring && role?.title ? `${companyName} is looking for: ${role.title}` : `${companyName} is on the list`}
          </h1>
          <p className="mt-2 max-w-[60ch] text-muted-foreground">
            Nothing else to do now. You can still change the card until {formatDay(companyDeadline)}.
          </p>

          {hiring && musts.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-muted-foreground">Your must-haves</h2>
              <ul className="mt-2 space-y-1.5">
                {musts.map((r) => (
                  <li key={r.key} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {requirementText(r)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hiring && card.task.trim() && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-muted-foreground">Task for candidates</h2>
              <p className="mt-2 border-l-2 border-border pl-3 leading-relaxed whitespace-pre-line">{card.task}</p>
            </div>
          )}

          {portal && (portal.applications > 0 || portal.meetings.length > 0) && (
            <>
              <h2 className="mt-8 font-semibold">Selection</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {portal.applications} {portal.applications === 1 ? "application" : "applications"}. The organisers have filled {portal.approved} of your{" "}
                {portal.places} meeting places.
              </p>

              <h2 className="mt-8 font-semibold">Your meetings</h2>
              <p className="mt-1 mb-3 text-sm text-muted-foreground">
                After each meeting, one question: want to continue? If you both say yes, the organisers connect you.
              </p>
              <MeetingAnswers meetings={portal.meetings} answer={answerAsCompany} empty="Meetings appear here once the organisers approve candidates." />
            </>
          )}

          <h2 className="mt-8 font-semibold">What happens next</h2>
          <ol className="mt-4">
            {steps.map((s, i) => (
              <li key={s.date} className="relative grid grid-cols-[1rem_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0">
                {i < steps.length - 1 && <span aria-hidden className="absolute top-3 bottom-0 left-[7px] w-px bg-border" />}
                <span aria-hidden className={`relative mt-1 size-[15px] rounded-full border-2 ${i === 0 ? "border-primary bg-primary/15" : "border-border bg-card"}`} />
                <div>
                  <div className="text-sm font-semibold tabular-nums">{s.date}</div>
                  <div className="text-sm text-muted-foreground">{s.text}</div>
                </div>
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
          <PoolPanel pool={pool} deadline={companyDeadline} niceToHave={niceToHave(role?.requirements ?? [])} />
        </aside>
      </div>
    </div>
  );
}

/**
 * The talent pool for this card, aggregate only: how many people meet every must-have, and the barrier check
 * for each one (the strictest first). Never a person, never a ranking.
 */
const niceToHave = (reqs: CardRequirement[]) => reqs.filter((r) => !r.mustHave && r.label.trim()).map((r) => requirementText(r));

function PoolPanel({ pool, deadline, niceToHave = [], live = false }: { pool: PoolStats; deadline: string; niceToHave?: string[]; live?: boolean }) {
  const base = Math.max(1, pool.withCv ?? pool.inField);
  const where = pool.field ?? "the pool";
  const rows = [...pool.perMustHave].sort((x, y) => x.count - y.count);
  return (
    <div className={`rounded-xl border bg-card p-5 ${live ? "border-border" : "border-status-confirmed/30"}`}>
      <p className={`text-sm font-medium ${live ? "text-muted-foreground" : "text-status-confirmed"}`}>{live ? `Talent pool in ${where}` : "Already in the talent pool"}</p>
      {rows.length ? (
        <>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-semibold tabular-nums">{pool.matchAll}</span>
            <span className="text-lg text-muted-foreground tabular-nums">of {pool.inField}</span>
          </p>
          <p className="font-medium">{pool.matchAll === 1 ? "person meets" : "people meet"} all your must-haves</p>
          <h3 className="mt-5 text-sm font-semibold">Must-haves</h3>
          <p className="text-xs text-muted-foreground">These decide who can apply. Strictest first.</p>
          <ul className="mt-2 space-y-3">
            {rows.map((m) => {
              const excluded = base - m.count;
              const high = excluded / base >= 0.5;
              return (
                <li key={m.text} className="text-sm">
                  <div className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="font-medium">{m.text}</span>
                  </div>
                  <div className="mt-1 ml-6 flex items-center gap-3 text-xs">
                    <div className="h-1.5 flex-1 rounded-full bg-muted">
                      <div className={`h-full rounded-full ${high ? "bg-status-ai" : "bg-primary/70"}`} style={{ width: `${(m.count / base) * 100}%` }} />
                    </div>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{m.count} meet</span>
                    <span className={`shrink-0 tabular-nums ${high ? "font-medium text-status-ai" : "text-muted-foreground"}`}>{excluded} left out</span>
                  </div>
                </li>
              );
            })}
          </ul>
          {niceToHave.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold">Nice to have</h3>
              <p className="text-xs text-muted-foreground">Shown to candidates. Nobody is left out.</p>
              <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                {niceToHave.map((t) => (
                  <li key={t} className="ml-6">
                    {t}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-4 text-xs text-muted-foreground">Counts of people with a CV in the pool, never names.</p>
        </>
      ) : (
        <>
          <p className="mt-1 text-5xl font-semibold tabular-nums">{pool.inField}</p>
          <p className="font-medium">
            {pool.inField === 1 ? "person" : "people"} in {where}.{" "}
            {live ? "Mark a must-have to see how many meet it." : "You marked no must-haves, so all of them can apply."}
          </p>
        </>
      )}
      <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
        Invitations go out after {fmtDate(deadline)}. Names stay hidden until the organisers approve.
      </p>
    </div>
  );
}

/** The optional task: write your own, or pick one of three ideas drafted from this card. */
function TaskField({
  companyId,
  request,
  value,
  onChange,
}: {
  companyId: string;
  request: { summary: string; field: string; roleTitle: string; requirements: string[] };
  value: string;
  onChange: (task: string) => void;
}) {
  const [ideas, setIdeas] = useState<{ title: string; prompt: string }[]>([]);
  const [sample, setSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function suggest() {
    setError(null);
    startTransition(async () => {
      const r = await suggestCardTasks({ companyId, ...request });
      if (!r.ok) return setError(r.error);
      setIdeas(r.tasks);
      setSample(r.sample);
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Leave empty for no task, or write your own."
        className="min-h-20 bg-card"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="bg-card" disabled={pending} onClick={suggest}>
          <Sparkles data-icon="inline-start" />
          {pending ? "Drafting ideas…" : ideas.length ? "Suggest other tasks" : "Suggest tasks"}
        </Button>
        {value.trim() && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            No task
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {ideas.length > 0 && (
        <ul className="space-y-2">
          {sample && <li className="text-xs text-muted-foreground">Our assistant is not available, so these are general examples.</li>}
          {ideas.map((t) => (
            <li key={t.title}>
              <button
                type="button"
                onClick={() => onChange(t.prompt)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${value === t.prompt ? "border-primary bg-accent/60" : "border-border bg-card hover:border-input"}`}
              >
                <span className="font-medium">{t.title}</span>
                <span className="mt-1 block text-muted-foreground">{t.prompt}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
