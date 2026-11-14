import { ArrowRight, Building2, ExternalLink, FileCheck2, Lock, Scale, UserRound, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { MAX_COMPANIES_PER_CANDIDATE } from "@/lib/matchready/config";
import { EVENT, formatDateRange, formatDay } from "@/lib/matchready/event";

/**
 * Landing page of the real event, with the three ways in. Static on purpose: the event facts are
 * public (espoo.fi) and come from lib/matchready/event.ts, so this page never depends on the database.
 */

const NUMBER_WORD = ["zero", "one", "two", "three", "four", "five"];
const maxCompanies = NUMBER_WORD[MAX_COMPANIES_PER_CANDIDATE] ?? String(MAX_COMPANIES_PER_CANDIDATE);

const ENTRIES = [
  {
    href: "/company",
    icon: Building2,
    who: "Companies",
    title: "Tell us who you want to meet",
    body: "Paste a job ad, a link or two lines. You get a card with clear must-haves. You check and confirm it.",
    when: `Confirm by ${formatDay(EVENT.companyDeadline)}`,
    cta: "Create your card",
  },
  {
    href: "/candidate",
    icon: UserRound,
    who: "Professionals",
    title: "Join the talent pool",
    body: `One minute now. When companies have confirmed, choose up to ${maxCompanies} and show where you meet what they ask for.`,
    when: `Apply by ${formatDay(EVENT.applicationDeadline)}`,
    cta: "Join the pool",
  },
  {
    href: "/organiser",
    icon: Users,
    who: "Organisers",
    title: "Decide who gets a meeting pass",
    body: "Blind review with facts next to each requirement. Clean cases in one click, every decision logged.",
    when: `Decide on ${formatDay(EVENT.decisionDate)}`,
    cta: "Open workspace",
  },
];

const STEPS = [
  { date: "Now", label: "Companies confirm their cards; professionals join the pool" },
  { date: formatDay(EVENT.companyDeadline, "short"), label: "Company deadline: invitations go out by field" },
  { date: formatDay(EVENT.applicationDeadline, "short"), label: `Applications close: CV and proof for up to ${maxCompanies} companies` },
  { date: formatDay(EVENT.decisionDate, "short"), label: "Organisers decide; approved people get their Tavata code" },
  { date: formatDateRange(EVENT.startsOn, EVENT.endsOn, { month: "short" }), label: "1:1 meetings on Tavata, then one yes/no question each" },
];

const PRINCIPLES = [
  { icon: Scale, title: "People decide", body: "AI structures, pre-fills and points out differences. It never scores, ranks or rejects anyone." },
  { icon: FileCheck2, title: "Facts, not polished text", body: "Organisers select on employers, dates, degrees and proof. What you write in your own words goes to the meeting, not to selection." },
  { icon: Lock, title: "Data stays in the EU", body: "Candidate documents are read by an open model on the event's own EU server. Names stay hidden during review." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto max-w-6xl px-5 pt-6 pb-32">
          <div className="flex items-center justify-between text-sm">
            <Image src={BRAND.logoOnDark.src} width={BRAND.logoOnDark.width} height={BRAND.logoOnDark.height} alt={BRAND.name} preload className="h-11 w-auto" />
            <span className="text-sidebar-muted">Prototype for the City of Espoo</span>
          </div>

          <div className="mt-16 max-w-3xl">
            <p className="text-sidebar-muted">Registration and selection for the 1:1 meetings</p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">{EVENT.name}</h1>
            <p className="mt-5 text-lg text-sidebar-muted">
              {formatDateRange(EVENT.startsOn, EVENT.endsOn, { year: true })}, {EVENT.format.charAt(0).toLowerCase() + EVENT.format.slice(1)}
              <br />
              {EVENT.fields.join(", ")}
            </p>
            <p className="mt-6 max-w-[56ch] text-lg leading-relaxed">
              Meeting places are limited. Companies say what they need, professionals show where they meet it, organisers
              decide.
            </p>
            <a
              href={EVENT.infoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-sidebar-muted underline-offset-4 hover:text-sidebar-foreground hover:underline"
            >
              Official event page on {EVENT.infoUrlLabel} <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </section>

      <section aria-label="Ways in" className="mx-auto -mt-20 grid max-w-6xl gap-4 px-5 md:grid-cols-3">
        {ENTRIES.map(({ href, icon: Icon, who, title, body, when, cta }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgb(1_17_53/0.06),0_8px_24px_-12px_rgb(1_17_53/0.25)] transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-primary">
              <Icon className="size-4" /> {who}
            </span>
            <span className="mt-3 text-xl font-semibold tracking-tight">{title}</span>
            <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</span>
            <span className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">{when}</span>
              <span className="inline-flex items-center gap-1 font-medium text-primary">
                {cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </span>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.date} className="border-t-2 border-border pt-3 first:border-primary">
              <span className={`text-sm font-semibold tabular-nums ${i === 0 ? "text-primary" : ""}`}>{s.date}</span>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.label}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="size-5 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-5 py-6 text-center text-xs text-muted-foreground">
        {BRAND.name} prototype built at Junction 2026 for the City of Espoo challenge “Rethinking Recruitment”. The event is real; every
        company and person in this prototype is fictional.
      </footer>
    </div>
  );
}
