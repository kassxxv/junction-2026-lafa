"use client";

import { Check, Handshake } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { answerMeeting } from "@/lib/matchready/feedback-actions";
import type { MeetingView } from "@/lib/matchready/feedback";

export function MeetingQuestion({ meeting, side }: { meeting: MeetingView; side: "company" | "candidate" }) {
  const mine = meeting.answers[side];
  const [result, setResult] = useState<{ bothYes: boolean; waiting: boolean; yes: boolean } | null>(
    mine === null ? null : { yes: mine, bothYes: mine && meeting.answers[side === "company" ? "candidate" : "company"] === true, waiting: meeting.answers[side === "company" ? "candidate" : "company"] === null },
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const otherSide = side === "company" ? "candidate" : "company";
  const other = side === "company" ? `candidate ${meeting.candidateCode}` : meeting.company;

  function answer(yes: boolean) {
    startTransition(async () => {
      const r = await answerMeeting(meeting.applicationId, side, yes);
      if (r.ok) setResult({ yes, bothYes: r.bothYes, waiting: r.waiting });
      else setError(r.error);
    });
  }

  return (
    <div className="page-narrow px-5 py-14">
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-medium text-primary">Right after the meeting</p>
        <p className="mt-2 text-lg font-semibold tracking-tight">
          {meeting.company} <span className="text-muted-foreground">×</span> Candidate {meeting.candidateCode}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Both sides answer the same question.</p>

        {result ? (
          <div className="mt-8">
            {result.bothYes ? (
              <>
                <Handshake className="mx-auto size-10 text-status-confirmed" />
                <p className="mt-3 text-lg font-semibold">You both want to continue</p>
                <p className="mt-1 text-sm text-muted-foreground">We will share your contact details with each other.</p>
              </>
            ) : (
              <>
                <Check className="mx-auto size-10 rounded-full bg-status-confirmed-bg p-2 text-status-confirmed" />
                <p className="mt-3 text-lg font-semibold">Thanks, noted</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.yes && result.waiting
                    ? `If ${other} also says yes, you both get each other's contact details.`
                    : "Your answer only counts towards the event's meeting statistics. It is never shown as a judgement of anyone."}
                </p>
              </>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
              <Link href={`/meeting/${encodeURIComponent(meeting.applicationId)}?side=${otherSide}`} className="text-primary hover:underline">
                Demo: answer as the {otherSide}
              </Link>
              <Link href="/organiser/feedback" className="text-muted-foreground hover:text-foreground hover:underline">
                See the organiser dashboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="title-page mt-10">Want to continue the conversation?</h1>
            <div className="mt-6 flex justify-center gap-3">
              <Button size="lg" disabled={pending} onClick={() => answer(true)} className="min-w-28">
                Yes
              </Button>
              <Button size="lg" variant="outline" disabled={pending} onClick={() => answer(false)} className="min-w-28 bg-card">
                No
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Answering as the {side}. Contact details are shared only if both of you say yes.
            </p>
          </>
        )}
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
