/**
 * Loads the seed: the real event + synthetic companies and people.
 * Wipes all app data first (everything in the app is synthetic). Usage: npm run db:seed
 */
import { CANDIDATES as BASE_CANDIDATES, COMPANIES, cvText, EVENT, EXTRA_CANDIDATES, linkedinFrom } from "../db/seed/data";
import { closeDb, withTransaction } from "../lib/db";
import { compareCvLinkedin, evidenceFor, type Requirement } from "../lib/matchready/facts";
import { classifyError } from "../lib/service";

const CANDIDATES = [...BASE_CANDIDATES, ...EXTRA_CANDIDATES];

const APP_TABLES = [
  "meeting_feedback", "review_sessions", "decisions", "evidence", "applications", "candidate_background",
  "candidate_documents", "consents", "pool_profiles", "candidate_identity", "candidates",
  "requirements", "roles", "company_cards", "companies", "events",
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

async function main() {
  await withTransaction(async (q) => {
    await q(`TRUNCATE ${APP_TABLES.join(", ")} RESTART IDENTITY CASCADE`);

    await q(
      `INSERT INTO events (id, name, starts_on, ends_on, format, fields, company_deadline, application_deadline, decision_date, info_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [EVENT.id, EVENT.name, EVENT.startsOn, EVENT.endsOn, EVENT.format, EVENT.fields, EVENT.companyDeadline, EVENT.applicationDeadline, EVENT.decisionDate, EVENT.infoUrl],
    );

    const requirementsByCompany = new Map<string, Requirement[]>();
    const roleByCompany = new Map<string, string>();

    for (const c of COMPANIES) {
      await q(`INSERT INTO companies (id, event_id, name, website, field) VALUES ($1,$2,$3,$4,$5)`, [c.id, EVENT.id, c.name, c.website, c.field]);
      await q(
        `INSERT INTO company_cards (company_id, goals, summary, event_goal, status, places, source_text, confirmed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, CASE WHEN $5 = 'confirmed' THEN now() END)`,
        [c.id, c.goals, c.summary, c.eventGoal || null, c.status, c.places, `${c.summary} ${c.website}/careers`],
      );
      const roleId = `${c.id}.role.1`;
      roleByCompany.set(c.id, roleId);
      await q(`INSERT INTO roles (id, company_id, title, details, conversation_starter) VALUES ($1,$2,$3,$4,$5)`, [roleId, c.id, c.role.title, c.role.details, c.role.starter]);

      const reqs: Requirement[] = [];
      for (const [i, r] of c.role.requirements.entries()) {
        const id = `${roleId}.req.${i + 1}`;
        const keywords = r.keywords ?? [r.label];
        await q(
          `INSERT INTO requirements (id, role_id, type, label, min_years, level, detail, must_have, position, keywords)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [id, roleId, r.type, r.label, r.minYears ?? null, r.level ?? null, r.detail ?? null, r.mustHave, i, keywords],
        );
        reqs.push({ id, type: r.type, label: r.label, minYears: r.minYears ?? null, level: r.level ?? null, detail: r.detail ?? null, mustHave: r.mustHave, keywords });
      }
      requirementsByCompany.set(c.id, reqs);
    }

    for (const [n, p] of CANDIDATES.entries()) {
      const id = `cand.${String(n + 1).padStart(3, "0")}`;
      const li = linkedinFrom(p.cv, p.linkedin);
      const checks = compareCvLinkedin(p.cv, li);
      const fi = p.cv.languages.find((l) => l.language === "Finnish");

      await q(`INSERT INTO candidates (id, event_id, code) VALUES ($1,$2,$3)`, [id, EVENT.id, p.code]);
      await q(`INSERT INTO candidate_identity (candidate_id, full_name, email) VALUES ($1,$2,$3)`, [id, p.name, `${slug(p.name)}@example.com`]);
      await q(
        `INSERT INTO pool_profiles (candidate_id, fields, work_type, career_stage, languages) VALUES ($1,$2,$3,$4,$5)`,
        [id, p.fields, p.workType, p.stage, JSON.stringify(p.cv.languages)],
      );
      await q(`INSERT INTO consents (candidate_id, purpose) VALUES ($1,'event')`, [id]);
      if (n % 3 !== 2) await q(`INSERT INTO consents (candidate_id, purpose, expires_at) VALUES ($1,'talent_pool', now() + interval '12 months')`, [id]);
      await q(
        `INSERT INTO candidate_documents (candidate_id, cv_text, cv_facts, linkedin_url, linkedin_facts, linkedin_checks) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, cvText(p.name, p.cv), JSON.stringify(p.cv), li ? `linkedin.com/in/${slug(p.name)}-demo` : null, li ? JSON.stringify(li) : null, JSON.stringify(checks)],
      );
      await q(
        `INSERT INTO candidate_background (candidate_id, finnish_speaker, has_degree, career_changer) VALUES ($1,$2,$3,$4)`,
        [id, !!fi && ["B2", "C1", "C2", "Native"].includes(fi.level), p.cv.education.some((e) => e.degree !== "Vocational") /* university path, incl. current students */, p.careerChanger],
      );

      for (const companyId of p.applies) {
        const appId = `${id}.${companyId}`;
        const starter = p.starter ?? null;
        await q(
          `INSERT INTO applications (id, candidate_id, company_id, role_id, available, starter_answer, submitted_at)
           VALUES ($1,$2,$3,$4,true,$5, now() - ($6 || ' hours')::interval)`,
          [appId, id, companyId, roleByCompany.get(companyId), starter, String(48 - n)],
        );
        for (const req of requirementsByCompany.get(companyId) ?? []) {
          const ev = evidenceFor(req, p.cv, li, p.cv.languages);
          const proof = p.proofs?.[req.type];
          await q(
            `INSERT INTO evidence (application_id, requirement_id, value, meets, source, proof_type, proof_ref, linkedin_match)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [appId, req.id, ev.value, ev.meets, ev.source, proof?.type ?? null, proof?.ref ?? null, ev.linkedinMatch],
          );
        }
      }
    }

    // Demo "after the event": meetings already held for companies OTHER than Nordic Photonics (which stays
    // untouched for the live selection demo). Approvals are logged like real decisions; feedback is synthetic.
    const held = await q<{ id: string; company_id: string }>(
      `SELECT a.id, a.company_id FROM applications a
       WHERE a.company_id IN ('quantumlab', 'finnsensor', 'luxbeam', 'chipworks')
         AND NOT EXISTS (SELECT 1 FROM evidence e JOIN requirements r ON r.id = e.requirement_id
                         WHERE e.application_id = a.id AND r.must_have AND e.meets IS FALSE)
       ORDER BY a.company_id, a.id`,
    );
    const pendingDemo = held.find((h) => h.company_id === "quantumlab")?.id; // left without answers for the live demo
    for (const [i, h] of held.entries()) {
      await q(`UPDATE applications SET status = 'approved' WHERE id = $1`, [h.id]);
      await q(`INSERT INTO decisions (application_id, organiser, action, batch, rule, created_at) VALUES ($1, 'Laura (organiser, demo)', 'approve', true, 'must-haves met, nothing to check', now() - interval '2 days')`, [h.id]);
      if (h.id === pendingDemo) continue;
      // Deterministic synthetic pattern: about 3 in 4 meetings end with both sides wanting to continue.
      const company = i % 5 !== 3;
      const candidate = i % 7 !== 5;
      await q(`INSERT INTO meeting_feedback (application_id, side, wants_to_continue) VALUES ($1, 'company', $2), ($1, 'candidate', $3)`, [h.id, company, candidate]);
    }
  });

  console.log(`seeded: 1 event, ${COMPANIES.length} companies, ${CANDIDATES.length} candidates (synthetic)`);
}

main()
  .catch((err) => {
    const e = err as { code?: string; message?: string };
    const sqlError = typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code);
    console.error("seed failed:", sqlError ? `${e.code} ${e.message}` : err instanceof Error && !e.code ? err.message : (e.code ?? classifyError(err)));
    process.exitCode = 1;
  })
  .finally(() => closeDb());
