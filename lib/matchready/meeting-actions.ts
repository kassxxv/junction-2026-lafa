"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { COMPANY_SESSION_ENDED, currentCompanyId } from "@/lib/auth";
import { recordAnswer } from "./feedback";
import { meetingOwner } from "./meetings";

export type MeetingAnswerResult = { ok: true } | { ok: false; error: string };

const Input = z.object({ applicationId: z.string().min(1).max(200), yes: z.boolean() });

/** The signed-in company answers "want to continue?" for one of its own meetings. */
export async function answerAsCompany(applicationId: string, yes: boolean): Promise<MeetingAnswerResult> {
  const input = Input.safeParse({ applicationId, yes });
  if (!input.success) return { ok: false, error: "Something went wrong. Try again." };
  const companyId = await currentCompanyId();
  if (!companyId) return { ok: false, error: COMPANY_SESSION_ENDED };
  const owner = await meetingOwner(input.data.applicationId);
  if (!owner || owner.companyId !== companyId) return { ok: false, error: "This meeting was not found." };
  await recordAnswer(input.data.applicationId, "company", input.data.yes);
  refresh();
  return { ok: true };
}

/**
 * The candidate answers for one of their own meetings. The candidate id comes from their private status link
 * (a random id, like the link a candidate gets by e-mail); it must own the application.
 */
export async function answerAsCandidate(candidateId: string, applicationId: string, yes: boolean): Promise<MeetingAnswerResult> {
  const input = Input.safeParse({ applicationId, yes });
  if (!input.success || typeof candidateId !== "string" || candidateId.length > 100) return { ok: false, error: "Something went wrong. Try again." };
  const owner = await meetingOwner(input.data.applicationId);
  if (!owner || owner.candidateId !== candidateId) return { ok: false, error: "This meeting was not found." };
  await recordAnswer(input.data.applicationId, "candidate", input.data.yes);
  refresh();
  return { ok: true };
}
