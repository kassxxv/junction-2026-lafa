"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GOALS, STUB_INPUT, type GoalId } from "./stub-draft";

/** Stub progress: these become real steps when the AI route exists. */
const STEPS = ["Reading the job ad", "Reading your notes", "Filling in the card", "Checking every quote against the source"];

export function InputStep({ onDone }: { onDone: (goals: GoalId[]) => void }) {
  const [goals, setGoals] = useState<GoalId[]>(STUB_INPUT.goals);
  const [step, setStep] = useState(-1);
  const busy = step >= 0;

  function analyse() {
    STEPS.forEach((_, i) => setTimeout(() => setStep(i), i * 550));
    setTimeout(() => onDone(goals), STEPS.length * 550 + 250);
  }

  function toggle(id: GoalId) {
    setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <p className="mb-6 max-w-[60ch] text-muted-foreground">
        Paste whatever the company sent: a link to a job ad or their website, a long text, or just a few words. You will
        get the standard card back, with each value linked to where it came from and questions about what is missing.
      </p>

      <div className="space-y-7 rounded-xl border border-border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="company">Company name</Label>
          <Input id="company" defaultValue={STUB_INPUT.companyName} disabled={busy} />
        </div>

        <fieldset className="space-y-2" disabled={busy}>
          <legend className="text-sm font-medium">Why they come to the event</legend>
          <p className="text-sm text-muted-foreground">Pick all that apply. Leave empty if you don’t know.</p>
          <div className="grid gap-2 pt-1 sm:grid-cols-3">
            {GOALS.map((g) => (
              <label
                key={g.id}
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                  goals.includes(g.id) ? "border-primary/50 bg-accent/50" : "border-border hover:bg-muted/40"
                }`}
              >
                <Checkbox checked={goals.includes(g.id)} onCheckedChange={() => toggle(g.id)} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">{g.label}</span>
                  <span className="block text-xs leading-snug text-muted-foreground">{g.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="links">Links</Label>
          <Textarea id="links" rows={2} defaultValue={STUB_INPUT.links} disabled={busy} />
          <p className="text-sm text-muted-foreground">A job ad or the company website. One per line.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Text from the company, or your notes</Label>
          <Textarea id="notes" rows={6} defaultValue={STUB_INPUT.notes} disabled={busy} />
          <p className="text-sm text-muted-foreground">Any language. Long texts are fine.</p>
        </div>

        <div className="border-t border-border pt-5">
          {busy ? (
            <ol className="space-y-2" aria-live="polite">
              {STEPS.map((s, i) => (
                <li
                  key={s}
                  className={`flex items-center gap-2 text-sm ${i <= step ? "text-foreground" : "text-muted-foreground/60"}`}
                >
                  {i < step ? (
                    <Check className="size-4 text-status-confirmed" />
                  ) : i === step ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <span className="size-4" />
                  )}
                  {s}
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Prototype: this loads a sample draft, no AI is called.</span>
              <Button size="lg" onClick={analyse}>
                Create draft card
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
