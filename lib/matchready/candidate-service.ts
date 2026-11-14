import "server-only";
import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db";
import { chatJSON } from "@/lib/gemma";
import { CV_PARSE_SYSTEM, cvParsePrompt } from "@/lib/prompts/cv-parse";
import { MAX_COMPANIES_PER_CANDIDATE, MAX_DOCUMENT_CHARS } from "./config";
import { EVENT } from "./event";
import { CvParse } from "./cv-schema";
import {
  compareCvLinkedin,
  evidenceFor,
  requirementText,
  type CvFacts,
  type LanguageSkill,
  type LinkedinCheck,
  type LinkedinFacts,
  type Requirement,
  type RequirementType,
} from "./facts";
import { accessCode } from "./tavata";

/**
 * Candidate side. Candidate text (CV, LinkedIn export, answers) goes ONLY to Gemma on our
 * EU server, never to Gemini or any other external API. Comparisons are done by code.
 */


/** Talent-pool choices come from the event configuration (lib/matchready/event.ts), not from this file. */
export const WORK_TYPES = EVENT.workTypes;
export const CAREER_STAGES = EVENT.careerStages;

/* ---------------- Stage 1: talent pool ---------------- */

export interface JoinInput {
  fields: string[];
  workType: string;
  stage: "student" | "early" | "experienced" | "senior";
  languages: LanguageSkill[];
  email: string;
  consentPool: boolean;
  cvText: string | null;
}

type Q = Parameters<Parameters<typeof withTransaction>[0]>[0];

async function nextCode(q: Q): Promise<string> {
  const [r] = await q<{ n: number | null }>(`SELECT max(substring(code from 3)::int) AS n FROM candidates WHERE code ~ '^A-[0-9]+$'`);
  return `A-${String((r?.n ?? 0) + 1).padStart(2, "0")}`;
}

export async function joinPool(input: JoinInput): Promise<string> {
  const id = `cand.${randomUUID()}`;
  await withTransaction(async (q) => {
    const [event] = await q<{ id: string }>(`SELECT id FROM events LIMIT 1`);
    const code = await nextCode(q);
    await q(`INSERT INTO candidates (id, event_id, code) VALUES ($1,$2,$3)`, [id, event.id, code]);
    await q(`INSERT INTO candidate_identity (candidate_id, full_name, email) VALUES ($1, NULL, $2)`, [id, input.email]);
    await q(`INSERT INTO pool_profiles (candidate_id, fields, work_type, career_stage, languages) VALUES ($1,$2,$3,$4,$5)`, [
      id, input.fields, input.workType, input.stage, JSON.stringify(input.languages),
    ]);
    await q(`INSERT INTO consents (candidate_id, purpose) VALUES ($1, 'event')`, [id]);
    if (input.consentPool) await q(`INSERT INTO consents (candidate_id, purpose, expires_at) VALUES ($1, 'talent_pool', now() + interval '12 months')`, [id]);
    await q(`INSERT INTO candidate_documents (candidate_id, cv_text) VALUES ($1, $2)`, [id, input.cvText]);
  });
  return id;
}

/* ---------------- Status ---------------- */

export interface CandidateView {
  id: string;
  code: string;
  fields: string[];
  languages: LanguageSkill[];
  hasCv: boolean;
  cvParsed: boolean;
  hasLinkedin: boolean;
  applications: { companyId: string; company: string; role: string | null; status: "submitted" | "approved" | "declined"; accessCode: string | null }[];
}

export async function getCandidate(id: string): Promise<CandidateView | null> {
  const [c] = await query<{ code: string; fields: string[]; languages: LanguageSkill[]; cv_text: string | null; cv_facts: CvFacts | null; linkedin_facts: LinkedinFacts | null }>(
    `SELECT c.code, p.fields, p.languages, d.cv_text, d.cv_facts, d.linkedin_facts
     FROM candidates c JOIN pool_profiles p ON p.candidate_id = c.id LEFT JOIN candidate_documents d ON d.candidate_id = c.id WHERE c.id = $1`,
    [id],
  );
  if (!c) return null;
  const apps = await query<{ id: string; company_id: string; company: string; role: string | null; status: "submitted" | "approved" | "declined" }>(
    `SELECT a.id, a.company_id, co.name AS company, r.title AS role, a.status FROM applications a
     JOIN companies co ON co.id = a.company_id LEFT JOIN roles r ON r.id = a.role_id WHERE a.candidate_id = $1 ORDER BY co.name`,
    [id],
  );
  return {
    id,
    code: c.code,
    fields: c.fields,
    languages: c.languages,
    hasCv: Boolean(c.cv_text),
    cvParsed: Boolean(c.cv_facts),
    hasLinkedin: Boolean(c.linkedin_facts),
    applications: apps.map((a) => ({ companyId: a.company_id, company: a.company, role: a.role, status: a.status, accessCode: a.status === "approved" ? accessCode(a.id) : null })),
  };
}

/* ---------------- Invitation ---------------- */

export interface InvitedCompany {
  id: string;
  name: string;
  field: string | null;
  summary: string | null;
  role: { id: string; title: string; details: string | null; starter: string | null } | null;
  requirements: (Requirement & { text: string })[];
}

export async function confirmedCompanies(): Promise<InvitedCompany[]> {
  const rows = await query<{
    id: string; name: string; field: string | null; summary: string | null; role_id: string | null; title: string | null; details: string | null; starter: string | null;
  }>(
    `SELECT c.id, c.name, c.field, cc.summary, r.id AS role_id, r.title, r.details, r.conversation_starter AS starter
     FROM companies c JOIN company_cards cc ON cc.company_id = c.id
     LEFT JOIN LATERAL (SELECT * FROM roles WHERE company_id = c.id ORDER BY position LIMIT 1) r ON true
     WHERE cc.status = 'confirmed' ORDER BY c.name`,
  );
  const reqs = await query<{ role_id: string; id: string; type: RequirementType; label: string; min_years: string | null; level: string | null; detail: string | null; must_have: boolean; keywords: string[] }>(
    `SELECT role_id, id, type, label, min_years::text, level, detail, must_have, keywords FROM requirements ORDER BY position`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    field: r.field,
    summary: r.summary,
    role: r.role_id ? { id: r.role_id, title: r.title ?? "", details: r.details, starter: r.starter } : null,
    requirements: reqs
      .filter((q) => q.role_id === r.role_id)
      .map((q) => {
        const req: Requirement = { id: q.id, type: q.type, label: q.label, minYears: q.min_years ? Number(q.min_years) : null, level: q.level, detail: q.detail, mustHave: q.must_have, keywords: q.keywords };
        return { ...req, text: requirementText(req) };
      }),
  }));
}

export async function addField(candidateId: string, field: string): Promise<void> {
  await query(`UPDATE pool_profiles SET fields = array_append(fields, $2) WHERE candidate_id = $1 AND NOT ($2 = ANY (fields))`, [candidateId, field]);
}

/* ---------------- Documents (Gemma) ---------------- */

export async function pdfToText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

export function toFacts(p: CvParse): CvFacts {
  const month = (s: string) => (/^\d{4}-\d{2}$/.test(s) ? s : /^\d{4}$/.test(s) ? `${s}-01` : null);
  return {
    experience: p.experience
      .map((e) => ({ title: e.title.trim(), employer: e.employer.trim(), start: month(e.start) ?? "", end: month(e.end), areas: e.areas.map((a) => a.toLowerCase().trim()), tasks: e.tasks }))
      .filter((e) => e.start && e.employer),
    education: p.education.map((e) => ({ degree: e.degree, field: e.field, year: e.year, inProgress: e.inProgress })),
    languages: p.languages,
    skills: p.skills.slice(0, 12),
  };
}

export interface ParseResult {
  ok: boolean;
  source: "live" | "stub";
  facts: CvFacts | null;
  checks: LinkedinCheck[];
}

/** Reads a CV or LinkedIn export with Gemma, stores text + facts, and recomputes the CV ↔ LinkedIn checks. */
export async function parseDocument(candidateId: string, kind: "cv" | "linkedin", rawText: string, topics: string[]): Promise<ParseResult> {
  const text = rawText.replace(/\u0000/g, "").slice(0, MAX_DOCUMENT_CHARS);
  const empty: CvParse = { experience: [], education: [], languages: [], skills: [] };
  const result = await chatJSON({
    schema: CvParse,
    messages: [
      { role: "system", content: CV_PARSE_SYSTEM },
      { role: "user", content: cvParsePrompt({ kind, text, topics }) },
    ],
    stub: empty,
    temperature: 0,
  });
  const facts = toFacts(result.data);

  // Gemma down or invalid output: keep whatever was stored before. An empty stub must never
  // overwrite real facts or turn every job into "not on LinkedIn".
  if (result.source === "stub") {
    const [kept] = await query<{ linkedin_checks: LinkedinCheck[] | null }>(`SELECT linkedin_checks FROM candidate_documents WHERE candidate_id = $1`, [candidateId]);
    if (kind === "cv") await query(`UPDATE candidate_documents SET cv_text = coalesce(cv_text, $2), updated_at = now() WHERE candidate_id = $1`, [candidateId, text]);
    return { ok: false, source: "stub", facts: null, checks: kept?.linkedin_checks ?? [] };
  }

  const [doc] = await query<{ cv_facts: CvFacts | null; linkedin_facts: LinkedinFacts | null }>(
    `SELECT cv_facts, linkedin_facts FROM candidate_documents WHERE candidate_id = $1`,
    [candidateId],
  );
  const cv = kind === "cv" ? facts : doc?.cv_facts ?? null;
  const li: LinkedinFacts | null =
    kind === "linkedin"
      ? { experience: facts.experience.map(({ title, employer, start, end }) => ({ title, employer, start, end })), education: facts.education.filter((e) => !e.inProgress).map(({ degree, field, year }) => ({ degree, field, year })), skills: facts.skills }
      : doc?.linkedin_facts ?? null;
  const checks = cv ? compareCvLinkedin(cv, li) : [];

  if (kind === "cv") {
    await query(`UPDATE candidate_documents SET cv_text = $2, cv_facts = $3, linkedin_checks = $4, updated_at = now() WHERE candidate_id = $1`, [
      candidateId, text, JSON.stringify(facts), JSON.stringify(checks),
    ]);
  } else {
    await query(`UPDATE candidate_documents SET linkedin_facts = $2, linkedin_checks = $3, updated_at = now() WHERE candidate_id = $1`, [
      candidateId, JSON.stringify(li), JSON.stringify(checks),
    ]);
  }
  const ok = result.source === "live" && facts.experience.length + facts.education.length > 0;
  return { ok, source: result.source, facts, checks };
}

export async function setLinkedinUrl(candidateId: string, url: string): Promise<void> {
  await query(`UPDATE candidate_documents SET linkedin_url = $2 WHERE candidate_id = $1`, [candidateId, url || null]);
}

/* ---------------- Stage 2: evidence preview + submit ---------------- */

export interface EvidenceRow {
  requirementId: string;
  text: string;
  type: RequirementType;
  mustHave: boolean;
  value: string | null;
  meets: boolean | null;
  linkedinMatch: boolean | null;
}

export async function evidencePreview(candidateId: string, companyIds: string[]): Promise<{ companyId: string; rows: EvidenceRow[] }[]> {
  const [doc] = await query<{ cv_facts: CvFacts | null; linkedin_facts: LinkedinFacts | null; languages: LanguageSkill[] }>(
    `SELECT d.cv_facts, d.linkedin_facts, p.languages FROM pool_profiles p LEFT JOIN candidate_documents d ON d.candidate_id = p.candidate_id WHERE p.candidate_id = $1`,
    [candidateId],
  );
  const companies = (await confirmedCompanies()).filter((c) => companyIds.includes(c.id));
  return companies.map((c) => ({
    companyId: c.id,
    rows: c.requirements.map((r) => {
      const ev = doc?.cv_facts ? evidenceFor(r, doc.cv_facts, doc.linkedin_facts, doc.languages) : null;
      return { requirementId: r.id, text: r.text, type: r.type, mustHave: r.mustHave, value: ev?.value ?? null, meets: ev?.meets ?? null, linkedinMatch: ev?.linkedinMatch ?? null };
    }),
  }));
}

export interface SubmitInput {
  candidateId: string;
  available: boolean;
  applications: {
    companyId: string;
    starter: string;
    /** Values the candidate typed for a requirement (overrides the CV prefill). */
    stated: Record<string, string>;
    proofs: Record<string, { type: "diploma" | "certificate" | "link" | "reference"; ref: string }>;
  }[];
}

export async function submitApplications(input: SubmitInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const [doc] = await query<{ cv_facts: CvFacts | null; linkedin_facts: LinkedinFacts | null; languages: LanguageSkill[] }>(
    `SELECT d.cv_facts, d.linkedin_facts, p.languages FROM pool_profiles p LEFT JOIN candidate_documents d ON d.candidate_id = p.candidate_id WHERE p.candidate_id = $1`,
    [input.candidateId],
  );
  if (!doc) return { ok: false, error: "We could not find your registration." };
  if (!doc.cv_facts) return { ok: false, error: "Upload your CV first. It fills in the table for you." };

  const companies = await confirmedCompanies();
  const wanted = [...new Map(input.applications.map((a) => [a.companyId, a])).values()];
  const unknown = wanted.filter((a) => !companies.some((c) => c.id === a.companyId));
  if (unknown.length) return { ok: false, error: "One of the companies is no longer open for applications. Go back and choose again." };
  const existing = await query<{ company_id: string }>(`SELECT company_id FROM applications WHERE candidate_id = $1`, [input.candidateId]);
  const fresh = wanted.filter((a) => !existing.some((e) => e.company_id === a.companyId));
  if (!fresh.length) return { ok: true }; // already sent (double click, back button)
  if (existing.length + fresh.length > MAX_COMPANIES_PER_CANDIDATE) return { ok: false, error: `You can apply to at most ${MAX_COMPANIES_PER_CANDIDATE} companies.` };

  await withTransaction(async (q) => {
    for (const a of fresh) {
      const company = companies.find((c) => c.id === a.companyId);
      if (!company) continue;
      const appId = `${input.candidateId}.${company.id}`;
      await q(
        `INSERT INTO applications (id, candidate_id, company_id, role_id, available, starter_answer) VALUES ($1,$2,$3,$4,$5,$6)`,
        [appId, input.candidateId, company.id, company.role?.id ?? null, input.available, a.starter.trim() || null],
      );
      for (const r of company.requirements) {
        const ev = evidenceFor(r, doc.cv_facts!, doc.linkedin_facts, doc.languages);
        const typed = a.stated[r.id]?.trim();
        const proof = a.proofs[r.id];
        // Typed by the candidate and different from the CV prefill → "stated by candidate"; the organiser decides.
        const stated = typed && typed !== ev.value;
        await q(
          `INSERT INTO evidence (application_id, requirement_id, value, meets, source, proof_type, proof_ref, linkedin_match) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [appId, r.id, stated ? typed : ev.value, stated ? null : ev.meets, stated ? "stated" : ev.source, proof?.type ?? null, proof?.ref.slice(0, 300) ?? null, stated ? null : ev.linkedinMatch],
        );
      }
    }
    // Aggregate-only facts for the organisers' bias check.
    const fi = doc.languages.find((l) => l.language.toLowerCase() === "finnish");
    await q(
      `INSERT INTO candidate_background (candidate_id, finnish_speaker, has_degree, career_changer) VALUES ($1,$2,$3,false)
       ON CONFLICT (candidate_id) DO UPDATE SET finnish_speaker = EXCLUDED.finnish_speaker, has_degree = EXCLUDED.has_degree`,
      [input.candidateId, !!fi && ["B2", "C1", "C2", "Native"].includes(fi.level), doc.cv_facts!.education.some((e) => e.degree !== "Vocational")],
    );
  });
  return { ok: true };
}
