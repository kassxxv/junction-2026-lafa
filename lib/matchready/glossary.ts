import "server-only";
import { z } from "zod";
import { query } from "@/lib/db";
import { generateJSON } from "@/lib/gemini";
import { GLOSSARY_SYSTEM, glossaryPrompt } from "@/lib/prompts/glossary";
import { requirementText, type RequirementType } from "./facts";

/**
 * Glossary for organisers: what each requirement of a company means and what it looks like in a CV.
 * Company data only goes to Gemini. Cached on the requirement, keyed by its wording.
 */

export interface GlossaryEntry {
  plain: string;
  inCv: string;
}

const Glossary = z.object({
  items: z.array(z.object({ key: z.string(), plain: z.string().max(300), inCv: z.string().max(300) })).max(20),
});

export async function glossaryFor(companyId: string): Promise<{ entries: Record<string, GlossaryEntry>; sample: boolean } | null> {
  const [company] = await query<{ name: string; field: string | null; title: string | null; role_id: string | null }>(
    `SELECT c.name, c.field, r.title, r.id AS role_id FROM companies c LEFT JOIN roles r ON r.company_id = c.id WHERE c.id = $1 ORDER BY r.position LIMIT 1`,
    [companyId],
  );
  if (!company?.role_id) return null;
  const reqs = await query<{ id: string; type: RequirementType; label: string; min_years: string | null; level: string | null; detail: string | null; must_have: boolean; keywords: string[]; glossary: (GlossaryEntry & { source: string }) | null }>(
    `SELECT id, type, label, min_years::text, level, detail, must_have, keywords, glossary FROM requirements WHERE role_id = $1 ORDER BY position`,
    [company.role_id],
  );
  const texts = reqs.map((r) => ({
    id: r.id,
    text: requirementText({ type: r.type, label: r.label, minYears: r.min_years ? Number(r.min_years) : null, level: r.level, detail: r.detail }),
    cached: r.glossary,
  }));

  const entries: Record<string, GlossaryEntry> = {};
  for (const t of texts) if (t.cached && t.cached.source === t.text) entries[t.id] = { plain: t.cached.plain, inCv: t.cached.inCv };
  const missing = texts.filter((t) => !entries[t.id]);
  if (!missing.length) return { entries, sample: false };

  // Keys sent to the model are short positions, not database ids.
  const result = await generateJSON({
    schema: Glossary,
    system: GLOSSARY_SYSTEM,
    prompt: glossaryPrompt({ companyName: company.name, field: company.field ?? "", roleTitle: company.title ?? "", requirements: missing.map((m, i) => ({ key: `r${i + 1}`, text: m.text })) }),
    stub: { items: missing.map((m, i) => ({ key: `r${i + 1}`, plain: `Sample text: an explanation of “${m.text}” appears here when Gemini is available.`, inCv: "" })) },
    temperature: 0.2,
  });
  for (const [i, m] of missing.entries()) {
    const item = result.data.items.find((x) => x.key === `r${i + 1}`);
    if (!item?.plain.trim()) continue;
    entries[m.id] = { plain: item.plain.trim(), inCv: item.inCv.trim() };
    if (result.source === "live") await query(`UPDATE requirements SET glossary = $2 WHERE id = $1`, [m.id, JSON.stringify({ ...entries[m.id], source: m.text })]);
  }
  return { entries, sample: result.source !== "live" };
}
