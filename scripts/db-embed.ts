/**
 * Builds the meaning-search vectors (EmbeddingGemma on our Gemma server → pgvector): every de-identified CV
 * and every requirement. Run after db:seed. Usage: npm run db:embed
 */
import { closeDb, query } from "../lib/db";
import { ensureRequirementVectors, indexCv, requirementSearchText } from "../lib/matchready/semantic";

async function main() {
  const cvs = await query<{ candidate_id: string; blind: string }>(
    `SELECT candidate_id, cv_text_blind AS blind FROM candidate_documents WHERE cv_text_blind IS NOT NULL ORDER BY candidate_id`,
  );
  let done = 0;
  for (const c of cvs) if (await indexCv(c.candidate_id, c.blind)) done++;
  const reqs = await query<{ id: string; label: string; keywords: string[] }>(`SELECT id, label, keywords FROM requirements`);
  await ensureRequirementVectors(reqs.map((r) => ({ id: r.id, text: requirementSearchText(r) })));
  const [n] = await query<{ lines: number; reqs: number }>(`SELECT (SELECT count(*) FROM cv_line_vectors)::int AS lines, (SELECT count(*) FROM requirement_vectors)::int AS reqs`);
  console.log(`embedded: ${done}/${cvs.length} CVs (${n.lines} lines), ${n.reqs} requirements`);
  if (done < cvs.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("embed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
