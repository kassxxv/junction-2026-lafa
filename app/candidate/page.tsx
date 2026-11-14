import { connection } from "next/server";
import { Suspense } from "react";
import { PublicShell } from "@/components/public-shell";
import { CAREER_STAGES, confirmedCompanies, WORK_TYPES } from "@/lib/matchready/candidate-service";
import { getEvent } from "@/lib/matchready/organiser";
import { JoinForm } from "./join-form";

/** Stage 1: join the talent pool (about one minute, nobody is selected here). */
export default function CandidateJoinPage() {
  return (
    <PublicShell right="For professionals">
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <Content />
      </Suspense>
    </PublicShell>
  );
}

async function Content() {
  await connection();
  const [event, companies] = await Promise.all([getEvent(), confirmedCompanies()]);
  return (
    <JoinForm
      fields={event.fields}
      workTypes={WORK_TYPES}
      stages={CAREER_STAGES.map((s) => ({ id: s.id, label: s.label }))}
      confirmed={companies.map((c) => ({ name: c.name, field: c.field ?? "" }))}
      companyDeadline={event.companyDeadline}
    />
  );
}
