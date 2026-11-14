import { CalendarDays } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { NavList, OrganiserNav } from "./organiser-nav";

/**
 * Organiser workspace shell: Espoo-navy sidebar + light work area.
 * No login in the prototype: the organiser is a hardcoded demo account.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row">
      <aside className="flex shrink-0 flex-col bg-sidebar text-sidebar-foreground md:w-60">
        <div className="px-5 pt-6 pb-5">
          <div className="text-[0.95rem] font-semibold tracking-tight">MatchReady</div>
          <div className="text-xs text-sidebar-muted">Organiser workspace</div>
        </div>

        <div className="mx-3 mb-5 flex gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-sidebar-muted" />
          <div className="text-sm leading-tight">
            <div className="font-medium">Deep Tech Talent Forum</div>
            <div className="text-xs text-sidebar-muted">26–27 November, online</div>
          </div>
        </div>

        <Suspense fallback={<NavList path={null} />}>
          <OrganiserNav />
        </Suspense>

        <div className="mt-auto hidden items-center gap-3 border-t border-sidebar-border px-5 py-4 md:flex">
          <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">
            LA
          </span>
          <div className="text-sm leading-tight">
            <div className="font-medium">Laura</div>
            <div className="text-xs text-sidebar-muted">Organiser, demo account</div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col md:overflow-hidden">{children}</main>
    </div>
  );
}
