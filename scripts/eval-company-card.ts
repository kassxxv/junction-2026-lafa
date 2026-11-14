/**
 * Runs the MatchReady company-card prompt on synthetic inputs and prints the result.
 * Usage: npm run eval:company [case-id]   (calls Gemini and Context.dev; synthetic inputs only)
 */
import { closeDb } from "../lib/db";
import { draftCard } from "../lib/matchready/card-service";
import { DEMO_COMPANY_ID, DEMO_REVIEW_COMPANY_ID } from "../lib/matchready/demo";

const CASES: { id: string; company: string; text: string }[] = [
  { id: "one-liner", company: DEMO_REVIEW_COMPANY_ID, text: "Need a photonics test engineer. See our careers page: nordicphotonics.example/careers" },
  {
    id: "full-ad",
    company: DEMO_REVIEW_COMPANY_ID,
    text: `Test Engineer, Photonics (full-time, Espoo)
We build photonic components for telecom and sensing. You will test optical components in our lab and automate measurements.
Requirements: at least 2 years of experience in optical or photonic component testing. Experience with lab measurement equipment. Python test automation is a plus. BSc or MSc in Photonics, Physics or Electrical Engineering. A PhD is an advantage. Fluent English required.`,
  },
  { id: "finnish", company: "finnsensor", text: "Haemme tuotantotestaajaa Ouluun. Vähintään vuoden kokemus testauksesta ja suomen kielen hyvä taito vaaditaan." },
  { id: "nothing", company: DEMO_COMPANY_ID, text: "" },
];

async function main() {
  const only = process.argv[2];
  for (const c of CASES.filter((x) => !only || x.id === only)) {
    const t = Date.now();
    const r = await draftCard(c.company, c.text);
    if (!r) { console.log(`${c.id}: company not found`); continue; }
    const d = r.data;
    console.log(`\n=== ${c.id} (${r.source}${r.source === "stub" ? `: ${r.reason}` : ""}, ${Date.now() - t} ms) url=${d.readUrl ?? "-"} read=${d.readUrlOk}`);
    console.log(`field: ${d.field || "-"} | goals: ${d.goals.join(", ")} | event goal: ${d.eventGoal || "-"}`);
    for (const role of d.roles) {
      console.log(`  role: ${role.title || "(no title)"} ${role.details ? `· ${role.details}` : ""}`);
      for (const q of role.requirements)
        console.log(`    ${q.mustHave ? "MUST" : "    "} ${q.type.padEnd(10)} ${q.label}${q.minYears ? ` · ${q.minYears}+ y` : ""}${q.level ? ` · ${q.level}` : ""}${q.detail ? ` · ${q.detail}` : ""}  [${q.origin}] kw=${q.keywords.join("/")}`);
      console.log(`    starter: ${role.starter}`);
    }
    for (const q of d.questions) console.log(`  ? (${q.target}) ${q.question} [${q.options.join(" | ")}]${q.suggested ? ` → ${q.suggested}` : ""}`);
  }
}

main().catch((e) => { console.error("eval failed:", e instanceof Error ? e.name : "unknown"); process.exitCode = 1; }).finally(() => closeDb());
