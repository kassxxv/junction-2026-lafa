import { connection } from "next/server";
import { Suspense } from "react";
import { PublicShell } from "@/components/public-shell";
import { demoMode } from "@/lib/auth";
import { getCompany, getSavedCard } from "@/lib/matchready/card-service";
import { DEMO_COMPANY_ID } from "@/lib/matchready/demo";
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
  const companyId = typeof sp.company === "string" ? sp.company : DEMO_COMPANY_ID;
  const [company, event, saved] = await Promise.all([getCompany(companyId), getEvent(), getSavedCard(companyId)]);

  return (
    <PublicShell right={company ? `Invited: ${company.name}` : undefined}>
      <>
        {company ? (
          <CompanyFlow
            company={{ id: company.id, name: company.name, field: company.field, eventFields: company.eventFields, status: company.status }}
            companyDeadline={event.companyDeadline}
            demo={demoMode()}
            saved={saved}
          />
        ) : (
          <p className="page-narrow px-5 py-20 text-center text-muted-foreground">
            This invitation link is not valid. Ask the event organisers for a new one.
          </p>
        )}
      </>
    </PublicShell>
  );
}
