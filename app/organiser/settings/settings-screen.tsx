"use client";

import { Check, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveEventSettings, type SaveResult } from "@/lib/matchready/event-settings-actions";

interface Values {
  name: string;
  format: string;
  startsOn: string;
  endsOn: string;
  companyDeadline: string;
  applicationDeadline: string;
  decisionDate: string;
  infoUrl: string;
  fields: string[];
  workTypes: string[];
}

const DATES: { key: keyof Values; label: string; hint: string }[] = [
  { key: "companyDeadline", label: "Company deadline", hint: "Companies confirm their cards" },
  { key: "applicationDeadline", label: "Applications close", hint: "Professionals apply to companies" },
  { key: "decisionDate", label: "Decision day", hint: "Organisers approve; codes go to Tavata" },
  { key: "startsOn", label: "Event starts", hint: "First meeting day" },
  { key: "endsOn", label: "Event ends", hint: "Last meeting day" },
];

export function SettingsScreen({ initial, usage }: { initial: Values; usage: { fields: Record<string, number>; workTypes: Record<string, number> } }) {
  const [v, setV] = useState(initial);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setV((old) => ({ ...old, [key]: value }));
    setResult(null);
  };
  const changed = JSON.stringify(v) !== JSON.stringify(initial);

  return (
    <form
      className="grid gap-6 p-6 xl:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => setResult(await saveEventSettings(v)));
      }}
    >
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">The event</h2>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            <span className="mb-1.5 block">Name</span>
            <Input value={v.name} onChange={(e) => set("name", e.target.value)} required className="bg-card font-normal" />
          </label>
          <label className="block text-sm font-medium">
            <span className="mb-1.5 block">Format and language</span>
            <Input value={v.format} onChange={(e) => set("format", e.target.value)} required placeholder="Online, in English" className="bg-card font-normal" />
          </label>
          <label className="block text-sm font-medium">
            <span className="mb-1.5 block">Official event page (optional)</span>
            <Input type="url" value={v.infoUrl} onChange={(e) => set("infoUrl", e.target.value)} placeholder="https://www.espoo.fi/…" className="bg-card font-normal" />
          </label>
        </div>

        <h2 className="mt-8 font-semibold">Dates</h2>
        <div className="mt-4 divide-y divide-border">
          {DATES.map(({ key, label, hint }) => (
            <label key={key} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <span>
                <span className="block font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </span>
              <Input type="date" value={v[key] as string} onChange={(e) => set(key, e.target.value as never)} required className="w-44 bg-card font-normal" />
            </label>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        <ListEditor
          title="Fields"
          hint="Companies pick one; professionals pick the ones they work in. A field in use cannot be removed."
          items={v.fields}
          usage={usage.fields}
          usageLabel={(n) => `${n} in use`}
          onChange={(xs) => set("fields", xs)}
        />
        <ListEditor
          title="Types of work"
          hint="The choices on the talent-pool form. One in use cannot be removed."
          items={v.workTypes}
          usage={usage.workTypes}
          usageLabel={(n) => `${n} ${n === 1 ? "person" : "people"}`}
          onChange={(xs) => set("workTypes", xs)}
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          {result && !result.ok && (
            <p role="alert" className="mr-auto text-sm text-destructive">
              {result.error}
            </p>
          )}
          {result?.ok && (
            <p role="status" className="mr-auto flex items-center gap-1.5 text-sm text-status-confirmed">
              <Check className="size-4" /> Saved. Every page now shows these values.
            </p>
          )}
          <Button type="button" variant="ghost" disabled={!changed || pending} onClick={() => { setV(initial); setResult(null); }}>
            Undo changes
          </Button>
          <Button type="submit" disabled={!changed || pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ListEditor({
  title,
  hint,
  items,
  usage,
  usageLabel,
  onChange,
}: {
  title: string;
  hint: string;
  items: string[];
  usage: Record<string, number>;
  usageLabel: (n: number) => string;
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const x = draft.trim();
    if (x && !items.includes(x)) onChange([...items, x]);
    setDraft("");
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      <ul className="mt-4 divide-y divide-border">
        {items.map((item) => {
          const n = usage[item] ?? 0;
          return (
            <li key={item} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>{item}</span>
              <span className="flex items-center gap-2">
                {n > 0 && <span className="text-xs text-muted-foreground tabular-nums">{usageLabel(n)}</span>}
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={n > 0}
                  aria-label={`Remove ${item}`}
                  title={n > 0 ? "In use" : "Remove"}
                  onClick={() => onChange(items.filter((x) => x !== item))}
                >
                  <X />
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={`Add to ${title.toLowerCase()}`}
          className="bg-card font-normal"
        />
        <Button type="button" variant="outline" className="bg-card" disabled={!draft.trim()} onClick={add}>
          <Plus data-icon="inline-start" /> Add
        </Button>
      </div>
    </section>
  );
}
