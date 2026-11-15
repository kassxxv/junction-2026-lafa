import "server-only";
import { query } from "@/lib/db";
import { embed } from "@/lib/gemma";
import { SEMANTIC_MAX_LINES, SEMANTIC_MIN_SIMILARITY } from "./config";

/**
 * Meaning search: which CV lines may be related to a requirement even when they share no keyword
 * ("characterised fibre couplers" ↔ "optical component testing").
 *
 * - Vectors come from EmbeddingGemma on our own Gemma server (Verda, EU), the only service allowed to
 *   see candidate text, and only from the de-identified CV (cv_text_blind).
 * - pgvector on Aiven finds the nearest lines.
 * - The result is a hint for a person ("may be related, check it"). It never changes a status, a filter
 *   or the order of candidates, and nothing is computed across candidates.
 */

// EmbeddingGemma is trained with these task prefixes; they make short queries and CV lines comparable.
const asQuery = (t: string) => `task: search result | query: ${t}`;
const asDocument = (t: string) => `title: none | text: ${t}`;
const toVector = (v: number[]) => `[${v.join(",")}]`;

/** CV lines worth comparing: real text, not headings, blank lines or "[name hidden]" markers. */
export function indexableLines(text: string): { lineNo: number; text: string }[] {
  return text
    .split(/\r?\n/)
    .map((t, lineNo) => ({ lineNo, text: t.replace(/^[-•*\s]+/, "").trim() }))
    .filter(({ text }) => text.split(/\s+/).length >= 3 && !/^\[[a-z -]+ hidden\]$/.test(text) && text !== text.toUpperCase());
}

/** (Re)builds the line vectors of one candidate's de-identified CV. Returns false when Gemma is unavailable. */
export async function indexCv(candidateId: string, blindText: string): Promise<boolean> {
  const lines = indexableLines(blindText);
  const vectors = await embed(lines.map((l) => asDocument(l.text)));
  if (!vectors) return false;
  await query(`DELETE FROM cv_line_vectors WHERE candidate_id = $1`, [candidateId]);
  if (!lines.length) return true;
  const values = lines.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3}::vector)`).join(", ");
  await query(
    `INSERT INTO cv_line_vectors (candidate_id, line_no, embedding) VALUES ${values}`,
    [candidateId, ...lines.flatMap((l, i) => [l.lineNo, toVector(vectors[i])])],
  );
  return true;
}

/** Makes sure each requirement has a vector of its current wording (company data, embedded on the same server). */
export async function ensureRequirementVectors(reqs: { id: string; text: string }[]): Promise<void> {
  if (!reqs.length) return;
  const have = await query<{ requirement_id: string; source: string }>(`SELECT requirement_id, source FROM requirement_vectors WHERE requirement_id = ANY($1)`, [reqs.map((r) => r.id)]);
  const stale = reqs.filter((r) => have.find((h) => h.requirement_id === r.id)?.source !== r.text);
  if (!stale.length) return;
  const vectors = await embed(stale.map((r) => asQuery(r.text)));
  if (!vectors) return;
  for (const [i, r] of stale.entries()) {
    await query(
      `INSERT INTO requirement_vectors (requirement_id, source, embedding) VALUES ($1, $2, $3::vector)
       ON CONFLICT (requirement_id) DO UPDATE SET source = EXCLUDED.source, embedding = EXCLUDED.embedding`,
      [r.id, r.text, toVector(vectors[i])],
    );
  }
}

/** The text a requirement is searched with: its label plus the phrases the card already lists. */
export function requirementSearchText(r: { label: string; keywords?: string[] }): string {
  const extra = (r.keywords ?? []).filter((k) => !r.label.toLowerCase().includes(k.toLowerCase()));
  return [r.label, ...extra].join("; ");
}

/**
 * Requirement id → CV line numbers that may be related by meaning, nearest first. Empty when the CV has no
 * vectors yet or Gemma is down. Lines in `exclude` (already found by the fact check) are left out.
 */
export async function relatedLines(
  candidateId: string,
  reqs: { id: string; text: string }[],
  exclude: Record<string, number[]> = {},
): Promise<Record<string, number[]>> {
  try {
    await ensureRequirementVectors(reqs);
    const rows = await query<{ requirement_id: string; line_no: number; similarity: number }>(
      `SELECT r.requirement_id, l.line_no, 1 - (l.embedding <=> r.embedding) AS similarity
       FROM requirement_vectors r
       CROSS JOIN LATERAL (
         SELECT line_no, embedding FROM cv_line_vectors
         WHERE candidate_id = $1
         ORDER BY embedding <=> r.embedding
         LIMIT $3
       ) l
       WHERE r.requirement_id = ANY($2)`,
      [candidateId, reqs.map((r) => r.id), SEMANTIC_MAX_LINES + 4],
    );
    const out: Record<string, number[]> = {};
    for (const r of reqs) {
      const skip = new Set(exclude[r.id] ?? []);
      out[r.id] = rows
        .filter((x) => x.requirement_id === r.id && x.similarity >= SEMANTIC_MIN_SIMILARITY && !skip.has(x.line_no))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, SEMANTIC_MAX_LINES)
        .map((x) => x.line_no);
    }
    return out;
  } catch {
    return {}; // a hint only: never break the screen over it
  }
}
