import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { demoMode, requireOrganiserPage } from "@/lib/auth";
import { getReview } from "@/lib/matchready/organiser";
import { ReviewScreen } from "./review-screen";

export default function ReviewPage({ params }: PageProps<"/organiser/review/[companyId]">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading applications…</p>}>
      <ReviewContent params={params} />
    </Suspense>
  );
}

async function ReviewContent({ params }: { params: PageProps<"/organiser/review/[companyId]">["params"] }) {
  await connection(); // live data, never prerendered
  const { companyId } = await params;
  await requireOrganiserPage(`/organiser/review/${companyId}`);
  const review = await getReview(companyId);
  if (!review) notFound();
  return <ReviewScreen review={review} demo={demoMode()} />;
}
