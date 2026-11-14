"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BackLink } from "@/components/back-link";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { addCandidateField } from "@/lib/matchready/candidate-actions";

interface Company {
  id: string;
  name: string;
  field: string | null;
  role: string;
  details: string | null;
  musts: string[];
  others: number;
}

export function ChooseForm({
  candidateId,
  fields,
  max,
  eventDates,
  mine,
  others,
}: {
  candidateId: string;
  fields: string[];
  max: number;
  eventDates: string;
  mine: Company[];
  others: { id: string; name: string; field: string }[];
  decisionDate: string;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [available, setAvailable] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const otherFields = [...new Set(others.map((o) => o.field))];

  function toggle(id: string) {
    setNote(null);
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= max) {
        setNote(`You can choose up to ${max}. Unselect one first.`);
        return p;
      }
      return [...p, id];
    });
  }

  return (
    <div className="page-form px-5 py-10">
      <BackLink href={`/candidate/${encodeURIComponent(candidateId)}`}>Back to your status</BackLink>
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <Timeline stage={2} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="title-page">
              {mine.length} {mine.length === 1 ? "company" : "companies"} confirmed in {fields.join(" and ")}
            </h1>
            <p className="mt-1 text-muted-foreground">Choose up to {max} you really want to meet.</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold tabular-nums">
              {picked.length} <span className="text-muted-foreground">/ {max}</span>
            </div>
            <div className="text-xs text-muted-foreground">chosen</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {mine.map((c) => {
            const on = picked.includes(c.id);
            return (
              <button
                key={c.id}
                aria-pressed={on}
                onClick={() => toggle(c.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${on ? "border-primary bg-accent/60 ring-1 ring-primary" : "border-border hover:border-input"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {c.role}
                      {c.details && `, ${c.details}`}
                    </div>
                  </div>
                  <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card"}`}>
                    {on && <Check className="size-3.5" />}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.musts.map((m) => (
                    <span key={m} className="rounded bg-status-ask-bg px-1.5 py-0.5 text-xs text-status-ask">
                      <span className="font-semibold">Must-have:</span> {m}
                    </span>
                  ))}
                  {c.others > 0 && <span className="px-1 text-xs text-muted-foreground">+ {c.others} nice to have</span>}
                </div>
              </button>
            );
          })}
          {!mine.length && <p className="text-muted-foreground">No company in your fields has confirmed yet.</p>}
        </div>
        {note && <p className="mt-3 text-sm text-status-ai">{note}</p>}

        {otherFields.length > 0 && (
          <p className="mt-5 text-sm text-muted-foreground">
            Not in your fields: {others.map((o) => `${o.name} (${o.field})`).join(", ")}.{" "}
            {otherFields.map((f) => (
              <button
                key={f}
                disabled={pending}
                onClick={() => startTransition(async () => { await addCandidateField(candidateId, f); router.refresh(); })}
                className="ml-1 text-primary hover:underline"
              >
                Add {f}
              </button>
            ))}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox checked={available} onCheckedChange={(v) => setAvailable(v === true)} />
            I am still available on {eventDates}
          </label>
          <Button
            size="lg"
            disabled={!picked.length || !available}
            onClick={() => router.push(`/candidate/${encodeURIComponent(candidateId)}/apply?companies=${picked.join(",")}`)}
          >
            Continue with {picked.length || ""} {picked.length === 1 ? "company" : "companies"}
          </Button>
        </div>
      </div>
    </div>
  );
}
