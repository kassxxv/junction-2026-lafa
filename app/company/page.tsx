import { Suspense } from "react";
import { CompanyFlow } from "./company-flow";

/** Company-facing page. No login in the prototype: the invite is hardcoded. */
export default function CompanyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
          <span>
            <span className="font-semibold">Tech and Logistics Day</span>
            <span className="text-muted-foreground">, 3 December, Espoo</span>
          </span>
          <span className="text-muted-foreground">Invited: Norrvik Logistics Oy</span>
        </div>
      </header>
      <main className="flex-1">
        {/* useSearchParams() is request data, so it needs a Suspense boundary. */}
        <Suspense fallback={null}>
          <CompanyFlow />
        </Suspense>
      </main>
      <footer className="px-5 py-6 text-center text-xs text-muted-foreground">
        City of Espoo recruitment events prototype. Sample data only.
      </footer>
    </div>
  );
}
