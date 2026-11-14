import { ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { requireOrganiserPage } from "@/lib/auth";
import { EVENT, formatDateRange } from "@/lib/matchready/event";
import { getFeedbackDashboard } from "@/lib/matchready/feedback";

/** Metric 2 after the event: meetings where both sides want to continue. Aggregates only. */
export default async function FeedbackDashboardPage() {
  await connection();
  await requireOrganiserPage("/organiser/feedback");
  const d = await getFeedbackDashboard();
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border bg-card px-6 py-5">
        <p className="text-sm text-muted-foreground">After the event</p>
        <h1 className="title-panel">Meeting feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Right after each 1:1 meeting both sides answer one question: “Want to continue the conversation?”
        </p>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold">Meetings where both sides want to continue</h2>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-6xl font-semibold tabular-nums">{pct(d.bothYes, d.meetings)}%</span>
            <span className="text-muted-foreground">
              {d.bothYes} of {d.meetings} meetings
            </span>
          </div>
          {d.oneSideOnly > 0 && <p className="mt-1 text-sm text-muted-foreground">{d.oneSideOnly} more waiting for the other side to answer.</p>}

          <h3 className="mt-8 text-sm font-medium text-muted-foreground">Per company</h3>
          <ul className="mt-3 space-y-4">
            {d.perCompany.map((c) => (
              <li key={c.company}>
                <div className="mb-1.5 flex justify-between gap-3 text-sm">
                  <span className="font-medium">{c.company}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {pct(c.bothYes, c.meetings)}% ({c.bothYes} of {c.meetings})
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-status-confirmed" style={{ width: `${pct(c.bothYes, c.meetings)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            Shown per company only. Answers are never shown per person and never affect anyone&apos;s future admission.
          </p>
        </section>

        <aside className="space-y-4">
          {d.demoMeeting && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold">Try the question</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {d.demoMeeting.company} met candidate {d.demoMeeting.candidateCode}. Answer for each side to see the rate change.
              </p>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <Link href={`/meeting/${encodeURIComponent(d.demoMeeting.applicationId)}?side=candidate`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  Answer as the candidate <ArrowRight className="size-3.5" />
                </Link>
                <Link href={`/meeting/${encodeURIComponent(d.demoMeeting.applicationId)}?side=company`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  Answer as the company <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          )}
          <p className="px-1 text-xs text-muted-foreground">Synthetic demo data: the event takes place on {formatDateRange(EVENT.startsOn, EVENT.endsOn, { year: true })}.</p>
        </aside>
      </div>
    </div>
  );
}
