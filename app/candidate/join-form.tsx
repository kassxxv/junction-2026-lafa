"use client";

import { Check, FileUp, Plus, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { joinTalentPool, readCvForPool } from "@/lib/matchready/candidate-actions";
import { MAX_COMPANIES_PER_CANDIDATE } from "@/lib/matchready/config";
import { DEMO_CANDIDATE } from "@/lib/matchready/demo";
import { formatDay } from "@/lib/matchready/event";

type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native";
const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2", "Native"];
const fmtDate = (iso: string) => formatDay(iso);

export function JoinForm({
  fields,
  workTypes,
  stages,
  confirmed,
  companyDeadline,
}: {
  fields: string[];
  workTypes: string[];
  stages: { id: string; label: string }[];
  confirmed: { name: string; field: string }[];
  companyDeadline: string;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>([]);
  const [workType, setWorkType] = useState(workTypes[0]);
  const [stage, setStage] = useState("experienced");
  const [langs, setLangs] = useState<{ language: string; level: Level }[]>([{ language: "English", level: "C1" }]);
  const [email, setEmail] = useState("");
  const [cv, setCv] = useState<{ name: string; text: string } | null>(null);
  const [consentEvent, setConsentEvent] = useState(false);
  const [consentPool, setConsentPool] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function uploadCv(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const r = await readCvForPool(fd);
      if (r.ok) setCv({ name: file.name, text: r.text });
      else setError(r.error);
    });
  }

  function join() {
    setError(null);
    startTransition(async () => {
      const r = await joinTalentPool({
        fields: chosen,
        workType,
        stage: stage as "student" | "early" | "experienced" | "senior",
        languages: langs.filter((l) => l.language.trim()),
        email,
        consentEvent: consentEvent as true,
        consentPool,
        cvText: cv?.text ?? null,
      });
      if (r.ok) router.push(`/candidate/${encodeURIComponent(r.id)}`);
      else setError(r.error);
    });
  }

  return (
    <div className="page-wide grid gap-6 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h1 className="title-page">Join the talent pool</h1>
        <p className="mt-2 max-w-[58ch] text-muted-foreground">
          About one minute. Nobody is selected here. You choose companies later, when you know who is coming.
        </p>

        <div className="mt-8 space-y-7">
          <div>
            <p className="mb-2 text-sm font-medium">Which parts of the event interest you?</p>
            <div className="flex flex-wrap gap-2">
              {fields.map((f) => {
                const on = chosen.includes(f);
                return (
                  <button
                    key={f}
                    aria-pressed={on}
                    onClick={() => setChosen((c) => (on ? c.filter((x) => x !== f) : [...c, f]))}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-input"}`}
                  >
                    {on && <Check className="size-3.5" />}
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              <span className="mb-1.5 block">Type of work</span>
              <NativeSelect value={workType} onChange={(e) => setWorkType(e.target.value)}>
                {workTypes.map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </NativeSelect>
            </label>
            <label className="text-sm font-medium">
              <span className="mb-1.5 block">Career stage</span>
              <NativeSelect value={stage} onChange={(e) => setStage(e.target.value)}>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Languages</p>
            <ul className="space-y-2">
              {langs.map((l, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Input value={l.language} onChange={(e) => setLangs(langs.map((x, j) => (j === i ? { ...x, language: e.target.value } : x)))} aria-label="Language" className="max-w-56 bg-card" />
                  <NativeSelect wrapperClassName="w-28" value={l.level} onChange={(e) => setLangs(langs.map((x, j) => (j === i ? { ...x, level: e.target.value as Level } : x)))} aria-label="Level">
                    {LEVELS.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </NativeSelect>
                  {langs.length > 1 && (
                    <Button size="icon-sm" variant="ghost" aria-label="Remove language" onClick={() => setLangs(langs.filter((_, j) => j !== i))}>
                      <X />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => setLangs([...langs, { language: "", level: "B1" }])}>
              <Plus data-icon="inline-start" /> Add language
            </Button>
          </div>

          <label className="block text-sm font-medium">
            <span className="block">Email</span>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5 max-w-80 bg-card font-normal" />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">Only for updates about this event.</span>
          </label>

          <div>
            <p className="text-sm font-medium">Your CV (optional now)</p>
            <p className="mb-2 text-xs text-muted-foreground">Needed when you apply. We reuse it.</p>
            {cv ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-status-confirmed-bg px-3 py-1.5 text-sm text-status-confirmed">
                <Check className="size-4" /> {cv.name}
                <button aria-label="Remove CV" onClick={() => setCv(null)} className="ml-1 opacity-70 hover:opacity-100">
                  <X className="size-3.5" />
                </button>
              </span>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 py-2 text-sm hover:bg-muted/40">
                <FileUp className="size-4" /> Upload CV (PDF)
                <input type="file" accept=".pdf,.txt" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadCv(e.target.files[0])} />
              </label>
            )}
          </div>

          <div className="space-y-3 rounded-lg bg-muted/40 p-4">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={consentEvent} onCheckedChange={(v) => setConsentEvent(v === true)} className="mt-0.5" />
              <span>
                Use my data to organise this event <span className="text-muted-foreground">(required)</span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={consentPool} onCheckedChange={(v) => setConsentPool(v === true)} className="mt-0.5" />
              <span>
                Keep me in the talent pool for future events for 12 months <span className="text-muted-foreground">(optional)</span>
              </span>
            </label>
          </div>
        </div>

        {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button size="lg" disabled={!consentEvent || !chosen.length || !email || pending} onClick={join}>
            {pending ? "Joining…" : "Join talent pool"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setChosen(fields.includes(DEMO_CANDIDATE.field) ? [DEMO_CANDIDATE.field] : fields.slice(0, 1));
              setLangs(DEMO_CANDIDATE.languages);
              setEmail(DEMO_CANDIDATE.email());
              setConsentEvent(true);
            }}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Fill demo answers
          </button>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Confirmed so far</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Companies confirm what they need until {fmtDate(companyDeadline)}. Then you choose up to {MAX_COMPANIES_PER_CANDIDATE}.
          </p>
          <ul className="mt-4 space-y-3">
            {confirmed.map((c) => (
              <li key={c.name} className="text-sm">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.field}</div>
              </li>
            ))}
          </ul>
        </div>
        <p className="flex gap-2 px-1 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          When you apply, an open AI model on our own EU server reads your CV to fill in the table. It never scores or ranks you.
          Organisers decide without seeing your name.
        </p>
      </aside>
    </div>
  );
}
