/**
 * Runs the card-draft prompt on the synthetic cases and prints what the model did.
 * Usage: npm run eval:cards            (all cases)
 *        npm run eval:cards -- vague   (one case)
 * Prints no secrets. Synthetic inputs only.
 */
import { CARD_DRAFT_CASES } from "../evals/card-draft/inputs";
import { toCardDraft } from "../lib/card/from-model";
import { ModelDraft } from "../lib/card/model-schema";
import { STUB_MODEL_DRAFT } from "../lib/card/stub-model";
import { generateJSON } from "../lib/gemini";
import { CARD_DRAFT_SYSTEM, cardDraftPrompt } from "../lib/prompts/card-draft";

const only = process.argv[2];
const short = (v: string | string[]) => {
  const s = Array.isArray(v) ? v.join(", ") : v;
  return s.length > 70 ? `${s.slice(0, 67)}…` : s;
};

async function main() {
  for (const c of CARD_DRAFT_CASES.filter((c) => !only || c.id === only)) {
    const started = Date.now();
    const res = await generateJSON({
      schema: ModelDraft,
      system: CARD_DRAFT_SYSTEM,
      prompt: cardDraftPrompt(c),
      stub: STUB_MODEL_DRAFT,
      temperature: 0.2,
    });
    const draft = toCardDraft(res.data, c);
    const ms = Date.now() - started;

    console.log(`\n=== ${c.id} (${res.source}${res.source === "stub" ? `: ${res.reason}` : ""}, ${ms} ms)`);
    console.log(`expect: ${c.expect}`);
    console.log(`goals: ${draft.goals.join(", ") || "-"} (${res.data.goals.status})`);

    // Claimed evidence that is not in the input → downgraded by our check.
    const claimed = [
      res.data.company.summary,
      ...res.data.positions.flatMap((p) => Object.values(p)),
      ...Object.values(res.data.explore),
      ...Object.values(res.data.brand),
    ].filter((f) => f.status === "found").length;
    const verified = draft.sections.flatMap((s) => s.fields).filter((f) => f.status === "source").length;
    console.log(`evidence: model claimed ${claimed} found, ${verified} verified by quote`);

    for (const s of draft.sections) {
      if (s.goal && !draft.goals.includes(s.goal)) continue;
      console.log(`  [${s.title}]`);
      for (const f of s.fields) console.log(`    ${f.status.padEnd(9)} ${f.label}: ${short(f.value) || "-"}`);
    }
    console.log(`questions (${draft.questions.length}):`);
    for (const q of draft.questions) {
      const extra =
        q.kind === "choice"
          ? ` [${q.options.join(" | ")}]${q.suggested ? ` → ${q.suggested}` : ""}`
          : q.kind === "goals"
            ? ` → ${q.suggested.join(", ")}`
            : "";
      console.log(`  - (${q.kind}) ${q.title}${extra}`);
    }
  }
}

main().catch((err) => {
  console.error("eval failed:", err instanceof Error ? err.name : "unknown");
  process.exit(1);
});
