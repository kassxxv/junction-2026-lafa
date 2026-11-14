import { connection } from "next/server";
import { Suspense } from "react";
import { PublicShell } from "@/components/public-shell";
import { currentCompanyId, demoMode } from "@/lib/auth";
import { getCompany, getSavedCard } from "@/lib/matchready/card-service";
import { signOutCompany } from "@/lib/matchready/company-auth-actions";
import { DEMO_COMPANY_ID, DEMO_FEEDBACK_COMPANY_ID, DEMO_REVIEW_COMPANY_ID, demoInviteCode } from "@/lib/matchready/demo";
import { getCompanyPortal } from "@/lib/matchready/meetings";
import { getEvent } from "@/lib/matchready/organiser";
import { CompanyFlow } from "./company-flow";
import { CompanySignIn } from "./sign-in";

/** The company's own page. A company signs in with its invitation code; everything here is about that company only. */
export default function CompanyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <CompanyPageContent />
    </Suspense>
  );
}

const DEMO_CODES = [
  { id: DEMO_COMPANY_ID, company: "Kuura Photonics", what: "no card yet: create one" },
  { id: DEMO_REVIEW_COMPANY_ID, company: "Nordic Photonics", what: "card confirmed, applications in review" },
  { id: DEMO_FEEDBACK_COMPANY_ID, company: "QuantumLab", what: "after the event: answer your meetings" },
];

async function CompanyPageContent() {
  await connection();
  const companyId = await currentCompanyId();
  const company = companyId ? await getCompany(companyId) : null;

  if (!company) {
    return (
      <PublicShell right="For companies">
        <CompanySignIn demoCodes={demoMode() ? DEMO_CODES.map((d) => ({ code: demoInviteCode(d.id), company: d.company, what: d.what })) : []} />
      </PublicShell>
    );
  }

  const [event, saved, portal] = await Promise.all([getEvent(), getSavedCard(company.id), getCompanyPortal(company.id)]);
  return (
    <PublicShell
      right={
        <span className="flex items-center gap-3">
          <span>{company.name}</span>
          <form action={signOutCompany}>
            <button type="submit" className="rounded-md px-2 py-1 text-xs whitespace-nowrap underline-offset-4 hover:text-sidebar-foreground hover:underline">
              Sign out
            </button>
          </form>
        </span>
      }
    >
      <CompanyFlow
        company={{ id: company.id, name: company.name, field: company.field, eventFields: company.eventFields, status: company.status }}
        companyDeadline={event.companyDeadline}
        demo={demoMode()}
        saved={saved}
        portal={portal}
        event={event}
      />
    </PublicShell>
  );
}
