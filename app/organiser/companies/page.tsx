import { connection } from "next/server";
import { requireOrganiserPage } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import { listCompaniesForOrganiser } from "@/lib/matchready/companies-admin";
import { getEvent } from "@/lib/matchready/organiser";
import { CompaniesScreen } from "./companies-screen";

/** Organisers add companies and hand out invitation codes. */
export default async function CompaniesPage() {
  await connection();
  await requireOrganiserPage("/organiser/companies");
  const [companies, event] = await Promise.all([listCompaniesForOrganiser(), getEvent()]);

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border bg-card px-6 py-5">
        <h1 className="title-panel">Companies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the companies of {event.name} and send each one its invitation code. With the code a company signs in and fills
          in its card.
        </p>
      </header>
      <CompaniesScreen companies={companies} fields={event.fields} emailOn={emailConfigured()} />
    </div>
  );
}
