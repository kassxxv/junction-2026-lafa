import { CalendarDays, Download, LayoutList, ListChecks, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Workspace shell: Espoo-navy sidebar + light work area.
 * No auth in the prototype: the user is a hardcoded Espoo staff member.
 */

const NAV = [
  { href: "/cards", label: "Company cards", icon: LayoutList, enabled: true },
  { href: "#", label: "Candidates", icon: Users, enabled: false },
  { href: "#", label: "Selection", icon: ListChecks, enabled: false },
  { href: "#", label: "Export to Tavata", icon: Download, enabled: false },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row">
      <aside className="flex shrink-0 flex-col bg-sidebar text-sidebar-foreground md:w-60">
        <div className="px-5 pt-6 pb-5">
          <div className="text-[0.95rem] font-semibold tracking-tight">Recruitment events</div>
          <div className="text-xs text-sidebar-muted">City of Espoo prototype</div>
        </div>

        <div className="mx-3 mb-5 flex gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-sidebar-muted" />
          <div className="text-sm leading-tight">
            <div className="font-medium">Tech and Logistics Day</div>
            <div className="text-xs text-sidebar-muted">3 December, Espoo</div>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map(({ href, label, icon: Icon, enabled }) =>
            enabled ? (
              <Link
                key={label}
                href={href}
                aria-current="page"
                className="flex items-center gap-2.5 rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ) : (
              <span
                key={label}
                aria-disabled
                title="Not built yet"
                className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap text-sidebar-muted/70"
              >
                <Icon className="size-4" />
                {label}
              </span>
            ),
          )}
        </nav>

        <div className="mt-auto hidden items-center gap-3 border-t border-sidebar-border px-5 py-4 md:flex">
          <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">
            ES
          </span>
          <div className="text-sm leading-tight">
            <div className="font-medium">Event staff</div>
            <div className="text-xs text-sidebar-muted">Demo account</div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col md:overflow-hidden">{children}</main>
    </div>
  );
}
