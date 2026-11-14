import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PublicShell } from "@/components/public-shell";
import { query } from "@/lib/db";
import { confirmedCompanies, evidencePreview, getCandidate } from "@/lib/matchready/candidate-service";
import { MAX_COMPANIES_PER_CANDIDATE } from "@/lib/matchready/config";
import type { LinkedinCheck } from "@/lib/matchready/facts";
import { ApplyForm } from "./apply-form";

/** Stage 2: application with proof, only for the chosen companies. */
export default function ApplyPage(props: PageProps<"/candidate/[id]/apply">) {
  return (
    <PublicShell right="For professionals">
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <Content {...props} />
      </Suspense>
    </PublicShell>
  );
}

async function Content({ params, searchParams }: PageProps<"/candidate/[id]/apply">) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;
  const candidateId = decodeURIComponent(id);
  const wanted = (typeof sp.companies === "string" ? sp.companies : "").split(",").filter(Boolean).slice(0, MAX_COMPANIES_PER_CANDIDATE);
  const [c, companies] = await Promise.all([getCandidate(candidateId), confirmedCompanies()]);
  if (!c) notFound();
  const chosen = companies.filter((co) => wanted.includes(co.id));
  const [doc] = await query<{ cv_text: string | null; linkedin_url: string | null; linkedin_checks: LinkedinCheck[] | null }>(
    `SELECT cv_text, linkedin_url, linkedin_checks FROM candidate_documents WHERE candidate_id = $1`,
    [candidateId],
  );
  const preview = c.cvParsed ? await evidencePreview(candidateId, wanted) : [];

  return (
    <ApplyForm
      candidateId={candidateId}
      companies={chosen.map((co) => ({
        id: co.id,
        name: co.name,
        role: co.role?.title ?? "",
        starter: co.role?.starter ?? "",
        requirements: co.requirements.map((r) => ({ id: r.id, text: r.text, type: r.type, mustHave: r.mustHave })),
      }))}
      stage1Cv={Boolean(doc?.cv_text) && !c.cvParsed}
      cvParsed={c.cvParsed}
      linkedinParsed={c.hasLinkedin}
      linkedinUrl={doc?.linkedin_url ?? ""}
      initialPreview={preview}
      initialChecks={doc?.linkedin_checks ?? []}
    />
  );
}
