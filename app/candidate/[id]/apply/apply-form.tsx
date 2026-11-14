"use client";

import { Check, FileUp, Info, Loader2, Paperclip, Plus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BackLink } from "@/components/back-link";
import { CHECK_STYLE, MustHaveBadge } from "@/components/fact-labels";
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
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <Timeline stage={2} />
        <h1 className="title-page">Show where you meet each requirement</h1>
        <p className="mt-1 max-w-[62ch] text-muted-foreground">
          Proof is optional.
        </p>

        {/* Documents */}
        <section className="mt-8 rounded-xl border border-border">
          <h2 className="border-b border-border px-5 py-3 font-semibold">Your documents</h2>
          <div className="divide-y divide-border">
            <DocRow
              label="CV"
              hint="Required"
              done={cvParsed}
              busy={busy === "cv"}
              busyText="Reading your CV on the event's EU server…"
              doneText="CV read. The table below is filled in."
              actions={
                <>
                  {stage1Cv && (
                    <Button size="sm" onClick={() => upload("cv", null, true)} disabled={!!busy}>
                      Use the CV you uploaded earlier
                    </Button>
                  )}
                  <FilePick label={cvParsed ? "Replace CV" : "Upload CV to prefill everything below"} disabled={!!busy} onFile={(f) => upload("cv", f)} primary={!stage1Cv && !cvParsed} />
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
              doneText={toCheck ? `Compared with your CV: ${toCheck} ${toCheck === 1 ? "difference" : "differences"} the organiser may ask about` : "Compared with your CV: no differences"}
              actions={
                <>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={() => void saveLinkedin(candidateId, url)}
                    placeholder="linkedin.com/in/…"
                    className="h-8 w-56 bg-card"
                    aria-label="LinkedIn profile URL"
                  />
                  <FilePick label="Upload LinkedIn PDF" disabled={!!busy || !cvParsed} onFile={(f) => upload("linkedin", f)} />
                  <button className="text-sm text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50" disabled={!!busy || !cvParsed} onClick={() => sample("linkedin")}>
                    Use sample export
                  </button>
                </>
              }
            />
          </div>
          <p className="flex gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            On LinkedIn: More → Save to PDF. We use it only to compare with your CV. Not having LinkedIn never counts against
            you.
          </p>
        </section>

        {liParsed && checks.length > 0 && (
          <section className="mt-6 rounded-xl border border-border">
            <h2 className="border-b border-border px-5 py-3 font-semibold">What the organiser will see about your CV and LinkedIn</h2>
            <ul className="divide-y divide-border">
              {checks.map((c, i) => (
                <li key={i} className="flex gap-3 px-5 py-2.5 text-sm">
                  <span className={`w-28 shrink-0 text-xs font-semibold ${CHECK_STYLE[c.kind].text}`}>{CHECK_STYLE[c.kind].label}</span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
            <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              {toCheck
                ? "A difference is not a rejection: the organiser asks about it or adds a note. You can also fix your CV or LinkedIn and upload it again."
                : "Nothing here needs an explanation."}
            </p>
          </section>
        )}

        {notice && <p className="mt-4 rounded-lg bg-status-ai-bg px-4 py-2.5 text-sm text-status-ai">{notice}</p>}

        {/* Per company */}
        {companies.map((c) => (
          <section key={c.id} className="mt-6 rounded-xl border border-border">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3">
              <h2 className="text-lg font-semibold">{c.name}</h2>
              <span className="text-sm text-muted-foreground">{c.role}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-5 py-2.5 font-medium">Company asks for</th>
                    <th className="w-24 px-2 py-2.5" />
                    <th className="px-3 py-2.5 font-medium">Where you have it</th>
                    <th className="w-56 px-5 py-2.5 font-medium">Proof (optional)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {c.requirements.map((r) => {
                    const ev = rowsFor(c.id).find((x) => x.requirementId === r.id);
                    const missing = cvParsed && !ev?.value;
                    const value = stated[c.id]?.[r.id] ?? ev?.value ?? "";
                    const proof = proofs[c.id]?.[r.id];
                    const key = `${c.id}:${r.id}`;
                    const pf = PROOF_FOR[r.type];
                    return (
                      <tr key={r.id} className="align-top">
                        <td className="px-5 py-3">{r.text}</td>
                        <td className="px-2 py-3">
                          {r.mustHave && <MustHaveBadge />}
                        </td>
                        <td className="px-3 py-2">
                          <Textarea
                            rows={1}
                            value={value}
                            disabled={!cvParsed}
                            onChange={(e) => setStated((s) => ({ ...s, [c.id]: { ...(s[c.id] ?? {}), [r.id]: e.target.value } }))}
                            placeholder={!cvParsed ? "Upload your CV to prefill, or type here" : missing ? "Not found in your CV. Add it if you have it." : ""}
                            className={`min-h-8 resize-none bg-card py-1.5 ${missing && !value ? "border-status-ai/60 placeholder:text-status-ai" : ""}`}
                          />
                        </td>
                        <td className="px-5 py-2.5">
                          {ev?.linkedinMatch && !stated[c.id]?.[r.id] ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-status-confirmed-bg px-2 py-0.5 text-xs text-status-confirmed">
                              <Check className="size-3" /> matches LinkedIn
                            </span>
                          ) : proof ? (
                            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-status-confirmed-bg px-2 py-0.5 text-xs text-status-confirmed">
                              <Paperclip className="size-3 shrink-0" /> {pf.label}: {proof.ref}
                            </span>
                          ) : openProof === key ? (
                            <form
                              className="flex gap-1"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const ref = String(new FormData(e.currentTarget).get("ref") ?? "").trim();
                                if (ref) setProofs((p) => ({ ...p, [c.id]: { ...(p[c.id] ?? {}), [r.id]: { type: pf.type, ref } } }));
                                setOpenProof(null);
                              }}
                            >
                              <Input name="ref" autoFocus placeholder={pf.placeholder} className="h-8 bg-card text-xs" />
                              <Button size="sm" type="submit">Add</Button>
                            </form>
                          ) : (
                            <button onClick={() => setOpenProof(key)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                              <Plus className="size-3.5" /> Add proof
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-5 py-4">
              <label className="block text-sm font-medium" htmlFor={`starter-${c.id}`}>
                Conversation starter: {c.starter}
              </label>
              <Textarea
                id={`starter-${c.id}`}
                value={starters[c.id] ?? ""}
                onChange={(e) => setStarters((s) => ({ ...s, [c.id]: e.target.value }))}
                placeholder="2–3 sentences. Not used for selection: it goes to your meeting as the first topic."
                className="mt-2 min-h-20 bg-card"
              />
            </div>
            {c.task && (
              <div className="border-t border-border px-5 py-4">
                <label className="block text-sm font-medium" htmlFor={`task-${c.id}`}>
                  Task from {c.name} <span className="font-normal text-muted-foreground">(optional, about {TASK_MINUTES} minutes)</span>
                </label>
                <p className="mt-2 border-l-2 border-border pl-3 text-sm leading-relaxed whitespace-pre-line">{c.task}</p>
                <Textarea
                  id={`task-${c.id}`}
                  value={taskAnswers[c.id] ?? ""}
                  onChange={(e) => setTaskAnswers((s) => ({ ...s, [c.id]: e.target.value }))}
                  placeholder="Use a project from your own work. You will walk the company through your answer at the start of the meeting."
                  className="mt-3 min-h-28 bg-card"
                />
                <label className="mt-3 flex items-start gap-2.5 text-sm">
                  <Checkbox checked={taskAi[c.id] ?? false} onCheckedChange={(v) => setTaskAi((s) => ({ ...s, [c.id]: v === true }))} className="mt-0.5" />
                  <span>
                    I used an AI tool to help write this answer{" "}
                    <span className="text-muted-foreground">(allowed: the company sees that you said so)</span>
                  </span>
                </label>
              </div>
            )}
          </section>
        ))}

        {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button size="lg" disabled={!cvParsed || pending || !!busy} onClick={send}>
            Send application
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
          An AI model on the event&apos;s EU server reads your documents to fill in the table. It never scores or ranks you.
          Organisers decide without seeing your name.
        </p>
      </div>
    </div>
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
