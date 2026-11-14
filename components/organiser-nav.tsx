"use client";

import { Building2, Download, LayoutDashboard, ListChecks, MessageSquareHeart, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sidebar follows the organiser's process: overview → companies → pool → selection → Tavata → feedback, then the event itself. */
const NAV = [
  { href: "/organiser", label: "Overview", icon: LayoutDashboard, enabled: true, exact: true },
  { href: "/organiser/companies", label: "Companies", icon: Building2, enabled: true },
  { href: "/organiser/pool", label: "Talent pool", icon: Users, enabled: false },
  { href: "/organiser/review", label: "Selection", icon: ListChecks, enabled: true },
  { href: "/organiser/tavata", label: "Codes for Tavata", icon: Download, enabled: false },
  { href: "/organiser/feedback", label: "Feedback", icon: MessageSquareHeart, enabled: true },
  { href: "/organiser/settings", label: "Event settings", icon: Settings, enabled: true },
];

/** Reads the URL to highlight the current stage. Render inside <Suspense> (dynamic routes). */
export function OrganiserNav() {
  return <NavList path={usePathname()} />;
}

/** Same list without a highlighted item: the static fallback while the URL streams in. */
export function NavList({ path }: { path: string | null }) {
  return (
    <nav aria-label="Organiser" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
      {NAV.map(({ href, label, icon: Icon, enabled, exact }) => {
        const active = path !== null && (exact ? path === href : path.startsWith(href));
        return enabled ? (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none ${
              active ? "bg-sidebar-accent font-medium" : "text-sidebar-muted hover:text-sidebar-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ) : (
          <span
            key={href}
            aria-disabled
            title="Coming next"
            className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap text-sidebar-muted/60"
          >
            <Icon className="size-4" />
            {label}
          </span>
        );
      })}
    </nav>
  );
}
