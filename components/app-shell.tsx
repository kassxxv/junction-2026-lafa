import { CalendarDays } from "lucide-react";
import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { signOutOrganiser } from "@/lib/matchready/auth-actions";
import { DEMO_ORGANISER } from "@/lib/matchready/demo";
import { EventLabel } from "./event-label";
import { NavList, OrganiserNav } from "./organiser-nav";

/**
 * Organiser workspace shell: Espoo-navy sidebar + light work area.
 * Access is one shared password (lib/auth.ts); decisions are logged under the demo organiser.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row">
      <aside className="flex shrink-0 flex-col bg-sidebar text-sidebar-foreground md:w-60">
        <div className="px-5 pt-6 pb-5">
          <Image src={BRAND.logoOnDark.src} width={BRAND.logoOnDark.width} height={BRAND.logoOnDark.height} alt={BRAND.name} loading="eager" className="h-9 w-auto" />
          <div className="text-xs text-sidebar-muted">Organiser workspace</div>
        </div>

        <div className="mx-3 mb-5 flex gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-sidebar-muted" />
          <div className="text-sm leading-tight">
            <EventLabel withDates />
          </div>
        </div>

        <Suspense fallback={<NavList path={null} />}>
          <OrganiserNav />
        </Suspense>

        <div className="mt-auto hidden items-center gap-3 border-t border-sidebar-border px-5 py-4 md:flex">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">
            {DEMO_ORGANISER.initials}
          </span>
          <div className="min-w-0 text-sm leading-tight">
            <div className="font-medium">{DEMO_ORGANISER.name}</div>
            <div className="text-xs text-sidebar-muted">{DEMO_ORGANISER.role}</div>
          </div>
          <form action={signOutOrganiser} className="ml-auto shrink-0">
            <button type="submit" className="rounded-md px-2 py-1 text-xs whitespace-nowrap text-sidebar-muted hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col md:overflow-hidden">{children}</main>
    </div>
  );
}
