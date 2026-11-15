"use client";

import { Check, FileUp, Info, Loader2, Paperclip, Plus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BackLink } from "@/components/back-link";
import { CheckList, MustHaveBadge, requirementState, StatusIcon } from "@/components/fact-labels";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveLinkedin, sendApplications, uploadDocument } from "@/lib/matchready/candidate-actions";
import type { EvidenceRow } from "@/lib/matchready/candidate-service";
import { TASK_MINUTES } from "@/lib/matchready/config";
import { DEMO_CANDIDATE } from "@/lib/matchready/demo";
import { needsLook, type LinkedinCheck, type RequirementType } from "@/lib/matchready/facts";

type ProofType = "diploma" | "certificate" | "link" | "reference";
const PROOF_FOR: Record<RequirementType, { type: ProofType; label: string; placeholder: string }> = {
  education: { type: "diploma", label: "Diploma", placeholder: "File name or link to your diploma" },
  language: { type: "certificate", label: "Certificate", placeholder: "Language certificate (file name or link)" },
  has_done: { type: "link", label: "Link", placeholder: "GitHub, publication or project link" },
  experience: { type: "reference", label: "Reference", placeholder: "Reference letter (file name or link)" },
};


interface Company {
  id: string;
  name: string;
  role: string;
  starter: string;
  /** Optional task from the company. */
  task: string | null;
  requirements: { id: string; text: string; type: RequirementType; mustHave: boolean }[];
}

export function ApplyForm({
  candidateId,
  companies,
  stage1Cv,
  cvParsed: cvParsedInitial,
  linkedinParsed: liParsedInitial,
  linkedinUrl,
  initialPreview,
  initialChecks,
}: {
  candidateId: string;
  companies: Company[];
  stage1Cv: boolean;
  cvParsed: boolean;
  linkedinParsed: boolean;
  linkedinUrl: string;
  initialPreview: { companyId: string; rows: EvidenceRow[] }[];
  initialChecks: LinkedinCheck[];
}) {
  const router = useRouter();
  const [cvParsed, setCvParsed] = useState(cvParsedInitial);
  const [liParsed, setLiParsed] = useState(liParsedInitial);
  const [url, setUrl] = useState(linkedinUrl);
  const [preview, setPreview] = useState(initialPreview);
  const [checks, setChecks] = useState(initialChecks);
  const [busy, setBusy] = useState<"cv" | "linkedin" | null>(null);
  const [stated, setStated] = useState<Record<string, Record<string, string>>>({});
  const [proofs, setProofs] = useState<Record<string, Record<string, { type: ProofType; ref: string }>>>({});
  const [openProof, setOpenProof] = useState<string | null>(null);
  const [starters, setStarters] = useState<Record<string, string>>({});
  const [taskAnswers, setTaskAnswers] = useState<Record<string, string>>({});
  const [taskAi, setTaskAi] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function upload(kind: "cv" | "linkedin", file: File | null, reuse = false) {
    setError(null);
    setNotice(null);
    setBusy(kind);
    const fd = new FormData();
    fd.set("candidateId", candidateId);
    fd.set("kind", kind);
    fd.set("companies", JSON.stringify(companies.map((c) => c.id)));
    if (reuse) fd.set("reuse", "1");
    if (file) fd.set("file", file);
    startTransition(async () => {
      const r = await uploadDocument(fd);
      setBusy(null);
      if (!r.ok) return setError(r.error);
      setPreview(r.preview);
      setChecks(r.checks);
      if (kind === "cv") setCvParsed(true);
      else setLiParsed(true);
      if (!r.parsed) setNotice("We could not fill in everything from your documents. Check the table and type what is missing.");
    });
  }

  async function sample(kind: "cv" | "linkedin") {
    const path = kind === "cv" ? DEMO_CANDIDATE.cvFile : DEMO_CANDIDATE.linkedinFile;
    const blob = await (await fetch(path)).blob();
    upload(kind, new File([blob], path.split("/").pop() ?? "sample.pdf", { type: "application/pdf" }));
  }

  function send() {
    setError(null);
    startTransition(async () => {
      const r = await sendApplications({
        candidateId,
        available: true,
        applications: companies.map((c) => ({ companyId: c.id, starter: starters[c.id] ?? "", taskAnswer: taskAnswers[c.id] ?? "", taskAiUsed: taskAi[c.id] ?? false, stated: stated[c.id] ?? {}, proofs: proofs[c.id] ?? {} })),
      });
      if (r.ok) router.push(`/candidate/${encodeURIComponent(candidateId)}`);
      else setError(r.error);
    });
  }

  const rowsFor = (companyId: string) => preview.find((p) => p.companyId === companyId)?.rows ?? [];
  const toCheck = checks.filter(needsLook).length;

  return (
    <div className="page-form px-5 py-10">
      <BackLink href={`/candidate/${encodeURIComponent(candidateId)}/choose`}>Back to choose companies</BackLink>
      <Timeline stage={2} />
      <h1 className="title-page">Show where you meet each requirement</h1>
      <p className="mt-2 max-w-[62ch] text-muted-foreground">
        Upload your CV and we fill in the rest. Check it, fix anything wrong, then send. Proof is optional.
      </p>

      <Step n={1} title="Your documents" aside={cvParsed ? "CV read" : "CV required"}>
        <div className="divide-y divide-border">
          <DocRow
            label="CV"
            hint="Required"
            done={cvParsed}
            busy={busy === "cv"}
            busyText="Reading your CV on our EU server…"
            doneText="Read. The requirements below are filled in."
            actions={
              <>
                {stage1Cv && (
                  <Button size="sm" onClick={() => upload("cv", null, true)} disabled={!!busy}>
                    Use the CV you uploaded earlier
                  </Button>
                )}
                <FilePick label={cvParsed ? "Replace CV" : "Upload CV"} disabled={!!busy} onFile={(f) => upload("cv", f)} primary={!stage1Cv && !cvParsed} />
                <button className="text-sm text-muted-foreground hover:text-foreground hover:underline" disabled={!!busy} onClick={() => sample("cv")}>
                  Use sample CV
                </button>
              </>
            }
          />
          <DocRow
            label="LinkedIn"
            hint="Optional"
            done={liParsed}
            busy={busy === "linkedin"}
            busyText="Reading your LinkedIn export…"
            doneText={toCheck ? `Compared: ${toCheck} ${toCheck === 1 ? "difference" : "differences"} to explain` : "Compared: no differences"}
            actions={
              <>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onBlur={() => void saveLinkedin(candidateId, url)}
                  placeholder="linkedin.com/in/…"
                  className="h-8 w-52 bg-card"
                  aria-label="LinkedIn profile URL"
                />
                <FilePick label="Upload PDF" disabled={!!busy || !cvParsed} onFile={(f) => upload("linkedin", f)} />
                <button className="text-sm text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50" disabled={!!busy || !cvParsed} onClick={() => sample("linkedin")}>
                  Use sample export
                </button>
              </>
            }
          />
        </div>
        {liParsed && checks.length > 0 ? (
          <div className="border-t border-border px-5 py-4">
            <h3 className="text-sm font-medium">What the organiser will see about your CV and LinkedIn</h3>
            <div className="mt-1">
              <CheckList checks={checks} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {toCheck
                ? "A difference is not a rejection: the organiser asks about it in the meeting. You can also fix your CV or LinkedIn and upload it again."
                : "Nothing here needs an explanation."}
            </p>
          </div>
        ) : (
          <p className="flex gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            LinkedIn: More → Save to PDF. We only compare it with your CV. Not having LinkedIn never counts against you.
          </p>
        )}
      </Step>

      {notice && <p className="mt-4 rounded-lg bg-status-ai-bg px-4 py-2.5 text-sm text-status-ai">{notice}</p>}

      {companies.map((c, i) => (
        <Step key={c.id} n={i + 2} title={c.name} aside={c.role}>
          {c.requirements.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">This company listed no specific requirements. Answer the question below.</p>
          ) : (
            <ul>
              <li className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-x-6 border-b border-border px-5 py-2 text-xs text-muted-foreground md:grid">
                <span>Company asks for</span>
                <span>Where you have it</span>
              </li>
              {c.requirements.map((r) => {
                const ev = rowsFor(c.id).find((x) => x.requirementId === r.id);
                const typed = stated[c.id]?.[r.id];
                const value = typed ?? ev?.value ?? "";
                const missing = cvParsed && !ev?.value;
                const proof = proofs[c.id]?.[r.id];
                const key = `${c.id}:${r.id}`;
                const pf = PROOF_FOR[r.type];
                const state = !cvParsed ? "neutral" : value.trim() ? (typed ? "neutral" : requirementState({ mustHave: r.mustHave, meets: ev?.meets ?? null })) : r.mustHave ? "check" : "neutral";
                return (
                  <li key={r.id} className="grid gap-x-6 gap-y-2 border-b border-border/70 px-5 py-3 last:border-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                    <div className="flex gap-2.5 text-sm">
                      <StatusIcon state={state} className="mt-0.5" />
                      <span>
                        {r.text}
                        {r.mustHave && (
                          <span className="ml-2">
                            <MustHaveBadge />
                          </span>
                        )}
                      </span>
                    </div>
                    <div>
                      <Textarea
                        rows={1}
                        value={value}
                        disabled={!cvParsed}
                        aria-label={`Where you have it: ${r.text}`}
                        onChange={(e) => setStated((s) => ({ ...s, [c.id]: { ...(s[c.id] ?? {}), [r.id]: e.target.value } }))}
                        placeholder={!cvParsed ? "Upload your CV first" : missing ? "Not found in your CV. Add it if you have it." : ""}
                        className={`min-h-9 resize-none bg-card py-1.5 text-sm ${missing && !value ? "border-status-ai/60 placeholder:text-status-ai" : ""}`}
                      />
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {!value && ev?.related ? (
                          <span className="text-foreground/80">
                            Your CV mentions “{ev.related}”.{" "}
                            <button
                              type="button"
                              className="font-medium text-primary hover:underline"
                              onClick={() => setStated((s) => ({ ...s, [c.id]: { ...(s[c.id] ?? {}), [r.id]: ev.related ?? "" } }))}
                            >
                              Use it
                            </button>
                          </span>
                        ) : (
                          <span>{typed ? "typed by you" : ev?.value ? `from your CV${ev.linkedinMatch ? ", matches LinkedIn" : ""}` : ""}</span>
                        )}
                        {proof ? (
                          <span className="inline-flex max-w-full items-center gap-1 truncate text-status-confirmed">
                            <Paperclip className="size-3 shrink-0" /> {pf.label}: {proof.ref}
                          </span>
                        ) : openProof === key ? (
                          <form
                            className="flex w-full gap-1"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const ref = String(new FormData(e.currentTarget).get("ref") ?? "").trim();
                              if (ref) setProofs((p) => ({ ...p, [c.id]: { ...(p[c.id] ?? {}), [r.id]: { type: pf.type, ref } } }));
                              setOpenProof(null);
                            }}
                          >
                            <Input name="ref" autoFocus placeholder={pf.placeholder} className="h-8 bg-card text-xs" />
                            <Button size="sm" type="submit">
                              Add
                            </Button>
                          </form>
                        ) : (
                          cvParsed && (
                            <button onClick={() => setOpenProof(key)} className="inline-flex items-center gap-1 text-primary hover:underline">
                              <Plus className="size-3" /> Add proof
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-border px-5 py-4">
            <label className="block text-sm font-medium" htmlFor={`starter-${c.id}`}>
              {c.starter}
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">Conversation starter: 2–3 sentences. It opens your meeting and is not used for selection.</p>
            <Textarea
              id={`starter-${c.id}`}
              value={starters[c.id] ?? ""}
              onChange={(e) => setStarters((s) => ({ ...s, [c.id]: e.target.value }))}
              className="mt-2 min-h-20 bg-card"
            />
          </div>
          {c.task && (
            <div className="border-t border-border px-5 py-4">
              <label className="block text-sm font-medium" htmlFor={`task-${c.id}`}>
                Task from {c.name}
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">Optional, about {TASK_MINUTES} minutes.</p>
              <p className="mt-2 border-l-2 border-border pl-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{c.task}</p>
              <Textarea
                id={`task-${c.id}`}
                value={taskAnswers[c.id] ?? ""}
                onChange={(e) => setTaskAnswers((s) => ({ ...s, [c.id]: e.target.value }))}
                placeholder="Use a project from your own work. You walk the company through it at the start of the meeting."
                className="mt-3 min-h-28 bg-card"
              />
              <label className="mt-3 flex items-start gap-2.5 text-sm">
                <Checkbox checked={taskAi[c.id] ?? false} onCheckedChange={(v) => setTaskAi((s) => ({ ...s, [c.id]: v === true }))} className="mt-0.5" />
                <span>
                  I used an AI tool to help write this answer <span className="text-muted-foreground">(allowed: the company sees that you said so)</span>
                </span>
              </label>
            </div>
          )}
        </Step>
      ))}

      {error && (
        <p role="alert" className="mt-5 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={!cvParsed || pending || !!busy} onClick={send}>
          Send application{companies.length > 1 ? `s (${companies.length})` : ""}
        </Button>
        <button
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          onClick={() => {
            setStarters(Object.fromEntries(companies.map((c) => [c.id, DEMO_CANDIDATE.starter])));
            setTaskAnswers(Object.fromEntries(companies.filter((c) => c.task).map((c) => [c.id, DEMO_CANDIDATE.taskAnswer])));
          }}
        >
          Fill demo answers
        </button>
        {!cvParsed && <span className="text-sm text-muted-foreground">Upload your CV to send.</span>}
      </div>
      <p className="mt-6 flex gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        An open AI model on our own EU server reads your documents to fill in the requirements. It never scores or ranks you. Organisers decide
        without seeing your name.
      </p>
    </div>
  );
}

/** One numbered part of the application: one card, one header, nothing boxed inside it. */
function Step({ n, title, aside, children }: { n: number; title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-muted/40 px-5 py-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">{n}</span>
        <h2 id={`step-${n}`} className="font-semibold">
          {title}
        </h2>
        {aside && <span className="ml-auto text-sm text-muted-foreground">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

function DocRow({
  label,
  hint,
  done,
  busy,
  busyText,
  doneText,
  actions,
}: {
  label: string;
  hint: string;
  done: boolean;
  busy: boolean;
  busyText: string;
  doneText: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 px-5 py-4 md:grid-cols-[140px_minmax(0,1fr)] md:items-center">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {busy ? (
          <span className="inline-flex items-center gap-2 text-sm text-primary">
            <Loader2 className="size-4 animate-spin" /> {busyText}
          </span>
        ) : (
          <>
            {done && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-confirmed-bg px-2.5 py-1 text-sm text-status-confirmed">
                <Check className="size-4" /> {doneText}
              </span>
            )}
            {actions}
          </>
        )}
      </div>
    </div>
  );
}

function FilePick({ label, onFile, disabled, primary }: { label: string; onFile: (f: File) => void; disabled?: boolean; primary?: boolean }) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${primary ? "bg-primary text-primary-foreground hover:bg-primary/85" : "border border-input hover:bg-muted/40"} ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <FileUp className="size-4" /> {label}
      <input type="file" accept=".pdf,.txt" className="sr-only" disabled={disabled} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </label>
  );
}
