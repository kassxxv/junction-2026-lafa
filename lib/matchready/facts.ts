/**
 * Candidate facts and the code that compares them. Pure functions, no AI, no I/O.
 *
 * AI (Gemma) only turns CV / LinkedIn text into these structures. Everything below is
 * deterministic, so every result shown to organisers is a traceable fact — never a score,
 * never a ranking of people.
 */

import { DATE_TOLERANCE_MONTHS } from "./config";

export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native";
export type Degree = "Vocational" | "BSc" | "MSc" | "PhD";

export interface Experience {
  title: string;
  employer: string;
  start: string; // YYYY-MM
  end: string | null; // null = current
  /** Short topic tags, e.g. "optical testing", "lab equipment". */
  areas: string[];
  tasks: string[];
}

export interface Education {
  degree: Degree;
  field: string;
  year: number;
  inProgress?: boolean;
}

export interface LanguageSkill {
  language: string;
  level: Cefr;
}

export interface CvFacts {
  experience: Experience[];
  education: Education[];
  languages: LanguageSkill[];
  skills: string[];
}

/** What we can see on a LinkedIn profile (demo: synthetic stand-in for the live profile). */
export interface LinkedinFacts {
  experience: Pick<Experience, "title" | "employer" | "start" | "end">[];
  education: Pick<Education, "degree" | "field" | "year">[];
  skills: string[];
}

export type LinkedinCheck =
  | { kind: "match"; text: string }
  | { kind: "differs"; text: string }
  | { kind: "not_found"; text: string }
  | { kind: "none"; text: string };

export type RequirementType = "experience" | "has_done" | "education" | "language";

export interface Requirement {
  id: string;
  type: RequirementType;
  label: string;
  minYears?: number | null;
  level?: string | null;
  detail?: string | null;
  mustHave: boolean;
  keywords: string[];
}

export interface Evidence {
  requirementId: string;
  value: string | null;
  /** true = the stated fact covers the requirement; false = it does not; null = nothing found. */
  meets: boolean | null;
  source: "cv" | "profile" | "stated" | "none";
  linkedinMatch: boolean | null;
}

/** "Today" as YYYY-MM: the end of jobs that are still running. Seed data and evals pass a fixed month instead. */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

const CEFR_RANK: Record<Cefr, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6, Native: 7 };
const DEGREE_RANK: Record<Degree, number> = { Vocational: 1, BSc: 2, MSc: 3, PhD: 4 };

function monthIndex(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}

export function months(e: Pick<Experience, "start" | "end">, asOf: string = currentMonth()): number {
  return Math.max(0, monthIndex(e.end ?? asOf) - monthIndex(e.start) + 1);
}

export function formatDuration(totalMonths: number): string {
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m} mo`;
  return m ? `${y} y ${m} m` : `${y} y`;
}

function yearSpan(e: Pick<Experience, "start" | "end">): string {
  return `${e.start.slice(0, 4)}–${e.end ? e.end.slice(0, 4) : "now"}`;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöå+#]+/g, " ").trim();
const same = (a: string, b: string) => norm(a) === norm(b);

/** A requirement keyword appears in any of the texts (all keywords of a phrase must appear). */
function mentions(keywords: string[], texts: string[]): boolean {
  if (!keywords.length) return false;
  const hay = norm(texts.join(" | "));
  return keywords.some((k) => norm(k).split(" ").every((w) => hay.includes(w)));
}

/* ---------------- CV ↔ LinkedIn: facts, not verdicts ---------------- */

export function compareCvLinkedin(cv: CvFacts, li: LinkedinFacts | null, asOf: string = currentMonth()): LinkedinCheck[] {
  if (!li) return [{ kind: "none", text: "No LinkedIn provided. This does not affect selection." }];
  const out: LinkedinCheck[] = [];

  for (const e of cv.experience) {
    const match = li.experience.find((x) => same(x.employer, e.employer));
    if (!match) {
      out.push({ kind: "not_found", text: `${e.title}, ${e.employer} (${yearSpan(e)}) is in the CV but not on LinkedIn` });
      continue;
    }
    const startGap = Math.abs(monthIndex(match.start) - monthIndex(e.start));
    const endGap = Math.abs(monthIndex(match.end ?? asOf) - monthIndex(e.end ?? asOf));
    if (!same(match.title, e.title)) {
      out.push({
        kind: "differs",
        text: `CV says “${e.title}”, LinkedIn says “${match.title}” at ${e.employer}. Ask in the meeting.`,
      });
    } else if (Math.max(startGap, endGap) > DATE_TOLERANCE_MONTHS) {
      out.push({
        kind: "differs",
        text: `Dates at ${e.employer} differ by ${Math.max(startGap, endGap)} months between CV and LinkedIn.`,
      });
    } else {
      out.push({ kind: "match", text: `${e.title}, ${e.employer}, ${yearSpan(e)} · in CV and LinkedIn` });
    }
  }

  for (const ed of cv.education) {
    if (ed.inProgress) continue;
    const match = li.education.find((x) => x.degree === ed.degree && same(x.field, ed.field));
    out.push(
      match
        ? { kind: "match", text: `${ed.degree} ${ed.field}, ${ed.year} · in CV and LinkedIn` }
        : { kind: "not_found", text: `${ed.degree} ${ed.field} is in the CV but not on LinkedIn` },
    );
  }

  const liSkills = li.skills.map(norm);
  const missingSkills = cv.skills.filter((s) => !liSkills.includes(norm(s))).slice(0, 2);
  for (const s of missingSkills) out.push({ kind: "not_found", text: `${s} (listed in CV skills) · no evidence on LinkedIn` });

  return out;
}

/** Experience entries that the LinkedIn check confirmed (same employer and title, dates within the tolerance). */
function confirmedByLinkedin(e: Experience, li: LinkedinFacts | null, asOf: string): boolean | null {
  if (!li) return null;
  const m = li.experience.find((x) => same(x.employer, e.employer));
  if (!m || !same(m.title, e.title)) return false;
  const gap = Math.max(
    Math.abs(monthIndex(m.start) - monthIndex(e.start)),
    Math.abs(monthIndex(m.end ?? asOf) - monthIndex(e.end ?? asOf)),
  );
  return gap <= DATE_TOLERANCE_MONTHS;
}

/* ---------------- Requirement ↔ candidate facts ---------------- */

export function evidenceFor(req: Requirement, cv: CvFacts, li: LinkedinFacts | null, poolLanguages?: LanguageSkill[], asOf: string = currentMonth()): Evidence {
  const base = { requirementId: req.id, linkedinMatch: null as boolean | null };

  switch (req.type) {
    case "experience": {
      const hits = cv.experience.filter((e) => mentions(req.keywords, [e.title, ...e.areas, ...e.tasks]));
      if (!hits.length) return { ...base, value: null, meets: false, source: "none" };
      const total = hits.reduce((n, e) => n + months(e, asOf), 0);
      const where = [...new Set(hits.map((e) => e.employer))].join(", ");
      const confirmations = hits.map((e) => confirmedByLinkedin(e, li, asOf));
      return {
        ...base,
        value: `${formatDuration(total)} · ${where}`,
        meets: total >= (req.minYears ?? 0) * 12,
        source: "cv",
        linkedinMatch: confirmations.includes(null) ? null : confirmations.every(Boolean),
      };
    }
    case "has_done": {
      const task = cv.experience.find((e) => mentions(req.keywords, [...e.tasks, ...e.areas]));
      if (task) return { ...base, value: `${task.employer} · described in tasks`, meets: true, source: "cv" };
      const skill = cv.skills.find((s) => mentions(req.keywords, [s]));
      if (skill) return { ...base, value: `${skill} · listed in skills`, meets: true, source: "cv" };
      return { ...base, value: null, meets: null, source: "none" };
    }
    case "education": {
      const min = (req.label.match(/Vocational|BSc|MSc|PhD/)?.[0] ?? "BSc") as Degree;
      const fields = (req.detail ?? "").split(/,|\bor\b/).map((f) => f.trim()).filter(Boolean);
      const best = [...cv.education].sort((a, b) => DEGREE_RANK[b.degree] - DEGREE_RANK[a.degree])[0];
      if (!best) return { ...base, value: null, meets: false, source: "none" };
      const fieldOk = !fields.length || fields.some((f) => mentions([f], [best.field]));
      const levelOk = DEGREE_RANK[best.degree] >= DEGREE_RANK[min];
      return {
        ...base,
        value: `${best.degree} ${best.field}${best.inProgress ? " (in progress)" : `, ${best.year}`}`,
        meets: levelOk && fieldOk && !best.inProgress,
        source: "cv",
      };
    }
    case "language": {
      const langs = poolLanguages?.length ? poolLanguages : cv.languages;
      const l = langs.find((x) => same(x.language, req.label));
      if (!l) return { ...base, value: null, meets: false, source: "none" };
      const need = (req.level ?? "A1") as Cefr;
      return {
        ...base,
        value: l.level,
        meets: CEFR_RANK[l.level] >= CEFR_RANK[need],
        source: poolLanguages?.length ? "profile" : "cv",
      };
    }
  }
}

/** Human-readable requirement, e.g. "Optical testing · 2+ years". */
export function requirementText(r: Pick<Requirement, "type" | "label" | "minYears" | "level" | "detail">): string {
  switch (r.type) {
    case "experience":
      return r.minYears ? `${r.label} · ${r.minYears}+ ${r.minYears === 1 ? "year" : "years"}` : r.label;
    case "education":
      return r.detail ? `${r.label} · ${r.detail}` : r.label;
    case "language":
      return r.level ? `${r.label} · ${r.level}+` : r.label;
    default:
      return r.label;
  }
}
