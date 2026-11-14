import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PublicShell } from "@/components/public-shell";
import { confirmedCompanies, getCandidate } from "@/lib/matchready/candidate-service";
import { MAX_COMPANIES_PER_CANDIDATE } from "@/lib/matchready/config";
import { formatDateRange } from "@/lib/matchready/event";
import { getEvent } from "@/lib/matchready/organiser";
import { ChooseForm } from "./choose-form";

/** Invitation after the company deadline: confirmed companies in the candidate's own fields. */
export default function ChoosePage(props: PageProps<"/candidate/[id]/choose">) {
  return (
    <PublicShell right="For professionals">
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <Content {...props} />
      </Suspense>
    </PublicShell>
  );
}

async function Content({ params }: PageProps<"/candidate/[id]/choose">) {
  await connection();
  const { id } = await params;
  const [c, companies, event] = await Promise.all([getCandidate(decodeURIComponent(id)), confirmedCompanies(), getEvent()]);
  if (!c) notFound();
  const already = new Set(c.applications.map((a) => a.companyId));
  const open = companies.filter((co) => !already.has(co.id) && co.role);
  // Routing by the field the candidate chose themselves, not by AI judgement.
  const mine = open.filter((co) => co.field && c.fields.includes(co.field));
  const others = open.filter((co) => !co.field || !c.fields.includes(co.field));

  return (
    <ChooseForm
      candidateId={c.id}
      fields={c.fields}
      max={MAX_COMPANIES_PER_CANDIDATE - c.applications.length}
      eventDates={formatDateRange(event.startsOn, event.endsOn)}
      mine={mine.map((co) => ({ id: co.id, name: co.name, field: co.field, role: co.role?.title ?? "", details: co.role?.details ?? null, musts: co.requirements.filter((r) => r.mustHave).map((r) => r.text), others: co.requirements.filter((r) => !r.mustHave).length }))}
      others={others.map((co) => ({ id: co.id, name: co.name, field: co.field ?? "Other" }))}
      decisionDate={event.decisionDate}
    />
  );
}
