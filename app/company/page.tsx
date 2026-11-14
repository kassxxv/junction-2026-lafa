import { connection } from "next/server";
import { Suspense } from "react";
import { getCompany } from "@/lib/matchready/card-service";
import { getEvent } from "@/lib/matchready/organiser";
import { CompanyFlow } from "./company-flow";

/** Company-facing page. No login in the prototype: the invitation is ?company=<id> (default: the demo company). */
export default function CompanyPage(props: PageProps<"/company">) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <CompanyPageContent {...props} />
    </Suspense>
  );
}

async function CompanyPageContent({ searchParams }: PageProps<"/company">) {
  await connection();
  const sp = await searchParams;
  const companyId = typeof sp.company === "string" ? sp.company : "kuura-photonics";
  const [company, event] = await Promise.all([getCompany(companyId), getEvent()]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
          <span>
            <span className="font-semibold">{event.name}</span>
            <span className="text-muted-foreground">, 26–27 November 2026, online</span>
          </span>
          {company && <span className="text-muted-foreground">Invited: {company.name}</span>}
        </div>
      </header>
      <main className="flex-1">
        {company ? (
          <CompanyFlow
            company={{ id: company.id, name: company.name, field: company.field, eventFields: company.eventFields, status: company.status }}
            companyDeadline={event.companyDeadline}
          />
        ) : (
          <p className="mx-auto max-w-xl px-5 py-20 text-center text-muted-foreground">
            This invitation link is not valid. Ask the event organisers for a new one.
          </p>
        )}
      </main>
      <footer className="px-5 py-6 text-center text-xs text-muted-foreground">
        MatchReady prototype for the City of Espoo. The event is real; companies and people are fictional.
      </footer>
    </div>
  );
}
