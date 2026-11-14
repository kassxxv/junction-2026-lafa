/** Dev check (read-only): review status per blind code for one company. No names printed. */
import { closeDb, query } from "../lib/db";
import { DEMO_REVIEW_COMPANY_ID } from "../lib/matchready/demo";

const company = process.argv[2] ?? DEMO_REVIEW_COMPANY_ID;

query<{ code: string; must_missing: number; must_unknown: number; checks: { kind: string }[] | null; first: string | null }>(
  `SELECT c.code,
          count(*) FILTER (WHERE r.must_have AND e.meets IS FALSE)::int AS must_missing,
          count(*) FILTER (WHERE r.must_have AND e.meets IS NULL)::int AS must_unknown,
          d.linkedin_checks AS checks,
          min(e.value) FILTER (WHERE r.position = 0) AS first
   FROM applications a
   JOIN candidates c ON c.id = a.candidate_id
   JOIN evidence e ON e.application_id = a.id
   JOIN requirements r ON r.id = e.requirement_id
   LEFT JOIN candidate_documents d ON d.candidate_id = c.id
   WHERE a.company_id = $1
   GROUP BY c.code, d.linkedin_checks
   ORDER BY c.code`,
  [company],
)
  .then((rows) => {
    for (const r of rows) {
      const toCheck = (r.checks ?? []).filter((x) => x.kind === "differs" || x.kind === "not_found").length;
      const noLi = (r.checks ?? []).some((x) => x.kind === "none");
      const status = r.must_missing ? "missing must-have" : toCheck ? `${toCheck} to check` : "must-haves ✓";
      console.log(`${r.code}  ${status.padEnd(18)} ${noLi ? "no LinkedIn  " : "             "} ${r.first ?? "-"}`);
    }
  })
  .finally(() => closeDb());
