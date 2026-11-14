"use server";

import { z } from "zod";
import { isOrganiser, SESSION_ENDED } from "@/lib/auth";
import { query } from "@/lib/db";
import type { CvFacts, LanguageSkill, LinkedinFacts, Requirement, RequirementType } from "./facts";
import { mapSources, type SourceMap } from "./sources";

export type SourceResult = ({ ok: true; available: false } | ({ ok: true; available: true } & SourceMap)) | { ok: false; error: string };

/**
 * Organisers: the CV of one application as text with personal details already cut out (cv_text_blind,
 * written at upload), the lines each requirement's evidence comes from, and the facts the AI extracted
 * that the text does not contain. Never reads the original CV or the identity table.
 */
export async function loadSourceDocument(applicationId: string): Promise<SourceResult> {
  if (!(await isOrganiser())) return { ok: false, error: SESSION_ENDED };
  const id = z.string().min(1).max(200).safeParse(applicationId);
  if (!id.success) return { ok: false, error: "Application not found." };

  const [a] = await query<{ role_id: string | null; blind: string | null; cv_facts: CvFacts | null; linkedin_facts: LinkedinFacts | null; languages: LanguageSkill[] | null }>(
    `SELECT a.role_id, d.cv_text_blind AS blind, d.cv_facts, d.linkedin_facts, p.languages
     FROM applications a
     LEFT JOIN candidate_documents d ON d.candidate_id = a.candidate_id
     LEFT JOIN pool_profiles p ON p.candidate_id = a.candidate_id
     WHERE a.id = $1`,
    [id.data],
  );
  if (!a) return { ok: false, error: "Application not found." };
  if (!a.blind || !a.cv_facts || !a.role_id) return { ok: true, available: false };

  const reqs = await query<{ id: string; type: RequirementType; label: string; min_years: string | null; level: string | null; detail: string | null; must_have: boolean; keywords: string[] }>(
    `SELECT id, type, label, min_years::text, level, detail, must_have, keywords FROM requirements WHERE role_id = $1 ORDER BY position`,
    [a.role_id],
  );
  const requirements: Requirement[] = reqs.map((r) => ({
    id: r.id, type: r.type, label: r.label, minYears: r.min_years ? Number(r.min_years) : null, level: r.level, detail: r.detail, mustHave: r.must_have, keywords: r.keywords,
  }));
  return { ok: true, available: true, ...mapSources(a.blind, a.cv_facts, a.linkedin_facts, requirements, a.languages ?? undefined) };
}
