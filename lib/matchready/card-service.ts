import "server-only";
import { scrapeCompanyPage } from "@/lib/contextdev";
import { query, withTransaction } from "@/lib/db";
import { generateJSON } from "@/lib/gemini";
import { COMPANY_CARD_SYSTEM, companyCardPrompt } from "@/lib/prompts/company-card";
import type { Sourced } from "@/lib/service";
import { MAX_CARD_QUESTIONS, MAX_COMPANY_PAGE_CHARS } from "./config";
import { ModelCard, type CardRequirement, type CompanyCardDraft, type PoolStats, type ReqType } from "./card-schema";
import { evidenceFor, requirementText, toCefr, type CvFacts, type LanguageSkill, type LinkedinFacts, type Requirement } from "./facts";


export interface CompanyInfo {
  id: string;
  name: string;
  website: string | null;
  field: string | null;
  eventFields: string[];
  status: "draft" | "confirmed";
}

export async function getCompany(companyId: string): Promise<CompanyInfo | null> {
  const [c] = await query<{ id: string; name: string; website: string | null; field: string | null; fields: string[]; status: "draft" | "confirmed" }>(
    `SELECT c.id, c.name, c.website, c.field, e.fields, cc.status
     FROM companies c JOIN events e ON e.id = c.event_id JOIN company_cards cc ON cc.company_id = c.id WHERE c.id = $1`,
    [companyId],
  );
  return c ? { id: c.id, name: c.name, website: c.website, field: c.field, eventFields: c.fields, status: c.status } : null;
}

/** Endings we accept for a link written without https://. Anything else ("node.js", "M.Sc") is ordinary text. */
const BARE_LINK_TLDS = new Set([
  "fi", "com", "org", "net", "io", "eu", "dev", "ai", "co", "app", "tech", "info", "biz", "se", "no", "dk", "ee", "de", "fr", "nl", "uk", "us", "ch", "at", "es", "it", "pl",
  "example", "test", // reserved names used by the synthetic companies
]);
/** Technology names that look like domains. */
const NOT_A_SITE = new Set(["asp.net", "vb.net", "ado.net", "ml.net", "socket.io"]);
const trimLink = (s: string) => s.replace(/[.,;:!?]+$/, "");

/**
 * First link in the text. With http(s):// anything goes; without it (e.g.
 * "nordicphotonics.example/careers") only a host with a known ending counts, never part of an
 * email address and never a technology name such as "Node.js" or "ASP.NET".
 */
export function findUrl(text: string): string | null {
  const explicit = text.match(/\bhttps?:\/\/[^\s<>"')]+/i);
  if (explicit) return trimLink(explicit[0]);
  for (const m of text.matchAll(/(?<![@\w.-])((?:[a-z0-9-]+\.)+([a-z]{2,}))(\/[^\s<>"')]*)?/gi)) {
    const host = m[1].toLowerCase();
    if (!BARE_LINK_TLDS.has(m[2].toLowerCase()) || NOT_A_SITE.has(host)) continue;
    if (text[(m.index ?? 0) + m[0].length] === "@") continue; // local part of an email address
    return `https://${trimLink(m[0])}`;
  }
  return null;
}

const LEVEL_WORDS: [RegExp, string][] = [
  [/native|mother/i, "C2"],
  [/fluent|excellent/i, "C1"],
  [/good/i, "B2"],
  [/basic/i, "A2"],
];
/** Required language level as a CEFR value (A1–C2). Words map like the prompt says; anything else → null (no level). */
export function requiredLevel(raw: string | null | undefined): string | null {
  const cefr = toCefr(raw);
  if (cefr) return cefr === "Native" ? "C2" : cefr;
  return LEVEL_WORDS.find(([re]) => re.test(raw ?? ""))?.[1] ?? null;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
function verified(quote: string, sources: string[]): string | undefined {
  const q = quote.trim();
  return q && sources.some((s) => norm(s).includes(norm(q))) ? q : undefined;
}

/** Synthetic fallback when Gemini is unavailable (clearly sample data, everything marked as suggested). */
function stubModel(fields: string[]): ModelCard {
  return {
    summary: { value: "", status: "missing", quote: "" },
    event_goal: { value: "", status: "missing", quote: "" },
    field: fields[0] ?? "",
    goals: { value: ["fill"], status: "guessed" },
    roles: [
      {
        title: { value: "", status: "missing", quote: "" },
        details: "",
        conversation_starter: "Describe a project you are proud of. What did you do yourself?",
        requirements: [{ type: "language", label: "English", min_years: 0, level: "B2", detail: "", must_have: true, keywords: ["english"], status: "guessed", quote: "" }],
      },
    ],
    questions: [{ target: "role_title", question: "Which role are you hiring for?", options: [], suggested: "" }],
  };
}

export function toDraft(model: ModelCard, src: { text: string; page: string | null; url: string | null; urlOk: boolean; fields: string[] }): CompanyCardDraft {
  const sources = [src.text, src.page ?? ""];
  const roles = model.roles.slice(0, 3).map((r, ri) => ({
    key: `role-${ri + 1}`,
    title: r.title.value.trim(),
    details: r.details.trim(),
    starter: r.conversation_starter.trim(),
    requirements: r.requirements.slice(0, 8).map((q, qi): CardRequirement => {
      const quote = q.status === "found" ? verified(q.quote, sources) : undefined;
      return {
        key: `r${ri + 1}-${qi + 1}`,
        type: q.type as ReqType,
        label: q.label.trim(),
        minYears: q.type === "experience" && q.min_years > 0 ? q.min_years : null,
        level: q.type === "language" ? requiredLevel(q.level) : null,
        detail: q.type === "education" && q.detail ? q.detail.trim() : null,
        mustHave: q.must_have,
        keywords: q.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean).slice(0, 4),
        origin: quote ? "text" : "ai",
        ...(quote ? { quote } : {}),
      };
    }),
  }));

  const reqCount = roles[0]?.requirements.length ?? 0;
  const seen = new Set<string>();
  const questions = model.questions
    .filter((q) => {
      const t = q.target.trim();
      const m = /^req:(\d+):(must_have|min_years|level)$/.exec(t);
      if (m && Number(m[1]) >= reqCount) return false;
      if (!m && !["goals", "event_goal", "role_title"].includes(t)) return false;
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    })
    .slice(0, MAX_CARD_QUESTIONS)
    .map((q, i) => {
      const options = q.options.map((o) => o.trim()).filter(Boolean).slice(0, 4);
      return { id: `q${i}`, target: q.target.trim(), question: q.question.trim(), options, suggested: options.includes(q.suggested) ? q.suggested : undefined };
    });

  // A degree mentioned as "an advantage" quietly excludes people if read as required, so always ask about it.
  const firstReqs = roles[0]?.requirements ?? [];
  const softDegree = firstReqs.findIndex((r) => r.type === "education" && !r.mustHave && /phd|msc|master|doctor/i.test(r.label));
  if (softDegree >= 0 && !questions.some((q) => q.target === `req:${softDegree}:must_have`)) {
    const degree = firstReqs[softDegree].label.match(/phd|msc/i)?.[0].replace(/^phd$/i, "PhD").replace(/^msc$/i, "MSc") ?? firstReqs[softDegree].label;
    const q = {
      id: "q-degree",
      target: `req:${softDegree}:must_have`,
      question: `${src.page ? "The job ad" : "Your text"} mentions a ${degree}. Is it required?`,
      options: ["Yes, required", "No, nice to have"],
      suggested: "No, nice to have",
    };
    if (questions.length >= MAX_CARD_QUESTIONS) questions.pop();
    questions.unshift(q);
  }

  return {
    summary: model.summary.value.trim(),
    eventGoal: model.event_goal.value.trim(),
    field: src.fields.includes(model.field) ? model.field : "",
    goals: [...new Set(model.goals.value)],
    roles,
    questions,
    sourceText: [src.text, src.page ? `\n\n--- Page read from ${src.url} ---\n${src.page}` : ""].join(""),
    readUrl: src.url,
    readUrlOk: src.urlOk,
  };
}

/** Company input → card draft. Reads a linked page via Context.dev (company websites only). */
export async function draftCard(companyId: string, text: string): Promise<Sourced<CompanyCardDraft> | null> {
  const company = await getCompany(companyId);
  if (!company) return null;

  const url = findUrl(text) ?? (text.trim() ? null : company.website ? `https://${company.website}` : null);
  let page: string | null = null;
  if (url) {
    const scraped = await scrapeCompanyPage(url);
    if (scraped.source === "live" && scraped.data) page = scraped.data.markdown.slice(0, MAX_COMPANY_PAGE_CHARS);
  }

  const result = await generateJSON({
    schema: ModelCard,
    system: COMPANY_CARD_SYSTEM,
    prompt: companyCardPrompt({ companyName: company.name, fields: company.eventFields, text, page }),
    stub: stubModel(company.eventFields),
    temperature: 0.2,
  });
  const draft = toDraft(result.data, { text, page, url, urlOk: Boolean(page), fields: company.eventFields });
  // The organiser already placed the company in a field; the model only fills it when that is missing.
  if (company.field) draft.field = company.field;
  return result.source === "live" ? { source: "live", data: draft } : { source: "stub", data: draft, reason: result.reason };
}

/* ---------------- Pool stats (aggregate only) ---------------- */

interface PoolRow {
  candidate_id: string;
  fields: string[];
  languages: LanguageSkill[];
  cv_facts: CvFacts | null;
}

function toRequirement(r: CardRequirement, id = r.key): Requirement {
  return { id, type: r.type, label: r.label, minYears: r.minYears, level: r.level, detail: r.detail, mustHave: r.mustHave, keywords: r.keywords.length ? r.keywords : [r.label] };
}

export async function poolStats(field: string | null, requirements: CardRequirement[]): Promise<PoolStats> {
  const rows = await query<PoolRow>(
    `SELECT p.candidate_id, p.fields, p.languages, d.cv_facts
     FROM pool_profiles p JOIN consents k ON k.candidate_id = p.candidate_id AND k.purpose = 'event' AND k.withdrawn_at IS NULL
     LEFT JOIN candidate_documents d ON d.candidate_id = p.candidate_id
     WHERE $1::text IS NULL OR $1 = ANY (p.fields)`,
    [field || null],
  );
  const musts = requirements.filter((r) => r.mustHave).map((r) => toRequirement(r));
  const withCv = rows.filter((r) => r.cv_facts);
  const meets = (row: PoolRow, req: Requirement) => evidenceFor(req, row.cv_facts!, null, row.languages).meets === true;
  return {
    field: field || null,
    inField: rows.length,
    matchAll: musts.length ? withCv.filter((row) => musts.every((m) => meets(row, m))).length : withCv.length,
    perMustHave: musts.map((m) => ({ text: requirementText(m), count: withCv.filter((row) => meets(row, m)).length })),
  };
}

/** Back to an empty draft card. Refuses when the company already has applications. */
export async function resetDraft(companyId: string): Promise<boolean> {
  return withTransaction(async (q) => {
    const [n] = await q<{ n: number }>(`SELECT count(*)::int AS n FROM applications WHERE company_id = $1`, [companyId]);
    if (!n || n.n > 0) return false;
    await q(`UPDATE company_cards SET status = 'draft', goals = '{}', summary = NULL, event_goal = NULL, draft_json = NULL, confirmed_at = NULL, updated_at = now() WHERE company_id = $1`, [companyId]);
    await q(`DELETE FROM requirements WHERE role_id IN (SELECT id FROM roles WHERE company_id = $1)`, [companyId]);
    await q(`DELETE FROM roles WHERE company_id = $1 AND position > 0`, [companyId]);
    await q(`UPDATE roles SET title = 'Not filled in yet', details = NULL, conversation_starter = NULL WHERE company_id = $1`, [companyId]);
    return true;
  });
}

/* ---------------- Save + confirm ---------------- */

export interface SaveCardInput {
  companyId: string;
  summary: string;
  eventGoal: string;
  field: string;
  goals: string[];
  roles: { title: string; details: string; starter: string; requirements: CardRequirement[] }[];
  sourceText: string;
}

/**
 * Saves the confirmed card, replaces roles/requirements, and recomputes evidence for
 * applications that already exist (code, from stored CV facts — no AI call, no scores).
 */
export async function saveConfirmedCard(input: SaveCardInput): Promise<void> {
  await withTransaction(async (q) => {
    await q(
      `UPDATE company_cards SET goals = $2, summary = $3, event_goal = $4, status = 'confirmed', source_text = $5,
              confirmed_at = coalesce(confirmed_at, now()), updated_at = now() WHERE company_id = $1`,
      [input.companyId, input.goals, input.summary || null, input.eventGoal || null, input.sourceText || null],
    );
    await q(`UPDATE companies SET field = $2 WHERE id = $1`, [input.companyId, input.field || null]);

    // Keep application ↔ role links: the first role keeps its id.
    const oldRoles = await q<{ id: string }>(`SELECT id FROM roles WHERE company_id = $1 ORDER BY position`, [input.companyId]);
    // What the candidate added themselves (a typed value, a proof) must survive the company editing its card.
    // It is re-attached to the requirement with the same type and label; if the label changed, to one of the same type.
    const kept = await q<{ application_id: string; type: string; label: string; value: string | null; source: string; proof_type: string | null; proof_ref: string | null }>(
      `SELECT e.application_id, r.type, r.label, e.value, e.source, e.proof_type, e.proof_ref FROM evidence e JOIN requirements r ON r.id = e.requirement_id
       JOIN applications a ON a.id = e.application_id WHERE a.company_id = $1 AND (e.proof_type IS NOT NULL OR e.source = 'stated')`,
      [input.companyId],
    );
    await q(`DELETE FROM requirements WHERE role_id IN (SELECT id FROM roles WHERE company_id = $1)`, [input.companyId]);
    await q(`DELETE FROM roles WHERE company_id = $1 AND position > 0`, [input.companyId]);

    const reqsForEvidence: Requirement[] = [];
    for (const [ri, role] of input.roles.entries()) {
      const roleId = ri === 0 && oldRoles[0] ? oldRoles[0].id : `${input.companyId}.role.${ri + 1}`;
      if (ri === 0 && oldRoles[0]) {
        await q(`UPDATE roles SET title = $2, details = $3, conversation_starter = $4 WHERE id = $1`, [roleId, role.title, role.details || null, role.starter || null]);
      } else {
        await q(`INSERT INTO roles (id, company_id, title, details, conversation_starter, position) VALUES ($1,$2,$3,$4,$5,$6)`, [roleId, input.companyId, role.title, role.details || null, role.starter || null, ri]);
      }
      for (const [i, r] of role.requirements.entries()) {
        const id = `${roleId}.req.${i + 1}`;
        const keywords = r.keywords.length ? r.keywords : [r.label.toLowerCase()];
        await q(
          `INSERT INTO requirements (id, role_id, type, label, min_years, level, detail, must_have, position, keywords) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [id, roleId, r.type, r.label, r.minYears, r.type === "language" ? requiredLevel(r.level) : null, r.detail, r.mustHave, i, keywords],
        );
        if (ri === 0) reqsForEvidence.push({ ...toRequirement(r, id), keywords });
      }
    }

    const apps = await q<{ id: string; cv_facts: CvFacts | null; linkedin_facts: LinkedinFacts | null; languages: LanguageSkill[] | null }>(
      `SELECT a.id, d.cv_facts, d.linkedin_facts, p.languages FROM applications a
       LEFT JOIN candidate_documents d ON d.candidate_id = a.candidate_id
       LEFT JOIN pool_profiles p ON p.candidate_id = a.candidate_id WHERE a.company_id = $1`,
      [input.companyId],
    );
    for (const a of apps) {
      if (!a.cv_facts) continue;
      const mine = kept.filter((k) => k.application_id === a.id);
      const used = new Set<(typeof kept)[number]>();
      const sameLabel = (x: string, y: string) => x.trim().toLowerCase() === y.trim().toLowerCase();
      // Exact requirement first, so a leftover row is only moved when its own requirement is gone.
      const exact = new Map(reqsForEvidence.map((req) => [req.id, mine.find((k) => k.type === req.type && sameLabel(k.label, req.label))]));
      for (const k of exact.values()) if (k) used.add(k);
      for (const req of reqsForEvidence) {
        const ev = evidenceFor(req, a.cv_facts, a.linkedin_facts, a.languages ?? undefined);
        const old = exact.get(req.id) ?? mine.find((k) => k.type === req.type && !used.has(k));
        if (old) used.add(old);
        // A typed value stays "stated by candidate" (meets unknown): the organiser decides, not the recompute.
        const stated = old?.source === "stated";
        await q(
          `INSERT INTO evidence (application_id, requirement_id, value, meets, source, linkedin_match, proof_type, proof_ref) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [a.id, req.id, stated ? old.value : ev.value, stated ? null : ev.meets, stated ? "stated" : ev.source, stated ? null : ev.linkedinMatch, old?.proof_type ?? null, old?.proof_ref ?? null],
        );
      }
    }
  });
}
