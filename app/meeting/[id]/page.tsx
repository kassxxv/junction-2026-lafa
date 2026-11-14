import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PublicShell } from "@/components/public-shell";
import { getMeeting } from "@/lib/matchready/feedback";
import { MeetingQuestion } from "./meeting-question";

/** Right after a 1:1 meeting: one question for each side. ?side=company|candidate */
export default function MeetingPage(props: PageProps<"/meeting/[id]">) {
  return (
    <PublicShell right="After the meeting">
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <Content {...props} />
      </Suspense>
    </PublicShell>
  );
}

async function Content({ params, searchParams }: PageProps<"/meeting/[id]">) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;
  const side = sp.side === "company" ? "company" : "candidate";
  const meeting = await getMeeting(decodeURIComponent(id));
  if (!meeting) notFound();
  return <MeetingQuestion meeting={meeting} side={side} />;
}
