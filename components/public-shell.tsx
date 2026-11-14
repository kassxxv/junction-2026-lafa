import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { EVENT, formatDateRange } from "@/lib/matchready/event";

/** Header + footer for public pages (companies and candidates). */
export function PublicShell({ right, children }: { right?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
          <span className="flex items-center gap-2.5">
            <Link href="/" aria-label={`${BRAND.name} home`} className="shrink-0 border-r border-border pr-3">
              <Image src={BRAND.logoOnLight.src} width={BRAND.logoOnLight.width} height={BRAND.logoOnLight.height} alt="" loading="eager" className="h-8 w-auto" />
            </Link>
            <span>
            <span className="font-semibold">{EVENT.name}</span>
            <span className="text-muted-foreground">
              , {formatDateRange(EVENT.startsOn, EVENT.endsOn, { year: true })}, {EVENT.place}
            </span>
            </span>
          </span>
          {right && <span className="text-muted-foreground">{right}</span>}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="px-5 py-6 text-center text-xs text-muted-foreground">
        {BRAND.name} prototype for the City of Espoo. The event is real; companies and people are fictional.
      </footer>
    </div>
  );
}

const STEPS = ["Talent pool", "Company deadline", "Choose companies", "Organiser review", "Meetings on Tavata"];

/** Where the candidate is in the process. `stage` = index of the current step. */
export function Timeline({ stage }: { stage: number }) {
  return (
    <ol className="my-6 grid grid-cols-5 gap-2" aria-label="Your progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-col gap-1.5">
          <span className={`h-1.5 rounded-full ${i < stage ? "bg-status-confirmed" : i === stage ? "bg-primary" : "bg-muted"}`} />
          <span className={`text-xs sm:text-sm ${i <= stage ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
        </li>
      ))}
    </ol>
  );
}
