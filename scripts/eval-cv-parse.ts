/**
 * Gemma CV/LinkedIn parsing check on the synthetic demo PDFs (public/demo/*.pdf).
 * Usage: npm run eval:cv   — calls Gemma on Verda; synthetic documents only.
 * Prints extracted facts, field-by-field checks against what the PDFs say, and the CV ↔ LinkedIn result.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chatJSON } from "../lib/gemma";
import { compareCvLinkedin, type CvFacts } from "../lib/matchready/facts";
import { pdfToText, toFacts } from "../lib/matchready/candidate-service";
import { CvParse } from "../lib/matchready/cv-schema";
import { CV_PARSE_SYSTEM, cvParsePrompt } from "../lib/prompts/cv-parse";

const TOPICS = ["optical testing", "photonic testing", "lab equipment", "measurement equipment", "automat python"];

async function parse(file: string, kind: "cv" | "linkedin"): Promise<{ facts: CvFacts; ms: number; live: boolean }> {
  const text = await pdfToText(new Uint8Array(readFileSync(join(process.cwd(), "public", "demo", file))));
  const t = Date.now();
  const r = await chatJSON({
    schema: CvParse,
    messages: [
      { role: "system", content: CV_PARSE_SYSTEM },
      { role: "user", content: cvParsePrompt({ kind, text, topics: TOPICS }) },
    ],
    stub: { experience: [], education: [], languages: [], skills: [] },
    temperature: 0,
  });
  return { facts: toFacts(r.data), ms: Date.now() - t, live: r.source === "live" };
}

function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  return ok;
}

async function main() {
  const cv = await parse("aisha-rahman-cv.pdf", "cv");
  const li = await parse("aisha-rahman-linkedin.pdf", "linkedin");
  console.log(`CV parsed in ${cv.ms} ms (${cv.live ? "live Gemma" : "STUB"}), LinkedIn in ${li.ms} ms (${li.live ? "live Gemma" : "STUB"})`);
  console.log("CV facts:", JSON.stringify(cv.facts, null, 1).slice(0, 1500));

  const valo = cv.facts.experience.find((e) => /valo/i.test(e.employer));
  const valoLi = li.facts.experience.find((e) => /valo/i.test(e.employer));
  const results = [
    check("CV: Valo Optics job found", Boolean(valo)),
    check("CV: title 'Test Lead'", valo?.title === "Test Lead"),
    check("CV: dates 2022-06 → 2025-10", valo?.start === "2022-06" && valo?.end === "2025-10"),
    check("CV: areas include optical testing", Boolean(valo?.areas.some((a) => a.includes("optical testing")))),
    check("CV: MSc Photonics 2022", cv.facts.education.some((e) => e.degree === "MSc" && /photonics/i.test(e.field) && e.year === 2022)),
    check("CV: English C1", cv.facts.languages.some((l) => l.language === "English" && l.level === "C1")),
    check("CV: Zemax in skills", cv.facts.skills.some((s) => /zemax/i.test(s))),
    check("CV: no personal data copied into facts (email)", !JSON.stringify(cv.facts).includes("@")),
    check("LinkedIn: title 'Test Engineer'", valoLi?.title === "Test Engineer"),
    check("LinkedIn: Zemax not in skills", !li.facts.skills.some((s) => /zemax/i.test(s))),
  ];

  const checks = compareCvLinkedin(cv.facts, {
    experience: li.facts.experience,
    education: li.facts.education.filter((e) => !e.inProgress),
    skills: li.facts.skills,
  });
  console.log("\nCV ↔ LinkedIn (computed by code):");
  for (const c of checks) console.log(`  ${c.kind.toUpperCase().padEnd(10)} ${c.text}`);
  results.push(check("comparison flags Test Lead vs Test Engineer", checks.some((c) => c.kind === "differs" && /Test Lead/.test(c.text))));
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
}

main().catch((e) => {
  console.error("eval failed:", e instanceof Error ? `${e.name}: ${e.message.slice(0, 120)}` : "unknown");
  process.exitCode = 1;
});
