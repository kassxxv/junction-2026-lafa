import "server-only";
import { query } from "@/lib/db";
import { BIAS_GAP_THRESHOLD, BIAS_MIN_APPROVALS } from "./config";
import { DEMO_ORGANISER } from "./demo";
import { needsLook, requirementText, type LinkedinCheck, type RequirementType } from "./facts";

/**
 * Read model for organisers. Blind by construction: no query here touches
 * candidate_identity, so names and emails cannot reach the review screens.
 * (Identity is joined only in the Tavata export, after approval.)
 */

/** Who is logged as the reviewer. One demo account until real organiser accounts exist (lib/matchready/demo.ts). */
export const ORGANISER = DEMO_ORGANISER.logName;

export type ReviewStatus = "approved" | "declined" | "missing" | "check" | "clean";

export interface EventInfo {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  format: string;
  fields: string[];
  companyDeadline: string;
  applicationDeadline: string;
  decisionDate: string;
  infoUrl: string | null;
}

export interface CompanyOverview {
  id: string;
  name: string;
  field: string | null;
  cardStatus: "draft" | "confirmed";
  places: number;
  roleTitle: string | null;
  applications: number;
  approved: number;
}

export interface Overview {
  event: EventInfo;
  companies: CompanyOverview[];
  poolSize: number;
  poolByField: { field: string; count: number }[];
  applications: number;
  approved: number;
  minutesPerPlace: number | null;
  bothYesRate: number | null;
}

export interface RequirementRow {
  id: string;
  type: RequirementType;
  text: string;
  mustHave: boolean;
  value: string | null;
  meets: boolean | null;
  source: "cv" | "profile" | "stated" | "none";
  proofType: string | null;
  proofRef: string | null;
  linkedinMatch: boolean | null;
}

export interface ApplicationRow {
  id: string;
  code: string;
  keyFact: string | null;
  status: ReviewStatus;
  mustMissing: number;
  /** Must-haves nobody could verify: typed by the candidate, or nothing found (meets = null). */
  mustUnverified: number;
  /** CV ↔ LinkedIn differences plus unverified must-haves: what an organiser has to look at. */
  toCheck: number;
  hasLinkedin: boolean;
  requirements: RequirementRow[];
  checks: LinkedinCheck[];
  starter: string | null;
}

export interface DecisionRow {
  at: string;
  organiser: string;
  code: string;
  action: string;
  note: string | null;
  batch: boolean;
  rule: string | null;
}

export interface BiasRow {
  label: string;
  applicants: number; // share 0..1
  approved: number | null; // share 0..1, null when nothing approved yet
}

export interface Review {
  company: { id: string; name: string; field: string | null; places: number; cardStatus: string };
  role: { title: string; details: string | null; starter: string | null } | null;
  applications: ApplicationRow[];
  decisions: DecisionRow[];
  bias: { rows: BiasRow[]; approvedCount: number; minApprovals: number; skew: "none" | "warning" | "too_few" };
  companies: { id: string; name: string; applications: number; approved: number; places: number }[];
}

export async function getEvent(): Promise<EventInfo> {
  const [e] = await query<{
    id: string; name: string; starts_on: string; ends_on: string; format: string; fields: string[];
    company_deadline: string; application_deadline: string; decision_date: string; info_url: string | null;
  }>(`SELECT id, name, starts_on::text, ends_on::text, format, fields, company_deadline::text,
             application_deadline::text, decision_date::text, info_url FROM events LIMIT 1`);
  return {
    id: e.id, name: e.name, startsOn: e.starts_on, endsOn: e.ends_on, format: e.format, fields: e.fields,
    companyDeadline: e.company_deadline, applicationDeadline: e.application_deadline, decisionDate: e.decision_date, infoUrl: e.info_url,
  };
}

export async function getOverview(): Promise<Overview> {
  const [event, companies, pool, totals, timing, feedback] = await Promise.all([
    getEvent(),
    query<{ id: string; name: string; field: string | null; status: "draft" | "confirmed"; places: number; role_title: string | null; applications: number; approved: number }>(
      `SELECT c.id, c.name, c.field, cc.status, cc.places,
              (SELECT title FROM roles r WHERE r.company_id = c.id ORDER BY position LIMIT 1) AS role_title,
              count(a.id)::int AS applications,
              count(a.id) FILTER (WHERE a.status = 'approved')::int AS approved
       FROM companies c JOIN company_cards cc ON cc.company_id = c.id
       LEFT JOIN applications a ON a.company_id = c.id
       GROUP BY c.id, cc.status, cc.places ORDER BY (cc.status = 'confirmed') DESC, count(a.id) DESC, c.name`,
    ),
    query<{ field: string; count: number }>(
      `SELECT f AS field, count(*)::int AS count FROM pool_profiles, unnest(fields) AS f GROUP BY f ORDER BY count DESC`,
    ),
    query<{ pool: number; applications: number; approved: number }>(
      `SELECT (SELECT count(*) FROM pool_profiles)::int AS pool,
              (SELECT count(*) FROM applications)::int AS applications,
              (SELECT count(*) FROM applications WHERE status = 'approved')::int AS approved`,
    ),
    query<{ minutes: number | null }>(
      `SELECT sum(extract(epoch FROM (coalesce(last_action_at, started_at) - started_at)) / 60)::float AS minutes FROM review_sessions`,
    ),
    query<{ meetings: number; both_yes: number }>(
      `SELECT count(*)::int AS meetings, count(*) FILTER (WHERE yes = 2)::int AS both_yes FROM (
         SELECT application_id, count(*) FILTER (WHERE wants_to_continue) AS yes
         FROM meeting_feedback GROUP BY application_id HAVING count(*) = 2) m`,
    ),
  ]);
  const t = totals[0];
  const minutes = timing[0]?.minutes ?? null;
  return {
    event,
    companies: companies.map((c) => ({
      id: c.id, name: c.name, field: c.field, cardStatus: c.status, places: c.places, roleTitle: c.role_title,
      applications: c.applications, approved: c.approved,
    })),
    poolSize: t.pool,
    poolByField: pool,
    applications: t.applications,
    approved: t.approved,
    minutesPerPlace: minutes !== null && t.approved > 0 ? minutes / t.approved : null,
    bothYesRate: feedback[0]?.meetings ? feedback[0].both_yes / feedback[0].meetings : null,
  };
}

function statusOf(appStatus: string, mustMissing: number, toCheck: number): ReviewStatus {
  if (appStatus === "approved") return "approved";
  if (appStatus === "declined") return "declined";
  if (mustMissing > 0) return "missing";
  if (toCheck > 0) return "check";
  return "clean";
}

export async function getReview(companyId: string): Promise<Review | null> {
  const [company] = await query<{ id: string; name: string; field: string | null; places: number; status: string }>(
    `SELECT c.id, c.name, c.field, cc.places, cc.status FROM companies c JOIN company_cards cc ON cc.company_id = c.id WHERE c.id = $1`,
    [companyId],
  );
  if (!company) return null;

  const [roles, apps, evidence, decisions, bias, companies] = await Promise.all([
    query<{ title: string; details: string | null; conversation_starter: string | null }>(
      `SELECT title, details, conversation_starter FROM roles WHERE company_id = $1 ORDER BY position LIMIT 1`,
      [companyId],
    ),
    query<{ id: string; code: string; status: string; starter_answer: string | null; checks: LinkedinCheck[] | null }>(
      `SELECT a.id, c.code, a.status, a.starter_answer, d.linkedin_checks AS checks
       FROM applications a JOIN candidates c ON c.id = a.candidate_id
       LEFT JOIN candidate_documents d ON d.candidate_id = a.candidate_id
       WHERE a.company_id = $1 ORDER BY c.code`,
      [companyId],
    ),
    query<{
      application_id: string; requirement_id: string; type: RequirementType; label: string; min_years: string | null;
      level: string | null; detail: string | null; must_have: boolean; value: string | null; meets: boolean | null;
      source: RequirementRow["source"]; proof_type: string | null; proof_ref: string | null; linkedin_match: boolean | null;
    }>(
      `SELECT e.application_id, r.id AS requirement_id, r.type, r.label, r.min_years::text, r.level, r.detail, r.must_have,
              e.value, e.meets, e.source, e.proof_type, e.proof_ref, e.linkedin_match
       FROM evidence e JOIN requirements r ON r.id = e.requirement_id
       JOIN applications a ON a.id = e.application_id
       WHERE a.company_id = $1 ORDER BY r.position`,
      [companyId],
    ),
    query<{ at: string; organiser: string; code: string; action: string; note: string | null; batch: boolean; rule: string | null }>(
      `SELECT to_char(dc.created_at AT TIME ZONE 'Europe/Helsinki', 'HH24:MI') AS at, dc.organiser, c.code, dc.action, dc.note, dc.batch, dc.rule
       FROM decisions dc JOIN applications a ON a.id = dc.application_id JOIN candidates c ON c.id = a.candidate_id
       WHERE a.company_id = $1 ORDER BY dc.created_at DESC, dc.id DESC LIMIT 50`,
      [companyId],
    ),
    query<{ approved: boolean; non_finnish: boolean; no_degree: boolean; career_changer: boolean }>(
      `SELECT a.status = 'approved' AS approved, NOT b.finnish_speaker AS non_finnish, NOT b.has_degree AS no_degree, b.career_changer
       FROM applications a JOIN candidate_background b ON b.candidate_id = a.candidate_id WHERE a.company_id = $1`,
      [companyId],
    ),
    query<{ id: string; name: string; applications: number; approved: number; places: number }>(
      `SELECT c.id, c.name, count(a.id)::int AS applications, count(a.id) FILTER (WHERE a.status = 'approved')::int AS approved, cc.places
       FROM companies c JOIN company_cards cc ON cc.company_id = c.id LEFT JOIN applications a ON a.company_id = c.id
       GROUP BY c.id, cc.places HAVING count(a.id) > 0 ORDER BY count(a.id) DESC`,
    ),
  ]);

  const byApp = new Map<string, RequirementRow[]>();
  for (const e of evidence) {
    const row: RequirementRow = {
      id: e.requirement_id,
      type: e.type,
      text: requirementText({ type: e.type, label: e.label, minYears: e.min_years ? Number(e.min_years) : null, level: e.level, detail: e.detail }),
      mustHave: e.must_have,
      value: e.value,
      meets: e.meets,
      source: e.source,
      proofType: e.proof_type,
      proofRef: e.proof_ref,
      linkedinMatch: e.linkedin_match,
    };
    byApp.set(e.application_id, [...(byApp.get(e.application_id) ?? []), row]);
  }

  const applications: ApplicationRow[] = apps.map((a) => {
    const reqs = byApp.get(a.id) ?? [];
    const checks = a.checks ?? [];
    const mustMissing = reqs.filter((r) => r.mustHave && r.meets === false).length;
    // "Clean" must mean every must-have is shown by a fact. Unknown is not the same as met.
    const mustUnverified = reqs.filter((r) => r.mustHave && r.meets === null).length;
    const toCheck = checks.filter(needsLook).length + mustUnverified;
    const first = reqs[0];
    return {
      id: a.id,
      code: a.code,
      keyFact: first?.value ?? null,
      status: statusOf(a.status, mustMissing, toCheck),
      mustMissing,
      mustUnverified,
      toCheck,
      hasLinkedin: !checks.some((c) => c.kind === "none"),
      requirements: reqs,
      checks,
      starter: a.starter_answer,
    };
  });

  const approvedRows = bias.filter((b) => b.approved);
  const share = (rows: typeof bias, key: "non_finnish" | "no_degree" | "career_changer") =>
    rows.length ? rows.filter((r) => r[key]).length / rows.length : 0;
  const biasRows: BiasRow[] = (
    [
      ["Non-Finnish speakers", "non_finnish"],
      ["No university education", "no_degree"],
      ["Career changers", "career_changer"],
    ] as const
  ).map(([label, key]) => ({
    label,
    applicants: share(bias, key),
    approved: approvedRows.length ? share(approvedRows, key) : null,
  }));
  // Thresholds: lib/matchready/config.ts. A large gap is worth a look; with few approvals, shares mean little.
  const skew =
    approvedRows.length < BIAS_MIN_APPROVALS
      ? "too_few"
      : biasRows.some((r) => r.approved !== null && r.applicants - r.approved > BIAS_GAP_THRESHOLD)
        ? "warning"
        : "none";

  return {
    company: { id: company.id, name: company.name, field: company.field, places: company.places, cardStatus: company.status },
    role: roles[0] ? { title: roles[0].title, details: roles[0].details, starter: roles[0].conversation_starter } : null,
    applications,
    decisions,
    bias: { rows: biasRows, approvedCount: approvedRows.length, minApprovals: BIAS_MIN_APPROVALS, skew },
    companies,
  };
}
