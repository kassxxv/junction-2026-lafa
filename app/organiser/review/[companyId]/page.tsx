import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getReview } from "@/lib/matchready/organiser";
import { ReviewScreen } from "./review-screen";

export default async function ReviewPage({ params }: PageProps<"/organiser/review/[companyId]">) {
  await connection(); // live data, never prerendered
  const { companyId } = await params;
  const review = await getReview(companyId);
  if (!review) notFound();
  return <ReviewScreen review={review} />;
}
