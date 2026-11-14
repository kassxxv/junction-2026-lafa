"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getMeeting, recordAnswer } from "./feedback";

export async function answerMeeting(
  applicationId: string,
  side: "company" | "candidate",
  yes: boolean,
): Promise<{ ok: true; bothYes: boolean; waiting: boolean } | { ok: false; error: string }> {
  const input = z.object({ id: z.string().min(1).max(200), side: z.enum(["company", "candidate"]), yes: z.boolean() }).safeParse({ id: applicationId, side, yes });
  if (!input.success) return { ok: false, error: "Something went wrong. Try again." };
  const meeting = await getMeeting(input.data.id);
  if (!meeting) return { ok: false, error: "This meeting was not found." };
  await recordAnswer(input.data.id, input.data.side, input.data.yes);
  const other = input.data.side === "company" ? meeting.answers.candidate : meeting.answers.company;
  refresh();
  return { ok: true, bothYes: input.data.yes && other === true, waiting: other === null };
}
