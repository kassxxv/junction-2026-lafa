import "server-only";
import { generateJSON } from "@/lib/gemini";
import { CARD_DRAFT_SYSTEM, cardDraftPrompt } from "@/lib/prompts/card-draft";
import type { Sourced } from "@/lib/service";
import { toCardDraft } from "./from-model";
import { ModelDraft } from "./model-schema";
import { STUB_MODEL_DRAFT } from "./stub-model";
import type { CardDraft } from "./types";

/**
 * Company input → card draft + follow-up questions.
 * Gemini only (company data). Falls back to a labelled sample draft if Gemini fails.
 */
export async function draftCard(input: { companyName: string; text: string }): Promise<Sourced<CardDraft>> {
  const result = await generateJSON({
    schema: ModelDraft,
    system: CARD_DRAFT_SYSTEM,
    prompt: cardDraftPrompt(input),
    stub: STUB_MODEL_DRAFT,
    temperature: 0.2,
  });
  const draft = toCardDraft(result.data, input);
  return result.source === "live" ? { source: "live", data: draft } : { source: "stub", data: draft, reason: result.reason };
}
