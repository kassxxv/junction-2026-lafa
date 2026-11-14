import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";

/** Any unknown address, or a candidate / meeting / review link that no longer exists. */
export default function NotFound() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <p className="text-sm font-medium text-muted-foreground">Page not found</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">This link does not lead anywhere</h1>
        <p className="mt-3 text-muted-foreground">
          It may be mistyped, or the demo data was reset. Start again from the event page.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">Go to the event page</Link>
        </Button>
      </div>
    </PublicShell>
  );
}
