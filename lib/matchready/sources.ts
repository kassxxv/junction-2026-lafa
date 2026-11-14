/**
 * Where each fact comes from in the CV text, and which facts the AI extracted that the text does not contain.
 * Pure functions, no AI: the check of the model's output is done by code against the document itself.
 */

import { evidenceFor, mentions, phraseIn, searchPhrases, type CvFacts, type Experience, type LanguageSkill, type LinkedinFacts, type Requirement } from "./facts";

export interface SourceMap {
  lines: string[];
  /** Requirement id → indexes of the CV lines its evidence is based on. */
  byRequirement: Record<string, number[]>;
  /** Facts the AI extracted that cannot be found in the text: worth a question in the meeting. */
  unverified: string[];
  /** Requirement id → what the CV itself shows (to compare with a value the candidate typed). */
  cvValues: Record<string, string | null>;
}

/** A line that starts a new job (it carries a year) or a new section (all capitals, like "EDUCATION"). */
const YEAR = /\b(19|20)\d{2}\b/;
const SECTION = /^\s*[A-ZÄÖÅ][A-ZÄÖÅ &/-]{2,}\s*$/;

/**
 * The lines of one job: the line naming the employer, the lines under it up to the next job or section,
 * and any other line matching one of its tasks.
 */
function jobLines(lines: string[], job: Pick<Experience, "employer" | "title" | "tasks">): number[] {
  const out = new Set<number>();
  lines.forEach((line, i) => {
    if (!phraseIn(job.employer, line)) return;
    out.add(i);
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      if (!next.trim() || SECTION.test(next) || YEAR.test(next)) break;
      out.add(j);
    }
  });
  lines.forEach((line, i) => {
    if (job.tasks.some((t) => t.trim().split(/\s+/).length >= 3 && phraseIn(t, line))) out.add(i);
  });
  return [...out].sort((a, b) => a - b);
}

const DEGREE_WORDS: Record<string, string[]> = {
  Vocational: ["vocational", "diploma", "certificate"],
  BSc: ["bsc", "bachelor", "b.sc", "bs"],
  MSc: ["msc", "master", "m.sc", "ms"],
  PhD: ["phd", "ph.d", "doctor", "doctoral"],
};

function degreeLines(lines: string[], degree: string, field: string): number[] {
  const words = DEGREE_WORDS[degree] ?? [degree.toLowerCase()];
  return lines
    .map((line, i) => ({ line: line.toLowerCase(), i }))
    .filter(({ line }) => phraseIn(field, line) && words.some((w) => line.includes(w)))
    .map(({ i }) => i);
}

export function mapSources(text: string, cv: CvFacts, li: LinkedinFacts | null, requirements: Requirement[], poolLanguages?: LanguageSkill[]): SourceMap {
  const lines = text.split(/\r?\n/);
  const whole = lines.join("\n");
  const byRequirement: Record<string, number[]> = {};
  const cvValues: Record<string, string | null> = {};

  for (const req of requirements) {
    cvValues[req.id] = evidenceFor(req, cv, li, poolLanguages).value;
    const phrases = searchPhrases(req);
    let found: number[] = [];
    if (req.type === "experience") {
      found = cv.experience.filter((e) => mentions(phrases, [e.title, ...e.areas, ...e.tasks])).flatMap((e) => jobLines(lines, e));
    } else if (req.type === "has_done") {
      const job = cv.experience.find((e) => mentions(phrases, [...e.tasks, ...e.areas]));
      if (job) found = jobLines(lines, job);
      else {
        const skill = cv.skills.find((s) => mentions(phrases, [s]));
        if (skill) found = lines.map((l, i) => (phraseIn(skill, l) ? i : -1)).filter((i) => i >= 0);
      }
    } else if (req.type === "education") {
      found = cv.education.flatMap((e) => degreeLines(lines, e.degree, e.field));
    } else if (req.type === "language") {
      found = lines.map((l, i) => (phraseIn(req.label, l) ? i : -1)).filter((i) => i >= 0);
    }
    byRequirement[req.id] = [...new Set(found)].sort((a, b) => a - b);
  }

  // Check the model's output against the document: anything not in the text gets named.
  const unverified: string[] = [];
  for (const e of cv.experience) {
    if (!phraseIn(e.employer, whole)) unverified.push(`Job at “${e.employer}” is not in the CV text`);
    else {
      if (!phraseIn(e.title, whole)) unverified.push(`Title “${e.title}” at ${e.employer} is not in the CV text`);
      if (!whole.includes(e.start.slice(0, 4))) unverified.push(`Start year ${e.start.slice(0, 4)} at ${e.employer} is not in the CV text`);
    }
  }
  for (const ed of cv.education) {
    if (!degreeLines(lines, ed.degree, ed.field).length) unverified.push(`${ed.degree} in ${ed.field} is not in the CV text`);
  }
  for (const l of cv.languages) if (!phraseIn(l.language, whole)) unverified.push(`${l.language} is not in the CV text`);
  for (const s of cv.skills) if (!phraseIn(s, whole)) unverified.push(`Skill “${s}” is not in the CV text`);

  return { lines, byRequirement, unverified, cvValues };
}
