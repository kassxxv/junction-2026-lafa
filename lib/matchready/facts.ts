/**
 * Candidate facts and the code that compares them. Pure functions, no AI, no I/O.
 *
 * AI (Gemma) only turns CV / LinkedIn text into these structures. Everything below is
 * deterministic, so every result shown to organisers is a traceable fact — never a score,
 * never a ranking of people.
 */

import { DATE_TOLERANCE_MONTHS, EDUCATION_YEAR_TOLERANCE } from "./config";

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

/**
 * One fact from comparing CV and LinkedIn.
 * - match / differs / not_found: about something the CV claims.
 * - linkedin_only: on LinkedIn but left out of the CV (CVs are often shortened on purpose).
 * - info: context that needs no action (e.g. skills missing from an incomplete LinkedIn skill list).
 * - none: no LinkedIn was provided.
 */
export type LinkedinCheck = { kind: "match" | "differs" | "not_found" | "linkedin_only" | "info" | "none"; text: string };

/** Only a CV claim that LinkedIn contradicts or does not show needs an organiser's look before approval. */
export function needsLook(c: Pick<LinkedinCheck, "kind">): boolean {
  return c.kind === "differs" || c.kind === "not_found";
}

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

/** "c1" → "C1", "native" → "Native"; anything that is not a CEFR level → null. */
export function toCefr(level: string | null | undefined): Cefr | null {
  const v = (level ?? "").trim();
  if (/^native$/i.test(v)) return "Native";
  const up = v.toUpperCase();
  return up in CEFR_RANK ? (up as Cefr) : null;
}

function monthIndex(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}

export function months(e: Pick<Experience, "start" | "end">, asOf: string = currentMonth()): number {
  return Math.max(0, monthIndex(e.end ?? asOf) - monthIndex(e.start) + 1);
}

/** Calendar months covered by any of the jobs: overlapping jobs are not counted twice. */
function monthsCovered(jobs: Pick<Experience, "start" | "end">[], asOf: string): number {
  const covered = new Set<number>();
  for (const j of jobs) for (let i = monthIndex(j.start); i <= monthIndex(j.end ?? asOf); i++) covered.add(i);
  return covered.size;
}

export function formatDuration(totalMonths: number): string {
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m} mo`;
  return m ? `${y} y ${m} m` : `${y} y`;
}

function yearSpan(e: Pick<Experience, "start" | "end">): string {
  const from = e.start.slice(0, 4);
  const to = e.end ? e.end.slice(0, 4) : "now";
  return from === to ? from : `${from}–${to}`;
}

/* ---------------- Text matching (deterministic, explainable) ---------------- */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöå+#]+/g, " ").trim();
const same = (a: string, b: string) => norm(a) === norm(b);

const STOP_WORDS = new Set(["and", "or", "of", "in", "the", "for", "with", "a", "an", "to", "on", "at"]);
const SUFFIXES = ["ations", "ation", "ings", "ing", "ers", "er", "ies", "es", "ed", "s"];

/** Light stemming so "testing" = "tests", "analysers" = "analyzer", "automated" ≈ "automation". */
function stem(word: string): string {
  const w = word.replace(/z/g, "s"); // British / American spelling
  for (const suffix of SUFFIXES) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 4) return w.slice(0, -suffix.length);
  }
  return w;
}

function tokens(text: string): string[] {
  return norm(text)
    .split(" ")
    .filter((w) => w && !STOP_WORDS.has(w))
    .map(stem);
}

/** Same word, or one is the beginning of the other ("automat" ~ "automation"). Short words must be equal ("lab" ≠ "labview"). */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  return Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a));
}

/** Every word of `phrase` is a whole word of `text` (after stemming). */
export function phraseIn(phrase: string, text: string): boolean {
  const want = tokens(phrase);
  if (!want.length) return false;
  const have = tokens(text);
  return want.every((w) => have.some((h) => sameWord(w, h)));
}

/**
 * A keyword phrase counts when ALL its words appear in ONE of the texts (one area tag, the title
 * or one task), or when a text of two or more words lies entirely inside the phrase (the tag
 * "lab equipment" shows "lab measurement equipment"). Words spread over different lines of a
 * job never add up to a match, and a one-word tag ("testing") never matches a longer phrase.
 */
export function mentions(keywords: string[], texts: string[]): boolean {
  return keywords.some((k) => texts.some((t) => phraseIn(k, t) || (tokens(t).length >= 2 && phraseIn(t, k))));
}

/** Keywords used to find a requirement: the given ones plus the requirement's own label, never empty. */
export function searchPhrases(r: Pick<Requirement, "label" | "keywords">): string[] {
  return [...new Set([...r.keywords, r.label].map((k) => k.trim()).filter(Boolean))];
}

/** The same thing named two ways: one name contains all words of the other ("Photonics" ~ "Photonics and Optics"). */
function sameTopic(a: string, b: string): boolean {
  return phraseIn(a, b) || phraseIn(b, a);
}

const LEGAL_FORMS = new Set(["oy", "oyj", "ab", "ltd", "inc", "gmbh", "llc", "plc", "as", "bv", "sa"]);
const employerKey = (s: string) =>
  norm(s)
    .split(" ")
    .filter((w) => !LEGAL_FORMS.has(w))
    .join(" ");
/** "Valo Optics Oy" = "Valo Optics". Different names stay different ("Polar Microsystems" ≠ "Polar Microsystems Lab"). */
const sameEmployer = (a: string, b: string) => employerKey(a) === employerKey(b);

/* ---------------- CV ↔ LinkedIn: facts, not verdicts ---------------- */

type LiJob = LinkedinFacts["experience"][number];

function dateGap(a: Pick<Experience, "start" | "end">, b: Pick<Experience, "start" | "end">, asOf: string): number {
  return Math.max(Math.abs(monthIndex(a.start) - monthIndex(b.start)), Math.abs(monthIndex(a.end ?? asOf) - monthIndex(b.end ?? asOf)));
}

interface JobPair {
  li: LiJob;
  titleSame: boolean;
  gap: number;
}

/**
 * Pairs each CV job with at most one LinkedIn job at the same employer. With several roles at one
 * employer, the same title wins, then the closest dates; a LinkedIn job is never used twice.
 */
function pairJobs(cv: Experience[], li: LiJob[], asOf: string): { pairs: (JobPair | null)[]; unused: LiJob[] } {
  const used = new Set<number>();
  const pairs: (JobPair | null)[] = cv.map(() => null);
  const options = cv
    .flatMap((e, ci) =>
      li.map((x, xi) => (sameEmployer(x.employer, e.employer) ? { ci, xi, titleSame: same(x.title, e.title), gap: dateGap(e, x, asOf) } : null)),
    )
    .filter((o) => o !== null)
    .sort((a, b) => Number(b.titleSame) - Number(a.titleSame) || a.gap - b.gap);
  for (const o of options) {
    if (pairs[o.ci] || used.has(o.xi)) continue;
    pairs[o.ci] = { li: li[o.xi], titleSame: o.titleSame, gap: o.gap };
    used.add(o.xi);
  }
  return { pairs, unused: li.filter((_, i) => !used.has(i)) };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function compareCvLinkedin(cv: CvFacts, li: LinkedinFacts | null, asOf: string = currentMonth()): LinkedinCheck[] {
  if (!li) return [{ kind: "none", text: "No LinkedIn provided. This does not affect selection." }];
  const out: LinkedinCheck[] = [];

  // Experience: every CV job, then jobs that are only on LinkedIn.
  const { pairs, unused } = pairJobs(cv.experience, li.experience, asOf);
  cv.experience.forEach((e, i) => {
    const p = pairs[i];
    if (!p) {
      out.push({ kind: "not_found", text: `${e.title}, ${e.employer} (${yearSpan(e)}) is in the CV but not on LinkedIn` });
    } else if (!p.titleSame) {
      out.push({ kind: "differs", text: `CV says “${e.title}”, LinkedIn says “${p.li.title}” at ${e.employer}. Ask in the meeting.` });
    } else if (p.gap > DATE_TOLERANCE_MONTHS) {
      out.push({
        kind: "differs",
        text: `Dates at ${e.employer} differ by ${plural(p.gap, "month")}: CV ${yearSpan(e)}, LinkedIn ${yearSpan(p.li)}.`,
      });
    } else {
      // A small difference still counts as the same job, but it is shown, not hidden.
      const note = p.gap > 0 ? ` (dates differ by ${plural(p.gap, "month")}, within the ${DATE_TOLERANCE_MONTHS}-month tolerance)` : "";
      out.push({ kind: "match", text: `${e.title}, ${e.employer}, ${yearSpan(e)}: in both CV and LinkedIn${note}` });
    }
  });
  for (const x of unused) {
    out.push({ kind: "linkedin_only", text: `${x.title}, ${x.employer} (${yearSpan(x)}) is on LinkedIn but not in the CV` });
  }

  // Education: finished degrees only. Field names are compared by words, not as exact strings.
  const liEduUsed = new Set<number>();
  for (const ed of cv.education) {
    if (ed.inProgress) continue;
    const sameDegree = li.education.map((x, i) => ({ x, i })).filter(({ x, i }) => !liEduUsed.has(i) && x.degree === ed.degree);
    const hit = sameDegree.find(({ x }) => sameTopic(x.field, ed.field));
    if (hit) {
      liEduUsed.add(hit.i);
      const yearGap = Math.abs(hit.x.year - ed.year);
      out.push(
        yearGap > EDUCATION_YEAR_TOLERANCE
          ? { kind: "differs", text: `${ed.degree} ${ed.field}: CV says ${ed.year}, LinkedIn says ${hit.x.year}.` }
          : { kind: "match", text: `${ed.degree} ${ed.field}, ${ed.year}: in both CV and LinkedIn${yearGap ? ` (LinkedIn says ${hit.x.year})` : ""}` },
      );
    } else if (sameDegree[0]) {
      liEduUsed.add(sameDegree[0].i);
      out.push({ kind: "differs", text: `CV says ${ed.degree} in “${ed.field}”, LinkedIn says ${ed.degree} in “${sameDegree[0].x.field}”.` });
    } else {
      out.push({ kind: "not_found", text: `${ed.degree} ${ed.field} is in the CV but not on LinkedIn` });
    }
  }
  li.education.forEach((x, i) => {
    if (!liEduUsed.has(i)) out.push({ kind: "linkedin_only", text: `${x.degree} ${x.field} (${x.year}) is on LinkedIn but not in the CV` });
  });

  // Skills: LinkedIn skill lists are rarely complete, so a missing skill is context, not something to check.
  const missing = cv.skills.filter((s) => !li.skills.some((x) => sameTopic(s, x)));
  if (missing.length) {
    const shown = missing.slice(0, 5).join(", ");
    const more = missing.length > 5 ? ` and ${missing.length - 5} more` : "";
    out.push({
      kind: "info",
      text: `${missing.length} of ${plural(cv.skills.length, "CV skill")} not in the LinkedIn skill list: ${shown}${more}. Skill lists are often incomplete.`,
    });
  }

  return out;
}

/* ---------------- Requirement ↔ candidate facts ---------------- */

const DEGREE_WORDS: [Degree, RegExp][] = [
  ["Vocational", /vocational/i],
  ["BSc", /b\.?sc|bachelor/i],
  ["MSc", /m\.?sc|master/i],
  ["PhD", /ph\.?d|doctor/i],
];

/** "BSc or MSc" → BSc: the lowest degree the label names is the minimum. */
function minDegree(label: string): Degree {
  const named = DEGREE_WORDS.filter(([, re]) => re.test(label)).map(([d]) => d);
  return named.sort((a, b) => DEGREE_RANK[a] - DEGREE_RANK[b])[0] ?? "BSc";
}

export function evidenceFor(req: Requirement, cv: CvFacts, li: LinkedinFacts | null, poolLanguages?: LanguageSkill[], asOf: string = currentMonth()): Evidence {
  const base = { requirementId: req.id, linkedinMatch: null as boolean | null };

  switch (req.type) {
    case "experience": {
      const counted = cv.experience.map((e, i) => ({ e, i })).filter(({ e }) => mentions(searchPhrases(req), [e.title, ...e.areas, ...e.tasks]));
      if (!counted.length) return { ...base, value: null, meets: false, source: "none" };
      const hits = counted.map(({ e }) => e);
      const total = monthsCovered(hits, asOf);
      // Show which jobs were counted, each with its own time, so the organiser can see what the total is made of.
      const employers = hits.map((e) => e.employer).filter((name, i, all) => all.findIndex((x) => sameEmployer(x, name)) === i);
      // "3 y 5 m at Valo Optics" or "5 y 2 m in total: Valo Optics 3 y 5 m + University lab 1 y 9 m".
      const where =
        employers.length === 1
          ? employers[0]
          : employers.map((name) => `${name} ${formatDuration(monthsCovered(hits.filter((e) => sameEmployer(e.employer, name)), asOf))}`).join(" + ");
      let linkedinMatch: boolean | null = null;
      if (li) {
        const { pairs } = pairJobs(cv.experience, li.experience, asOf);
        linkedinMatch = counted.every(({ i }) => {
          const p = pairs[i];
          return !!p && p.titleSame && p.gap <= DATE_TOLERANCE_MONTHS;
        });
      }
      return { ...base, value: employers.length === 1 ? `${formatDuration(total)} at ${where}` : `${formatDuration(total)} in total: ${where}`, meets: total >= (req.minYears ?? 0) * 12, source: "cv", linkedinMatch };
    }
    case "has_done": {
      const task = cv.experience.find((e) => mentions(searchPhrases(req), [...e.tasks, ...e.areas]));
      if (task) return { ...base, value: `In the tasks at ${task.employer}`, meets: true, source: "cv" };
      const skill = cv.skills.find((s) => mentions(searchPhrases(req), [s]));
      if (skill) return { ...base, value: `${skill}, in the skills list`, meets: true, source: "cv" };
      return { ...base, value: null, meets: null, source: "none" };
    }
    case "education": {
      const min = minDegree(req.label);
      const fields = (req.detail ?? "").split(/,|\bor\b/).map((f) => f.trim()).filter(Boolean);
      const fieldOk = (e: Education) => !fields.length || fields.some((f) => sameTopic(f, e.field));
      const describe = (e: Education) => `${e.degree} ${e.field}${e.inProgress ? " (in progress)" : `, ${e.year}`}`;
      const byRank = [...cv.education].sort((a, b) => DEGREE_RANK[b.degree] - DEGREE_RANK[a.degree]);
      if (!byRank.length) return { ...base, value: null, meets: false, source: "none" };
      // Any finished degree that covers the requirement counts, not only the highest one.
      const covering = byRank.find((e) => !e.inProgress && DEGREE_RANK[e.degree] >= DEGREE_RANK[min] && fieldOk(e));
      return covering
        ? { ...base, value: describe(covering), meets: true, source: "cv" }
        : { ...base, value: describe(byRank[0]), meets: false, source: "cv" };
    }
    case "language": {
      const langs = poolLanguages?.length ? poolLanguages : cv.languages;
      const l = langs.find((x) => same(x.language, req.label));
      if (!l) return { ...base, value: null, meets: false, source: "none" };
      // An unreadable required level is treated as "any level" rather than failing everyone.
      const need = CEFR_RANK[toCefr(req.level) ?? "A1"];
      return { ...base, value: l.level, meets: (CEFR_RANK[l.level] ?? 0) >= need, source: poolLanguages?.length ? "profile" : "cv" };
    }
  }
}

/** Human-readable requirement, e.g. "Optical testing, 2+ years". */
export function requirementText(r: Pick<Requirement, "type" | "label" | "minYears" | "level" | "detail">): string {
  switch (r.type) {
    case "experience":
      return r.minYears ? `${r.label}, ${r.minYears}+ ${r.minYears === 1 ? "year" : "years"}` : r.label;
    case "education":
      return r.detail ? `${r.label} in ${r.detail}` : r.label;
    case "language":
      return r.level ? `${r.label}, ${r.level} or higher` : r.label;
    default:
      return r.label;
  }
}
