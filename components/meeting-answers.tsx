"use client";

import { Check, Handshake } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { MeetingAnswerResult } from "@/lib/matchready/meeting-actions";
import type { MeetingItem } from "@/lib/matchready/meetings";

/**
 * After the event: one question per meeting, the same for both sides. Each side sees its own answer and, when
 * both said yes, that the organisers will connect them. A "no" from the other side is never shown.
 */
export function MeetingAnswers({
  meetings,
  answer,
  empty,
}: {
  meetings: MeetingItem[];
  answer: (applicationId: string, yes: boolean) => Promise<MeetingAnswerResult>;
  empty?: string;
}) {
  if (!meetings.length) return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {meetings.map((m) => (
        <MeetingRow key={m.applicationId} meeting={m} answer={answer} />
      ))}
    </ul>
  );
}

function MeetingRow({ meeting, answer }: { meeting: MeetingItem; answer: (applicationId: string, yes: boolean) => Promise<MeetingAnswerResult> }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const send = (yes: boolean) =>
    startTransition(async () => {
      setError(null);
      const r = await answer(meeting.applicationId, yes);
      if (!r.ok) setError(r.error);
    });

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="font-medium">{meeting.title}</div>
        {meeting.subtitle && <div className="text-sm text-muted-foreground">{meeting.subtitle}</div>}
        {error && <div className="mt-1 text-sm text-destructive">{error}</div>}
      </div>
      {meeting.bothYes ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-status-confirmed-bg px-3 py-1 text-sm font-medium text-status-confirmed">
          <Handshake className="size-4" /> You both want to continue. The organisers will connect you.
        </span>
      ) : meeting.myAnswer !== null ? (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Check className="size-4" /> You answered {meeting.myAnswer ? "yes" : "no"}
          <button type="button" disabled={pending} onClick={() => send(!meeting.myAnswer)} className="ml-2 underline-offset-4 hover:text-foreground hover:underline">
            Change
          </button>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Want to continue?</span>
          <Button size="sm" disabled={pending} onClick={() => send(true)}>
            Yes
          </Button>
          <Button size="sm" variant="outline" className="bg-card" disabled={pending} onClick={() => send(false)}>
            No
          </Button>
        </span>
      )}
    </li>
  );
}
