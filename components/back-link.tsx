import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * "Back to …" at the top of a step, like the GOV.UK back link: never on the first step, never
 * together with breadcrumbs, and it names where it goes so nobody needs the browser's back button.
 */
export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <ArrowLeft className="size-4" />
      {children}
    </Link>
  );
}
