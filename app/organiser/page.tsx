import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { requireOrganiserPage } from "@/lib/auth";
import { formatDateRange, formatDay } from "@/lib/matchready/event";
import { getOverview } from "@/lib/matchready/organiser";

const fmt = (iso: string) => formatDay(iso, "short");

/** Organiser home: where the event is in the process, and what needs attention. */
export default async function OrganiserOverview() {
  await connection(); // live data, never prerendered
  await requireOrganiserPage("/organiser");
  const o = await getOverview();
  const today = new Date().toISOString().slice(0, 10);
  const confirmed = o.companies.filter((c) => c.cardStatus === "confirmed");
  const placesTotal = confirmed.reduce((n, c) => n + c.places, 0);

  const steps = [
    { label: "Companies register", date: null, until: o.event.companyDeadline },
    { label: "Company deadline", date: o.event.companyDeadline },
    { label: "Applications close", date: o.event.applicationDeadline },
    { label: "Selection and Tavata codes", date: o.event.decisionDate },
    { label: "Event", date: o.event.startsOn },
  ];
  const current = steps.findIndex((s) => s.date && today <= s.date);

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border bg-card px-6 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Overview</p>
            <h1 className="title-panel">{o.event.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateRange(o.event.startsOn, o.event.endsOn, { year: true })}, {o.event.format.charAt(0).toLowerCase() + o.event.format.slice(1)}. Fields:{" "}
              {o.event.fields.join(", ")}
            </p>
          </div>
          {o.event.infoUrl && (
            <a href={o.event.infoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              Public event page <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>

        <ol className="mt-5 grid gap-2 sm:grid-cols-5" aria-label="Event timeline">
          {steps.map((s, i) => {
            const state = current === -1 ? "done" : i < current ? "done" : i === current ? "now" : "next";
            return (
              <li key={s.label} className="flex flex-col gap-1.5">
                <span
                  className={`h-1.5 rounded-full ${state === "done" ? "bg-status-confirmed" : state === "now" ? "bg-primary" : "bg-muted"}`}
                />
                <span className={`text-sm ${state === "next" ? "text-muted-foreground" : "font-medium"}`}>{s.label}</span>
                <span className="text-xs text-muted-foreground">
                  {s.date ? fmt(s.date) : `until ${fmt(s.until!)}`}
                  {state === "now" && " (now)"}
                </span>
              </li>
            );
          })}
        </ol>
      </header>

      <div className="space-y-6 p-6">
        <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Company cards confirmed" value={`${confirmed.length} / ${o.companies.length}`} />
          <Stat label="People in the talent pool" value={String(o.poolSize)} />
          <Stat label="Applications" value={String(o.applications)} />
          <Stat label="Meeting places filled" value={`${o.approved} / ${placesTotal}`} />
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="font-semibold">Companies</h2>
            <span className="text-sm text-muted-foreground">Selection opens per company once its card is confirmed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-2.5 font-medium">Company</th>
                  <th className="px-5 py-2.5 font-medium">Field</th>
                  <th className="px-5 py-2.5 font-medium">Card</th>
                  <th className="px-5 py-2.5 font-medium">Applications</th>
                  <th className="px-5 py-2.5 font-medium">Places filled</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {o.companies.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.roleTitle}</div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{c.field}</td>
                    <td className="px-5 py-3">
                      {c.cardStatus === "confirmed" ? (
                        <span className="rounded-full bg-status-confirmed-bg px-2.5 py-0.5 text-xs font-medium text-status-confirmed">Confirmed</span>
                      ) : (
                        <span className="rounded-full bg-status-ai-bg px-2.5 py-0.5 text-xs font-medium text-status-ai">Draft, not confirmed</span>
                      )}
                    </td>
                    <td className="px-5 py-3 tabular-nums">{c.applications}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-status-confirmed" style={{ width: `${Math.min(100, (c.approved / c.places) * 100)}%` }} />
                        </div>
                        <span className="tabular-nums text-muted-foreground">
                          {c.approved} / {c.places}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {c.applications > 0 ? (
                        <Link href={`/organiser/review/${c.id}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                          Review <ArrowRight className="size-3.5" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">No applications yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Event results</h2>
            <p className="mt-1 text-sm text-muted-foreground">Organiser time per place, and how many meetings both sides want to continue.</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Organiser minutes per filled place</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {o.minutesPerPlace === null ? "–" : o.minutesPerPlace < 1 ? "< 1" : o.minutesPerPlace.toFixed(1)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Meetings where both want to continue</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {o.bothYesRate === null ? "–" : `${Math.round(o.bothYesRate * 100)}%`}
                </dd>
                {o.bothYesRate === null && <p className="text-xs text-muted-foreground">Available after the event</p>}
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Talent pool by field</h2>
            <p className="mt-1 text-sm text-muted-foreground">People choose their fields themselves. Nobody is selected at this stage.</p>
            <ul className="mt-4 space-y-3">
              {o.poolByField.map((f) => (
                <li key={f.field} className="grid grid-cols-[minmax(0,1fr)_120px_2.5rem] items-center gap-3 text-sm">
                  <span className="truncate">{f.field}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(f.count / Math.max(1, o.poolSize)) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">{f.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
