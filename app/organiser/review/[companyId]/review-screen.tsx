"use client";

/**
 * Organiser review: clean cases in seconds, every decision human and logged.
 * AI shows facts (evidence + CV ↔ LinkedIn). It never scores or ranks.
 *
 * Layout (list-detail): the applicant list and the open candidate scroll on their own; nothing scrolls inside
 * either. The decision sits at the top of the candidate, next to what there is to check. Company-level panels
 * (bias check, decision log) open from the header instead of sitting under a person.
 */

import { ArrowLeft, BookOpen, Check, Download, EyeOff, Paperclip, RotateCcw, Scale, ScrollText, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckLine, CheckList, MustHaveBadge, requirementState, StatusIcon } from "@/components/fact-labels";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { approveClean, decide, resetReview, startReview, type ActionResult } from "@/lib/matchready/organiser-actions";
import { explainRequirements, loadSourceDocument, type SourceResult } from "@/lib/matchready/review-actions";
import type { GlossaryEntry } from "@/lib/matchready/glossary";
import { MAX_COMPANIES_PER_CANDIDATE } from "@/lib/matchready/config";
import { DEMO_REVIEW_FOCUS_CODE } from "@/lib/matchready/demo";
import type { ApplicationRow, RequirementRow, Review, ReviewStatus } from "@/lib/matchready/organiser";

type Filter = "all" | "meets" | "look";
type Panel = "bias" | "log" | null;
type DocResult = SourceResult & { ok: true; available: true };

/** Status in the list and the candidate header. Only states that need attention get a coloured tag. */
function StatusLabel({ app }: { app: ApplicationRow }) {
  const tag = "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";
  const map: Record<ReviewStatus, React.ReactNode> = {
    clean: (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
        <StatusIcon state="met" className="size-3.5" /> Must-haves met
      </span>
    ),
    check: (
      <span className={`${tag} bg-status-ai-bg text-status-ai`}>
        <StatusIcon state="check" className="size-3.5" /> {app.toCheck} to check
      </span>
    ),
    missing: (
      <span className={`${tag} bg-status-ask-bg text-status-ask`}>
        <StatusIcon state="missing" className="size-3.5" /> Missing must-have
      </span>
    ),
    approved: (
      <span className={`${tag} bg-status-confirmed-bg text-status-confirmed`}>
        <Check className="size-3.5" /> Approved
      </span>
    ),
    declined: <span className={`${tag} bg-muted text-muted-foreground`}>Declined</span>,
  };
  return map[app.status];
}

export function ReviewScreen({ review, demo }: { review: Review; demo: boolean }) {
  const { company, role, applications } = review;
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string>(
    () => applications.find((a) => a.code === DEMO_REVIEW_FOCUS_CODE)?.id ?? applications[0]?.id ?? "",
  );
  const [panel, setPanel] = useState<Panel>(null);
  const [glossary, setGlossary] = useState<{ entries: Record<string, GlossaryEntry>; sample: boolean } | null>(null);
  const [explaining, setExplaining] = useState(false);
  async function explain() {
    if (glossary) return setGlossary(null); // second click hides it again
    setExplaining(true);
    const r = await explainRequirements(company.id);
    setExplaining(false);
    if (r.ok) setGlossary({ entries: r.entries, sample: r.sample });
    else setResult(r);
  }
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const started = useRef(false);

  // Metric 1: the review session starts when the organiser opens the screen.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void startReview(company.id);
  }, [company.id]);

  // The side panel closes with Escape, like any overlay.
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  const filled = applications.filter((a) => a.status === "approved").length;
  const free = company.places - filled;
  const needsLook = (a: ApplicationRow) => a.mustMissing === 0 && a.toCheck > 0 && a.status !== "approved";
  const counts = { all: applications.length, meets: applications.filter((a) => a.mustMissing === 0).length, look: applications.filter(needsLook).length };
  const visible = applications.filter((a) => (filter === "meets" ? a.mustMissing === 0 : filter === "look" ? needsLook(a) : true));
  const clean = applications.filter((a) => a.status === "clean");
  const selectedClean = [...selected].filter((id) => clean.some((a) => a.id === id));
  const open = applications.find((a) => a.id === openId);

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    startTransition(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) after?.();
    });
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="border-b border-border bg-card px-6 pt-3 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <Link href="/organiser" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              <ArrowLeft className="size-4" /> Overview
            </Link>
            <h1 className="title-panel">
              {company.name}
              {role && <span className="font-normal text-muted-foreground">, {role.title}</span>}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-3 text-right leading-tight">
              <div className="text-xs text-muted-foreground">Places filled</div>
              <div className="text-xl font-semibold tabular-nums">
                {filled} <span className="text-muted-foreground">/ {company.places}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="bg-card" aria-pressed={panel === "bias"} onClick={() => setPanel(panel === "bias" ? null : "bias")}>
              <Scale data-icon="inline-start" /> Bias check
              {review.bias.skew === "warning" && <span className="size-2 rounded-full bg-status-ai" aria-label="needs attention" />}
            </Button>
            <Button variant="outline" size="sm" className="bg-card" aria-pressed={panel === "log"} onClick={() => setPanel(panel === "log" ? null : "log")}>
              <ScrollText data-icon="inline-start" /> Decision log
            </Button>
            <Button asChild size="sm" variant={filled ? "default" : "outline"} className={filled ? "" : "bg-card"} disabled={!filled}>
              <a href={filled ? `/api/organiser/export?company=${company.id}` : undefined} aria-disabled={!filled}>
                <Download data-icon="inline-start" /> Export {filled} for Tavata
              </a>
            </Button>
          </div>
        </div>
        {review.companies.length > 1 && (
          <nav aria-label="Companies" className="mt-3 flex gap-1.5 overflow-x-auto">
            {review.companies.map((c) => (
              <Link
                key={c.id}
                href={`/organiser/review/${c.id}`}
                aria-current={c.id === company.id ? "page" : undefined}
                className={`rounded-full border px-3 py-0.5 text-sm whitespace-nowrap ${
                  c.id === company.id ? "border-primary bg-accent font-medium" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.name} <span className="tabular-nums text-muted-foreground">{c.approved}/{c.places}</span>
              </Link>
            ))}
          </nav>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto xl:grid xl:grid-cols-[360px_minmax(0,1fr)] xl:overflow-hidden">
        {/* List */}
        <section aria-label="Applicants" className="flex min-h-0 flex-col border-b border-border bg-card xl:border-r xl:border-b-0">
          <div className="space-y-3 border-b border-border p-3">
            <p
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
              title={`Names, photos and nationality are hidden. Each person can apply to up to ${MAX_COMPANIES_PER_CANDIDATE} companies.`}
            >
              <EyeOff className="size-3.5" /> {applications.length} applied. Blind review, names hidden.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "All", counts.all],
                  ["meets", "Met", counts.meets],
                  ["look", "Needs a look", counts.look],
                ] as const
              ).map(([f, label, n]) => (
                <button
                  key={f}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-2.5 py-0.5 text-sm ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {label} <span className="tabular-nums opacity-80">{n}</span>
                </button>
              ))}
            </div>
          </div>

          <ul className="max-h-[60vh] min-h-0 flex-1 overflow-y-auto xl:max-h-none">
            {visible.map((a) => {
              const canSelect = a.status === "clean";
              return (
                <li key={a.id} className={`flex items-center gap-3 border-b border-border/70 px-3 py-2 ${a.id === openId ? "bg-accent" : "hover:bg-muted/50"}`}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${a.code}`}
                    className="size-4 accent-[var(--primary)] disabled:opacity-30"
                    disabled={!canSelect}
                    checked={selected.has(a.id)}
                    onChange={(e) =>
                      setSelected((s) => {
                        const n = new Set(s);
                        if (e.target.checked) n.add(a.id);
                        else n.delete(a.id);
                        return n;
                      })
                    }
                  />
                  <button onClick={() => setOpenId(a.id)} aria-current={a.id === openId ? "true" : undefined} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">Candidate {a.code}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.keyFact ?? "No matching experience found"}</span>
                    </span>
                    <StatusLabel app={a} />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="space-y-2 border-t border-border p-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 bg-card"
                disabled={!clean.length || free <= 0}
                onClick={() => setSelected(new Set(clean.slice(0, Math.max(0, free)).map((a) => a.id)))}
              >
                Select clean ({Math.min(clean.length, Math.max(0, free))})
              </Button>
              <Button className="flex-1" disabled={!selectedClean.length || pending} onClick={() => run(() => approveClean(company.id, selectedClean), () => setSelected(new Set()))}>
                <Check data-icon="inline-start" /> Approve {selectedClean.length || ""}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {free <= 0 ? "All places are filled." : "Clean = every must-have met by a document, nothing to check."}
            </p>
          </div>
        </section>

        {/* Candidate */}
        <div className="min-h-0 min-w-0 bg-background xl:overflow-y-auto">
          {result && (
            <p
              role="status"
              className={`flex items-center gap-2 border-b border-border px-6 py-2 text-sm ${result.ok ? "bg-status-confirmed-bg text-status-confirmed" : "bg-status-ask-bg text-status-ask"}`}
            >
              {result.ok ? <Check className="size-4" /> : <X className="size-4" />}
              {result.ok ? result.message : result.error}
              <button className="ml-auto opacity-70 hover:opacity-100" aria-label="Dismiss" onClick={() => setResult(null)}>
                <X className="size-4" />
              </button>
            </p>
          )}
          {open ? (
            <Detail
              key={open.id}
              app={open}
              pending={pending}
              placesFull={free <= 0}
              task={company.task}
              onDecide={(action, note) => run(() => decide(company.id, open.id, action, note))}
              glossary={glossary}
              explaining={explaining}
              onExplain={() => void explain()}
            />
          ) : (
            <p className="p-6 text-muted-foreground">Select a candidate on the left.</p>
          )}
        </div>
      </div>

      {panel && (
        <aside
          aria-label={panel === "bias" ? "Bias check" : "Decision log"}
          className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-border bg-card shadow-[-12px_0_32px_-16px_rgb(1_17_53/0.35)]"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-semibold">{panel === "bias" ? "Bias check" : "Decision log"}</h2>
            <Button size="icon-sm" variant="ghost" aria-label="Close" onClick={() => setPanel(null)}>
              <X />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {panel === "bias" ? (
              <BiasPanel bias={review.bias} />
            ) : (
              <>
                <ul className="space-y-2.5 text-sm">
                  {review.decisions.length ? (
                    review.decisions.map((d, i) => (
                      <li key={i} className="leading-snug">
                        <span className="tabular-nums text-muted-foreground">{d.at}</span> {d.organiser.split(" ")[0]}{" "}
                        {d.action === "approve" ? "approved" : d.action === "decline" ? "declined" : "undid"} <span className="font-medium">{d.code}</span>
                        <span className="text-muted-foreground">
                          {d.batch ? " in a batch (must-haves met)" : d.note ? ` with a note: “${d.note}”` : d.rule ? ` (${d.rule})` : ""}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No decisions yet. Every approval and decline lands here with who, when and why.</li>
                  )}
                </ul>
                {demo && (
                  <Button size="sm" variant="ghost" className="mt-4" disabled={pending} onClick={() => run(() => resetReview(company.id), () => setSelected(new Set()))}>
                    <RotateCcw data-icon="inline-start" /> Reset demo
                  </Button>
                )}
              </>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function Detail({
  app,
  pending,
  placesFull,
  onDecide,
  task,
  glossary,
  explaining,
  onExplain,
}: {
  task: string | null;
  app: ApplicationRow;
  pending: boolean;
  placesFull: boolean;
  onDecide: (action: "approve" | "decline" | "undo", note: string) => void;
  glossary: { entries: Record<string, GlossaryEntry>; sample: boolean } | null;
  explaining: boolean;
  onExplain: () => void;
}) {
  const [note, setNote] = useState("");
  const [tab, setTab] = useState("cv");
  const [source, setSource] = useState<SourceResult | null>(null);
  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadSourceDocument(app.id).then((r) => live && setSource(r));
    return () => {
      live = false;
    };
  }, [app.id]);
  const doc: DocResult | null = source?.ok && source.available ? source : null;
  const needsNote = app.status === "check" || app.status === "missing";
  const decided = app.status === "approved" || app.status === "declined";

  // Everything an organiser should look at before deciding, in one place.
  const issues: { state: "check" | "missing"; text: string }[] = [
    ...app.requirements.filter((r) => r.mustHave && r.meets === false).map((r) => ({ state: "missing" as const, text: `Must-have not met: ${r.text}` })),
    ...app.requirements
      .filter((r) => r.mustHave && r.meets === null)
      .map((r) => ({ state: "check" as const, text: `${r.text}: ${r.value ? `“${r.value}”, typed by the candidate, not shown by a document` : "not shown by a document"}` })),
    ...app.checks.filter((c) => c.kind === "differs" || c.kind === "not_found").map((c) => ({ state: "check" as const, text: c.text })),
    ...(doc?.unverified ?? []).map((u) => ({ state: "check" as const, text: `${u}. The AI extracted it, the CV text does not contain it.` })),
  ];
  const meetingAnswers = (app.starter ? 1 : 0) + (app.taskAnswer ? 1 : 0);
  const otherChecks = app.checks.filter((c) => c.kind !== "match").length;

  return (
    <section aria-label={`Candidate ${app.code}`}>
      {/* Decision bar: always in view while reading. */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Candidate {app.code}</h2>
          <StatusLabel app={app} />
        </div>
        {decided ? (
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => onDecide("undo", "")}>
            <Undo2 data-icon="inline-start" /> Undo
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="bg-card" disabled={pending} onClick={() => onDecide("decline", note)}>
              Decline, offer Program Pass
            </Button>
            <Button disabled={pending || placesFull || (needsNote && !note.trim())} onClick={() => onDecide("approve", note)} title={needsNote && !note.trim() ? "Write a short note first" : undefined}>
              <Check data-icon="inline-start" /> {needsNote ? "Approve with note" : "Approve"}
            </Button>
          </div>
        )}
      </div>

      <div className="max-w-5xl space-y-7 px-6 py-5">
        {placesFull && !decided && <p className="text-sm text-muted-foreground">All places are filled. Undo another approval to approve this one.</p>}

        {issues.length > 0 && !decided ? (
          <div className="rounded-xl border border-status-ai/25 bg-status-ai-bg/60 px-5 py-4">
            <h3 className="font-semibold">Check before you decide</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {issues.map((i, n) => (
                <li key={n} className="flex gap-2.5 leading-snug">
                  <StatusIcon state={i.state} className="mt-0.5" />
                  {i.text}
                </li>
              ))}
            </ul>
            {needsNote && (
              <label className="mt-4 block text-sm font-medium">
                Your note (goes into the decision log and to the meeting)
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="For example: Lead vs engineer, likely led the project, not people. Ask in the meeting."
                  className="mt-1.5 min-h-16 bg-card font-normal"
                />
              </label>
            )}
          </div>
        ) : (
          !decided && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <StatusIcon state="met" /> Every must-have is shown by a document and nothing needs a look. Approve here or in the batch on the left.
            </p>
          )
        )}

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <h3 className="font-semibold">Company needs and where the candidate has it</h3>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              Click a row to see its lines in the CV
              <Button size="sm" variant="outline" className="bg-card" disabled={explaining} onClick={onExplain} aria-pressed={Boolean(glossary)}>
                <BookOpen data-icon="inline-start" /> {explaining ? "Explaining…" : glossary ? "Hide explanations" : "Explain the terms"}
              </Button>
            </span>
          </div>
          <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,1.15fr)] gap-x-4 border-b border-border pb-1.5 text-xs text-muted-foreground">
            <span />
            <span>Company asks for</span>
            <span>Candidate has</span>
          </div>
          <ul>
            {app.requirements.map((r) => (
              <RequirementLine
                key={r.id}
                r={r}
                cvShows={r.source === "stated" && doc ? doc.cvValues[r.id] ?? "nothing for this" : null}
                related={doc?.related[r.id]?.length ?? 0}
                explained={glossary?.entries[r.id] ?? null}
                selected={selectedReq === r.id}
                onSelect={() => {
                  setSelectedReq(selectedReq === r.id ? null : r.id);
                  setTab("cv");
                }}
              />
            ))}
          </ul>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="line" className="h-9 border-b border-border w-full justify-start rounded-none">
            <TabsTrigger value="cv" className="flex-none px-3">CV text</TabsTrigger>
            <TabsTrigger value="meeting" className="flex-none px-3">
              Answers for the meeting {meetingAnswers > 0 && <span className="tabular-nums text-muted-foreground">{meetingAnswers}</span>}
            </TabsTrigger>
            <TabsTrigger value="linkedin" className="flex-none px-3">
              CV and LinkedIn {otherChecks > 0 && <span className="tabular-nums text-muted-foreground">{otherChecks}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cv" className="pt-3">
            <SourcePanel
              source={source}
              doc={doc}
              selectedLines={selectedReq && doc ? doc.byRequirement[selectedReq] ?? [] : []}
              relatedLines={selectedReq && doc ? doc.related[selectedReq] ?? [] : []}
              selected={Boolean(selectedReq)}
            />
          </TabsContent>

          <TabsContent value="meeting" className="space-y-6 pt-4">
            <div>
              <h4 className="font-medium">
                Conversation starter
              </h4>
              <p className="text-xs text-muted-foreground">Opens the meeting. Not used for selection.</p>
              <p className={`mt-1.5 border-l-2 border-border pl-3 leading-relaxed ${app.starter ? "" : "text-muted-foreground"}`}>
                {app.starter ? `“${app.starter}”` : "No answer."}
              </p>
            </div>
            {task && (
              <div>
                <h4 className="font-medium">
                  Company task
                </h4>
                <p className="text-xs text-muted-foreground">Walked through at the start of the meeting. Not scored.</p>
                <p className="mt-1 text-muted-foreground whitespace-pre-line">{task}</p>
                <p className={`mt-2 border-l-2 border-border pl-3 leading-relaxed whitespace-pre-line ${app.taskAnswer ? "" : "text-muted-foreground"}`}>
                  {app.taskAnswer ?? "No answer."}
                </p>
                {app.taskAnswer && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {app.taskAiUsed ? "The candidate says an AI tool helped write this answer." : "The candidate says no AI tool was used."} Ask about it in the meeting.
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="linkedin" className="pt-3">
            <p className="mb-2 text-sm text-muted-foreground">The profile link is shown only after approval, to keep the review blind.</p>
            {app.checks.length ? <CheckList checks={app.checks} /> : <ul><CheckLine check={{ kind: "none", text: "No LinkedIn provided. This does not affect selection." }} /></ul>}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

/** One requirement: status first, then what the company asks, then what the candidate shows and where it comes from. */
function RequirementLine({
  r,
  cvShows,
  related,
  explained,
  selected,
  onSelect,
}: {
  r: RequirementRow;
  cvShows: string | null;
  /** CV lines that may be related by meaning (shown only when the fact check found nothing). */
  related: number;
  /** Plain-language meaning of the requirement for organisers (Gemini, company data only). */
  explained: GlossaryEntry | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const proof =
    r.proofType === "diploma"
      ? "diploma"
      : r.proofType === "certificate"
        ? "certificate"
        : r.proofType === "link"
          ? r.proofRef?.includes("github")
            ? "GitHub"
            : "link"
          : r.proofType === "reference"
            ? "reference letter"
            : null;
  const from = r.source === "cv" && r.value ? "from CV" : r.source === "profile" || r.source === "stated" ? "typed by the candidate" : null;
  const where = [from, r.linkedinMatch ? "matches LinkedIn" : null].filter(Boolean).join(", ");

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`grid w-full grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,1.15fr)] gap-x-4 border-b border-border/70 py-2.5 text-left text-sm ${selected ? "bg-accent" : "hover:bg-muted/40"}`}
      >
        <StatusIcon state={requirementState(r)} className="mt-0.5" />
        <span>
          {r.text}
          {r.mustHave && (
            <span className="ml-2">
              <MustHaveBadge />
            </span>
          )}
          {explained && (
            <span className="mt-1 block text-xs leading-snug text-muted-foreground">
              {explained.plain}
              {explained.inCv && <span className="mt-0.5 block">In a CV: {explained.inCv}</span>}
            </span>
          )}
        </span>
        <span>
          <span className={r.value ? "" : "text-muted-foreground"}>{r.value ?? "Not found in the CV"}</span>
          {(where || proof) && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {where}
              {proof && (
                <span className="inline-flex items-center gap-1 text-status-confirmed">
                  <Paperclip className="size-3" /> {proof}
                </span>
              )}
            </span>
          )}
          {cvShows && <span className="mt-0.5 block text-xs text-muted-foreground">CV shows: {cvShows}</span>}
          {!r.value && related > 0 && (
            <span className="mt-0.5 block text-xs text-primary">
              {related} CV {related === 1 ? "line" : "lines"} may be related by meaning. Click to see them.
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function BiasPanel({ bias }: { bias: Review["bias"] }) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <div>
      <p className="text-sm text-muted-foreground">Share of each group among approved people compared with all applicants. A group should not shrink.</p>
      <ul className="mt-5 space-y-4">
        {bias.rows.map((r) => (
          <li key={r.label} className="text-sm">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="font-medium">{r.label}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {r.approved === null ? "no approvals yet" : `${pct(r.approved)} approved`}, {pct(r.applicants)} applied
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted">
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary/30" style={{ width: pct(r.applicants) }} />
              {r.approved !== null && <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: pct(r.approved) }} />}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 flex items-start gap-2 text-sm">
        <StatusIcon state={bias.skew === "warning" ? "check" : bias.skew === "none" ? "met" : "neutral"} className="mt-0.5" />
        {bias.skew === "warning"
          ? "A group has a smaller share among approved people than among applicants. Check before you continue."
          : bias.skew === "none"
            ? "Approved people look like the applicants."
            : `Approve at least ${bias.minApprovals} people to compare.`}
      </p>
    </div>
  );
}

/**
 * The CV as text with personal details already cut out on the server. Clicking a requirement lights up the lines
 * its evidence comes from. No scroll area of its own: it scrolls with the candidate.
 */
function SourcePanel({
  source,
  doc,
  selectedLines,
  relatedLines,
  selected,
}: {
  source: SourceResult | null;
  doc: DocResult | null;
  selectedLines: number[];
  relatedLines: number[];
  selected: boolean;
}) {
  const firstLine = useRef<HTMLDivElement | null>(null);
  const first = selectedLines[0] ?? relatedLines[0];
  useEffect(() => {
    firstLine.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedLines, relatedLines]);

  if (!source) return <p className="text-sm text-muted-foreground">Loading the CV text…</p>;
  if (!source.ok) return <p className="text-sm text-destructive">{source.error}</p>;
  if (!doc) return <p className="text-sm text-muted-foreground">No CV text to show for this application.</p>;

  const lit = new Set(selectedLines);
  const near = new Set(relatedLines);
  return (
    <div>
      <p className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {selected ? (
          <>
            <span>
              {selectedLines.length
                ? `${selectedLines.length} ${selectedLines.length === 1 ? "line" : "lines"} behind this requirement`
                : "No line in the CV is behind this requirement."}
            </span>
            {selectedLines.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-5 rounded-sm bg-status-ai-bg" /> fact check
              </span>
            )}
            {relatedLines.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-5 rounded-sm border border-dashed border-primary/60 bg-accent" /> related by meaning, not checked
              </span>
            )}
          </>
        ) : (
          "Names, contact details, links, addresses and birth dates were removed when the CV was uploaded."
        )}
      </p>
      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed">
        {doc.lines.map((line, i) => (
          <div
            key={i}
            ref={i === first ? firstLine : undefined}
            className={`-mx-1.5 rounded px-1.5 whitespace-pre-wrap ${
              lit.has(i)
                ? "bg-status-ai-bg text-foreground"
                : near.has(i)
                  ? "outline-1 -outline-offset-1 outline-dashed outline-primary/60 bg-accent text-foreground"
                  : selected
                    ? "text-muted-foreground"
                    : ""
            } ${/\[[a-z -]+ hidden\]/.test(line) ? "italic" : ""}`}
          >
            {line || " "}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">If you still see something personal, tell the event team.</p>
    </div>
  );
}
