"use client";

import { Check, FileUp, Info, Loader2, Paperclip, Plus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Timeline } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveLinkedin, sendApplications, uploadDocument } from "@/lib/matchready/candidate-actions";
import type { EvidenceRow } from "@/lib/matchready/candidate-service";
import { DEMO_CANDIDATE } from "@/lib/matchready/demo";
import { needsLook, type LinkedinCheck, type RequirementType } from "@/lib/matchready/facts";

type ProofType = "diploma" | "certificate" | "link" | "reference";
const PROOF_FOR: Record<RequirementType, { type: ProofType; label: string; placeholder: string }> = {
  education: { type: "diploma", label: "Diploma", placeholder: "File name or link to your diploma" },
  language: { type: "certificate", label: "Certificate", placeholder: "Language certificate (file name or link)" },
  has_done: { type: "link", label: "Link", placeholder: "GitHub, publication or project link" },
  experience: { type: "reference", label: "Reference", placeholder: "Reference letter (file name or link)" },
};

const CHECK_LABEL: Record<LinkedinCheck["kind"], { label: string; className: string }> = {
  match: { label: "MATCH", className: "text-status-confirmed" },
  differs: { label: "DIFFERS", className: "text-status-ai" },
  not_found: { label: "NOT FOUND", className: "text-status-missing" },
  linkedin_only: { label: "LINKEDIN ONLY", className: "text-muted-foreground" },
  info: { label: "NOTE", className: "text-muted-foreground" },
  none: { label: "NO LINKEDIN", className: "text-muted-foreground" },
};

interface Company {
  id: string;
  name: string;
  role: string;
  starter: string;
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
      if (!r.parsed) setNotice("Our reader could not fill everything in. Please check the table and type what is missing.");
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
        applications: companies.map((c) => ({ companyId: c.id, starter: starters[c.id] ?? "", stated: stated[c.id] ?? {}, proofs: proofs[c.id] ?? {} })),
      });
      if (r.ok) router.push(`/candidate/${encodeURIComponent(candidateId)}`);
      else setError(r.error);
    });
  }

  const rowsFor = (companyId: string) => preview.find((p) => p.companyId === companyId)?.rows ?? [];
  const toCheck = checks.filter(needsLook).length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <p className="text-sm font-medium text-primary">Stage 2 · Your application</p>
        <Timeline stage={2} />
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Show where you meet each requirement</h1>
        <p className="mt-1 max-w-[62ch] text-muted-foreground">
          Only what your chosen companies ask for. Proof is optional: without it, the organiser sees “stated by candidate”.
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
              doneText="CV read · table filled in below"
              actions={
                <>
                  {stage1Cv && (
                    <Button size="sm" onClick={() => upload("cv", null, true)} disabled={!!busy}>
                      Use the CV from Stage 1
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
              doneText={toCheck ? `Compared with your CV · ${toCheck} ${toCheck === 1 ? "difference" : "differences"} for the organiser to ask about` : "Compared with your CV · no differences"}
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
            On LinkedIn: More → Save to PDF. We compare it with your CV only to point out differences to the organiser. No
            LinkedIn? That never lowers your chances.
          </p>
        </section>

        {liParsed && checks.length > 0 && (
          <section className="mt-6 rounded-xl border border-border">
            <h2 className="border-b border-border px-5 py-3 font-semibold">What the organiser will see about your CV and LinkedIn</h2>
            <ul className="divide-y divide-border">
              {checks.map((c, i) => (
                <li key={i} className="flex gap-3 px-5 py-2.5 text-sm">
                  <span className={`w-28 shrink-0 text-xs font-semibold ${CHECK_LABEL[c.kind].className}`}>{CHECK_LABEL[c.kind].label}</span>
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
                    <th className="w-16 px-2 py-2.5" />
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
                          {r.mustHave && <span className="rounded bg-status-ask-bg px-1.5 py-0.5 text-[0.7rem] font-semibold text-status-ask">MUST</span>}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={value}
                            disabled={!cvParsed}
                            onChange={(e) => setStated((s) => ({ ...s, [c.id]: { ...(s[c.id] ?? {}), [r.id]: e.target.value } }))}
                            placeholder={!cvParsed ? "Upload your CV to prefill, or type here" : missing ? "Not found in your CV. Add it if you have it." : ""}
                            className={`h-8 bg-card ${missing && !value ? "border-status-ai/60 placeholder:text-status-ai" : ""}`}
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
          </section>
        ))}

        {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button size="lg" disabled={!cvParsed || pending || !!busy} onClick={send}>
            Send application
          </Button>
          <button
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            onClick={() =>
              setStarters(
                Object.fromEntries(
                  companies.map((c) => [c.id, DEMO_CANDIDATE.starter]),
                ),
              )
            }
          >
            Fill demo answers
          </button>
          {!cvParsed && <span className="text-sm text-muted-foreground">Upload your CV to send.</span>}
        </div>
        <p className="mt-6 flex gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          Your documents are read by an AI model on the event&apos;s own server in the EU. It only fills in the table; it
          never scores or ranks you. Organisers decide, and they see you without your name.
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
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-status-confirmed-bg px-2.5 py-1 text-sm text-status-confirmed">
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
