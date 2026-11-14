"use client";

import { Mail } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { sendMeetingReminders, type ReminderResult } from "@/lib/matchready/reminder-actions";

/** After the event: e-mail both sides of each meeting that has no answer yet, one company at a time. */
export function ReminderPanel({ companies }: { companies: { id: string; name: string; meetings: number; open: number; remindedAt: string | null }[] }) {
  const [companyId, setCompanyId] = useState(companies.find((c) => c.open > 0)?.id ?? companies[0]?.id ?? "");
  const [result, setResult] = useState<ReminderResult | null>(null);
  const [pending, startTransition] = useTransition();
  const chosen = companies.find((c) => c.id === companyId);

  if (!companies.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">Remind both sides</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        After the event, e-mail everyone who has not answered yet, with a link to their own page.
      </p>
      <NativeSelect className="mt-3" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setResult(null); }} aria-label="Company">
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}: {c.open} of {c.meetings} without both answers
          </option>
        ))}
      </NativeSelect>
      {chosen?.remindedAt && <p className="mt-1.5 text-xs text-muted-foreground">Last reminder sent {chosen.remindedAt}.</p>}
      <Button
        className="mt-3 w-full"
        disabled={pending || !chosen || chosen.open === 0}
        onClick={() => startTransition(async () => setResult(await sendMeetingReminders(companyId)))}
      >
        <Mail data-icon="inline-start" />
        {pending ? "Sending…" : chosen?.open === 0 ? "Everyone has answered" : "Send reminders"}
      </Button>

      {result && !result.ok && <p className="mt-3 text-sm text-destructive">{result.error}</p>}
      {result?.ok && (
        <div className="mt-3 space-y-2 text-sm">
          {result.previewOnly ? (
            <p className="text-muted-foreground">E-mail is not set up on this deployment, so nothing was sent. This is what would go out:</p>
          ) : (
            <p>
              Sent {result.delivered} {result.delivered === 1 ? "e-mail" : "e-mails"}
              {result.failed ? `, ${result.failed} failed` : ""}.
            </p>
          )}
          {result.preview.map((p) => (
            <details key={p.to + p.subject} className="rounded-lg border border-border px-3 py-2">
              <summary className="cursor-pointer">
                To {p.to}: <span className="text-muted-foreground">{p.subject}</span>
              </summary>
              <pre className="mt-2 font-sans text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{p.text}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
