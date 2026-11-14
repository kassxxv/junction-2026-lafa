import { ArrowRight, Check, Clock, Ticket } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PublicShell, Timeline } from "@/components/public-shell";
import { getCandidate } from "@/lib/matchready/candidate-service";
import { MAX_COMPANIES_PER_CANDIDATE } from "@/lib/matchready/config";
import { formatDateRange, formatDay } from "@/lib/matchready/event";
import { getEvent } from "@/lib/matchready/organiser";

const fmt = (iso: string) => formatDay(iso);

/** Candidate status: where you are, what happens next and when. Shows the Tavata code once approved. */
export default function CandidateStatusPage(props: PageProps<"/candidate/[id]">) {
  return (
    <PublicShell right="For professionals">
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <Content {...props} />
      </Suspense>
    </PublicShell>
  );
}

async function Content({ params }: PageProps<"/candidate/[id]">) {
  await connection();
  const { id } = await params;
  const [c, event] = await Promise.all([getCandidate(decodeURIComponent(id)), getEvent()]);
  if (!c) notFound();
  const base = `/candidate/${encodeURIComponent(c.id)}`;
  const applied = c.applications.length > 0;
  const decided = c.applications.some((a) => a.status !== "submitted");
  const approved = c.applications.filter((a) => a.status === "approved");

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-status-confirmed-bg px-3 py-1 text-sm font-medium text-status-confirmed">
          <Check className="size-4" /> {applied ? "Application sent" : "You are in the talent pool"}
        </span>

        <Timeline stage={approved.length ? 4 : applied ? 3 : 1} />

        {!applied && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">What happens next</h1>
            <p className="mt-3 text-muted-foreground">
              Your fields: <strong className="text-foreground">{c.fields.join(", ")}</strong>.
            </p>
            <p className="mt-2 max-w-[60ch] text-muted-foreground">
              Companies confirm what they need until <strong className="text-foreground">{fmt(event.companyDeadline)}</strong>.
              Then you get one email with the companies in your fields and choose who you want to meet. No action needed
              until then.
            </p>
            <Link href={`${base}/choose`} className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm hover:bg-muted/50">
              Demo: jump to after the company deadline <ArrowRight className="size-4" />
            </Link>
          </>
        )}

        {applied && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{approved.length ? "You have a meeting pass" : "Waiting for organiser review"}</h1>
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {c.applications.map((a) => (
                <li key={a.companyId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="font-medium">{a.company}</div>
                    <div className="text-sm text-muted-foreground">{a.role}</div>
                  </div>
                  {a.status === "approved" ? (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-status-confirmed-bg px-3 py-1.5 text-sm font-medium text-status-confirmed">
                      <Ticket className="size-4" /> Tavata code <span className="font-mono tracking-wide">{a.accessCode}</span>
                    </span>
                  ) : a.status === "declined" ? (
                    <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">Program Pass: you can join the talks</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-4" /> In review
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-[60ch] text-sm text-muted-foreground">
              {approved.length
                ? `Use the code on Tavata to book your 1:1 meetings for ${formatDateRange(event.startsOn, event.endsOn)}.`
                : decided
                  ? "Some decisions are in. The rest follow by the date below."
                  : `You will hear back by ${fmt(event.decisionDate)}. If you are not selected for meetings, you can still join the talks with a Program Pass.`}
            </p>
            {c.applications.length < MAX_COMPANIES_PER_CANDIDATE && !decided && (
              <Link href={`${base}/choose`} className="mt-4 inline-flex text-sm text-primary hover:underline">
                Add another company
              </Link>
            )}
          </>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Your reference: {c.code}. Organisers see this code, not your name.
      </p>
    </div>
  );
}
