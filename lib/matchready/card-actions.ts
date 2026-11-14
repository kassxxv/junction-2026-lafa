"use server";

import { z } from "zod";
import type { CardRequirement, CompanyCardDraft, PoolStats } from "./card-schema";
import { MAX_COMPANY_INPUT_CHARS } from "./config";
import { draftCard, poolStats, resetDraft, saveConfirmedCard } from "./card-service";

export type DraftResult =
  | { ok: true; draft: CompanyCardDraft; sample: boolean }
  | { ok: false; error: string };

export async function draftCompanyCard(companyId: string, text: string): Promise<DraftResult> {
  const input = z.object({ companyId: z.string().min(1).max(100), text: z.string().max(MAX_COMPANY_INPUT_CHARS) }).safeParse({ companyId, text });
  if (!input.success) return { ok: false, error: `That text is too long. Paste up to ${MAX_COMPANY_INPUT_CHARS} characters.` };
  const result = await draftCard(input.data.companyId, input.data.text.trim());
  if (!result) return { ok: false, error: "This invitation link is not valid." };
  return { ok: true, draft: result.data, sample: result.source === "stub" };
}

const Requirement = z.object({
  key: z.string().max(40),
  type: z.enum(["experience", "has_done", "education", "language"]),
  label: z.string().trim().min(1).max(200),
  minYears: z.number().min(0).max(40).nullable(),
  level: z.string().max(10).nullable(),
  detail: z.string().max(300).nullable(),
  mustHave: z.boolean(),
  keywords: z.array(z.string().max(60)).max(6),
  origin: z.enum(["text", "ai"]),
  quote: z.string().max(1000).optional(),
});

const Card = z.object({
  companyId: z.string().min(1).max(100),
  summary: z.string().max(500),
  eventGoal: z.string().max(500),
  field: z.string().max(100),
  goals: z.array(z.enum(["fill", "explore", "brand"])).max(3),
  roles: z
    .array(z.object({ title: z.string().trim().min(1).max(200), details: z.string().max(200), starter: z.string().max(500), requirements: z.array(Requirement).max(10) }))
    .max(3),
  sourceText: z.string().max(40_000),
});
export type CardInput = z.infer<typeof Card>;

export async function previewPool(field: string, requirements: CardRequirement[]): Promise<PoolStats> {
  const reqs = z.array(Requirement).max(10).parse(requirements);
  return poolStats(field || null, reqs);
}

/** Demo helper: back to an empty draft. Only for companies without applications, so no candidate data is touched. */
export async function resetCompanyDemo(companyId: string): Promise<{ ok: boolean }> {
  const id = z.string().min(1).max(100).parse(companyId);
  return { ok: await resetDraft(id) };
}

export async function confirmCompanyCard(card: CardInput): Promise<{ ok: true; pool: PoolStats } | { ok: false; error: string }> {
  const parsed = Card.safeParse(card);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.path.includes("title") ? "Give the role a title before confirming." : "Some part of the card is not valid. Check the fields and try again." };
  }
  if (!parsed.data.goals.length) return { ok: false, error: "Pick at least one goal for the event." };
  if (parsed.data.goals.includes("fill") && !parsed.data.roles.length) return { ok: false, error: "Add the role you want to hire for." };

  await saveConfirmedCard(parsed.data);
  const firstReqs = parsed.data.roles[0]?.requirements ?? [];
  return { ok: true, pool: await poolStats(parsed.data.field || null, firstReqs) };
}
