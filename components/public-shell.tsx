import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { EventLabel } from "./event-label";

/** Header + footer for public pages (companies and candidates). */
export function PublicShell({ right, children }: { right?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="page-wide flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
          <span className="flex items-center gap-2.5">
            <Link href="/" aria-label={`${BRAND.name} home`} className="shrink-0 border-r border-sidebar-border pr-3">
              <Image src={BRAND.logoOnDark.src} width={BRAND.logoOnDark.width} height={BRAND.logoOnDark.height} alt="" loading="eager" className="h-8 w-auto" />
            </Link>
            <span className="font-semibold">
              <EventLabel />
            </span>
          </span>
          {right && <span className="text-sidebar-muted">{right}</span>}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="px-5 py-6 text-center text-xs text-muted-foreground">
        {BRAND.name} prototype for the City of Espoo. The event is real; companies and people are fictional.
      </footer>
    </div>
  );
}

