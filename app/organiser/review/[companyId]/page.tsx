import { notFound } from "next/navigation";
import { connection } from "next/server";
import { demoMode, requireOrganiserPage } from "@/lib/auth";
import { getReview } from "@/lib/matchready/organiser";
import { ReviewScreen } from "./review-screen";

export default async function ReviewPage({ params }: PageProps<"/organiser/review/[companyId]">) {
  await connection(); // live data, never prerendered
  const { companyId } = await params;
  await requireOrganiserPage(`/organiser/review/${companyId}`);
  const review = await getReview(companyId);
  if (!review) notFound();
  return <ReviewScreen review={review} demo={demoMode()} />;
}
