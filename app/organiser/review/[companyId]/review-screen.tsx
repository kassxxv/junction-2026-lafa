"use client";

/**
 * Organiser review: clean cases in seconds, every decision human and logged.
 * AI shows facts (evidence + CV ↔ LinkedIn). It never scores or ranks.
 */

import { ArrowLeft, Check, Download, EyeOff, Info, RotateCcw, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveClean, decide, resetReview, startReview, type ActionResult } from "@/lib/matchready/organiser-actions";
import { MAX_COMPANIES_PER_CANDIDATE } from "@/lib/matchready/config";
import { DEMO_REVIEW_FOCUS_CODE } from "@/lib/matchready/demo";
import type { ApplicationRow, RequirementRow, Review, ReviewStatus } from "@/lib/matchready/organiser";

type Filter = "all" | "meets" | "look";

const STATUS: Record<ReviewStatus, { label: (a: ApplicationRow) => string; className: string }> = {
  approved: { label: () => "Approved", className: "bg-status-confirmed-bg text-status-confirmed" },
  declined: { label: () => "Declined, Program Pass", className: "bg-muted text-muted-foreground" },
  missing: { label: () => "Missing must-have", className: "bg-status-ask-bg text-status-ask" },
  check: { label: (a) => `${a.toCheck} to check`, className: "bg-status-ai-bg text-status-ai" },
  clean: { label: () => "Must-haves ✓", className: "bg-status-source-bg text-status-source" },
};

export function ReviewScreen({ review, demo }: { review: Review; demo: boolean }) {
  const { company, role, applications } = review;
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string>(
    () => applications.find((a) => a.code === DEMO_REVIEW_FOCUS_CODE)?.id ?? applications[0]?.id ?? "",
  );
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const started = useRef(false);

  // Metric 1: the review session starts when the organiser opens the screen.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void startReview(company.id);
  }, [company.id]);

  const filled = applications.filter((a) => a.status === "approved").length;
  const free = company.places - filled;
  const counts = {
    all: applications.length,
    meets: applications.filter((a) => a.mustMissing === 0).length,
    look: applications.filter((a) => a.mustMissing === 0 && a.toCheck > 0 && a.status !== "approved").length,
  };
  const visible = applications.filter((a) =>
    filter === "meets" ? a.mustMissing === 0 : filter === "look" ? a.mustMissing === 0 && a.toCheck > 0 && a.status !== "approved" : true,
  );
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
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <Link href="/organiser" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4">
              <ArrowLeft className="size-4" /> Overview
            </Link>
            <h1 className="title-panel">
              {company.name}
              {role && <span className="font-normal text-muted-foreground">, {role.title}</span>}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <EyeOff className="size-3.5" />
              {applications.length} applied (each person can choose up to {MAX_COMPANIES_PER_CANDIDATE} companies). Blind review: names, photos and
              nationality are hidden.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Places filled</div>
            <div className="text-3xl font-semibold tabular-nums">
              {filled} <span className="text-muted-foreground">/ {company.places}</span>
            </div>
          </div>
        </div>
        {review.companies.length > 1 && (
          <nav aria-label="Companies" className="mt-4 flex gap-2 overflow-x-auto">
            {review.companies.map((c) => (
              <Link
                key={c.id}
                href={`/organiser/review/${c.id}`}
                aria-current={c.id === company.id ? "page" : undefined}
                className={`rounded-full border px-3 py-1 text-sm whitespace-nowrap ${
                  c.id === company.id ? "border-primary bg-accent font-medium" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.name} <span className="tabular-nums text-muted-foreground">{c.approved}/{c.places}</span>
              </Link>
            ))}
          </nav>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-6 p-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* List */}
          <section aria-label="Applicants" className="flex flex-col rounded-xl border border-border bg-card xl:sticky xl:top-0 xl:max-h-[calc(100vh-11rem)]">
            <div className="flex flex-wrap gap-2 border-b border-border p-3">
              {(
                [
                  ["all", `All ${counts.all}`],
                  ["meets", `Must-haves met ${counts.meets}`],
                  ["look", `Needs a look ${counts.look}`],
                ] as const
              ).map(([f, label]) => (
                <button
                  key={f}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-3 py-1 text-sm ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="border-b border-border p-3">
              <Button
                variant="outline"
                className="w-full bg-card"
                disabled={!clean.length || free <= 0}
                onClick={() => setSelected(new Set(clean.slice(0, Math.max(0, free)).map((a) => a.id)))}
              >
                Select clean cases ({Math.min(clean.length, Math.max(0, free))})
              </Button>
            </div>

            <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {visible.map((a) => {
                const st = STATUS[a.status];
                const canSelect = a.status === "clean";
                return (
                  <li key={a.id}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 ${a.id === openId ? "bg-accent/70" : "hover:bg-muted/40"}`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${a.code}`}
                        className="size-4 accent-[var(--primary)]"
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
                      <button onClick={() => setOpenId(a.id)} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">Candidate {a.code}</span>
                          <span className="block truncate text-xs text-muted-foreground">{a.keyFact ?? "No matching experience found"}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>{st.label(a)}</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-border p-3">
              <Button
                className="w-full"
                disabled={!selectedClean.length || pending}
                onClick={() => run(() => approveClean(company.id, selectedClean), () => setSelected(new Set()))}
              >
                <Check data-icon="inline-start" />
                Approve selected ({selectedClean.length})
              </Button>
              {free <= 0 && <p className="mt-2 text-center text-xs text-muted-foreground">All places are filled.</p>}
            </div>
          </section>

          {/* Detail + side panels */}
          <div className="min-w-0 space-y-6">
            {result && (
              <p
                role="status"
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${result.ok ? "bg-status-confirmed-bg text-status-confirmed" : "bg-status-ask-bg text-status-ask"}`}
              >
                {result.ok ? <Check className="size-4" /> : <X className="size-4" />}
                {result.ok ? result.message : result.error}
              </p>
            )}

            {open ? (
              <Detail
                key={open.id}
                app={open}
                pending={pending}
                placesFull={free <= 0}
                onDecide={(action, note) => run(() => decide(company.id, open.id, action, note))}
              />
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">Select a candidate.</div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <BiasPanel bias={review.bias} />
              <section className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Decision log</h2>
                  {demo && (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resetReview(company.id), () => setSelected(new Set()))}>
                      <RotateCcw data-icon="inline-start" />
                      Reset demo
                    </Button>
                  )}
                </div>
                <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto text-sm">
                  {review.decisions.length ? (
                    review.decisions.map((d, i) => (
                      <li key={i} className="leading-snug">
                        <span className="tabular-nums text-muted-foreground">{d.at}</span>{" "}
                        {d.organiser.split(" ")[0]} {d.action === "approve" ? "approved" : d.action === "decline" ? "declined" : "undid"}{" "}
                        <span className="font-medium">{d.code}</span>
                        <span className="text-muted-foreground">
                          {d.batch ? " in a batch (must-haves met)" : d.note ? ` with a note: “${d.note}”` : d.rule ? ` (${d.rule})` : ""}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No decisions yet.</li>
                  )}
                </ul>
                <Button asChild variant="outline" className="mt-4 h-auto w-full bg-card py-2 whitespace-normal" disabled={!filled}>
                  <a href={filled ? `/api/organiser/export?company=${company.id}` : undefined} aria-disabled={!filled}>
                    <Download data-icon="inline-start" />
                    Export {filled} approved for Tavata (CSV)
                  </a>
                </Button>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({
  app,
  pending,
  placesFull,
  onDecide,
}: {
  app: ApplicationRow;
  pending: boolean;
  placesFull: boolean;
  onDecide: (action: "approve" | "decline" | "undo", note: string) => void;
}) {
  const [note, setNote] = useState("");
  const st = STATUS[app.status];
  const needsNote = app.status === "check" || app.status === "missing";
  const decided = app.status === "approved" || app.status === "declined";

  return (
    <section aria-label={`Candidate ${app.code}`} className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Candidate {app.code}</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>{st.label(app)}</span>
        </div>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Info className="size-4" />
          AI shows facts. It does not score or rank.
        </span>
      </div>

      <div className="space-y-6 p-5">
        <div>
          <h3 className="mb-2 font-medium">Company needs and where the candidate has it</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="w-[38%] px-3 py-2 font-medium">Company requirement</th>
                  <th className="w-[4.5rem] px-2 py-2" />
                  <th className="px-3 py-2 font-medium">Where the candidate has it</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {app.requirements.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2.5">{r.text}</td>
                    <td className="px-3 py-2.5">
                      {r.mustHave && <span className="rounded bg-status-ask-bg px-1.5 py-0.5 text-[0.7rem] font-semibold text-status-ask">MUST</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={r.value ? "" : "text-muted-foreground"}>{r.value ?? "Not found in the CV"}</span>
                      <EvidenceTag r={r} />
                    </td>
                    <td className="px-3 py-2.5 text-center text-base">
                      {r.meets === true ? (
                        <span className="text-status-confirmed" aria-label="covered">✓</span>
                      ) : r.meets === false && r.mustHave ? (
                        <span className="text-status-ask" aria-label="not covered">✗</span>
                      ) : r.meets === false ? (
                        <span className="text-muted-foreground" aria-label="not covered">✗</span>
                      ) : r.mustHave ? (
                        <span className="text-status-ai" aria-label="not verified">?</span>
                      ) : (
                        <span className="text-muted-foreground" aria-label="unknown">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="font-medium">
            Conversation starter{" "}
            <span className="text-sm font-normal text-muted-foreground">(for the meeting, not for selection)</span>
          </h3>
          <p className={`mt-1.5 font-serif leading-relaxed ${app.starter ? "" : "text-muted-foreground"}`}>
            {app.starter ? `“${app.starter}”` : "No answer yet."}
          </p>
        </div>

        <div>
          <h3 className="font-medium">CV and LinkedIn profile</h3>
          <p className="mb-2 text-sm text-muted-foreground">
            Compared with the LinkedIn profile the candidate provided. The profile link is shown after approval, to keep the
            review blind.
          </p>
          <ul className="space-y-2">
            {app.checks.map((c, i) => (
              <li key={i} className={`flex gap-3 rounded-lg border-l-4 bg-muted/30 px-3 py-2 text-sm ${CHECK[c.kind].border}`}>
                <span className={`w-28 shrink-0 text-xs font-semibold ${CHECK[c.kind].text}`}>{CHECK[c.kind].label}</span>
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border pt-5">
          {decided ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${st.className}`}>{st.label(app)}</span>
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => onDecide("undo", "")}>
                <Undo2 data-icon="inline-start" />
                Undo
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {needsNote ? (
                <>
                  <label htmlFor="note" className="block text-sm font-medium">
                    {app.status === "missing"
                      ? "A must-have is missing. You can still approve it with a note."
                      : app.mustUnverified > 0
                        ? "A must-have is not verified by a document. Approve with a short note."
                        : "Something to check. Approve with a short note."}
                  </label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="For example: Lead vs engineer, likely led the project, not people. Ask in the meeting."
                    className="min-h-20 bg-card"
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">All must-haves met, nothing to check. Approve here or in the batch on the left.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button disabled={pending || placesFull || (needsNote && !note.trim())} onClick={() => onDecide("approve", note)}>
                  <Check data-icon="inline-start" />
                  {needsNote ? "Approve with note" : "Approve"}
                </Button>
                <Button variant="outline" className="bg-card" disabled={pending} onClick={() => onDecide("decline", note)}>
                  Decline and offer Program Pass
                </Button>
              </div>
              {placesFull && <p className="text-sm text-muted-foreground">All places are filled. Undo another approval to approve this one.</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const CHECK = {
  match: { label: "MATCH", border: "border-status-confirmed", text: "text-status-confirmed" },
  differs: { label: "DIFFERS", border: "border-status-ai", text: "text-status-ai" },
  not_found: { label: "NOT FOUND", border: "border-status-missing", text: "text-status-missing" },
  linkedin_only: { label: "LINKEDIN ONLY", border: "border-border", text: "text-muted-foreground" },
  info: { label: "NOTE", border: "border-border", text: "text-muted-foreground" },
  none: { label: "NO LINKEDIN", border: "border-border", text: "text-muted-foreground" },
} as const;

function EvidenceTag({ r }: { r: RequirementRow }) {
  const tag =
    r.proofType === "diploma"
      ? "diploma attached"
      : r.proofType === "certificate"
        ? "certificate attached"
        : r.proofType === "link"
          ? r.proofRef?.includes("github") ? "GitHub link" : "link attached"
          : r.proofType === "reference"
            ? "reference letter"
            : r.linkedinMatch
              ? "matches LinkedIn"
              : r.source === "profile" || r.source === "stated"
                ? "stated by candidate"
                : r.source === "cv" && r.value
                  ? "from CV"
                  : null;
  if (!tag) return null;
  const strong = r.proofType || r.linkedinMatch;
  return (
    <span
      className={`ml-2 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${strong ? "bg-status-confirmed-bg text-status-confirmed" : "bg-muted text-muted-foreground"}`}
    >
      {tag}
    </span>
  );
}

function BiasPanel({ bias }: { bias: Review["bias"] }) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const rows = useMemo(() => bias.rows, [bias.rows]);
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">Bias check</h2>
      <p className="text-sm text-muted-foreground">Share among approved vs all applicants for this company. Aggregate only.</p>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="text-sm">
            <div className="mb-1">
              <div className="font-medium">{r.label}</div>
              <div className="text-xs tabular-nums text-muted-foreground">
                {r.approved === null ? "No approvals yet" : `${pct(r.approved)} of approved`}, {pct(r.applicants)} of applicants
              </div>
            </div>
            <div className="relative h-2 rounded-full bg-muted">
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary/30" style={{ width: pct(r.applicants) }} />
              {r.approved !== null && <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: pct(r.approved) }} />}
            </div>
          </li>
        ))}
      </ul>
      <p
        className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
          bias.skew === "warning" ? "bg-status-ai-bg text-status-ai" : bias.skew === "none" ? "bg-status-confirmed-bg text-status-confirmed" : "bg-muted text-muted-foreground"
        }`}
      >
        {bias.skew === "warning"
          ? "A group has a smaller share among approved than among applicants. Check before you continue."
          : bias.skew === "none"
            ? "Approved people look like the applicants"
            : `Approve at least ${bias.minApprovals} people to compare`}
      </p>
    </section>
  );
}
