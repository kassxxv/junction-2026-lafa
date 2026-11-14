"use server";

import { z } from "zod";
import { allow, TOO_MANY } from "@/lib/rate-limit";
import {
  addField,
  confirmedCompanies,
  evidencePreview,
  joinPool,
  parseDocument,
  pdfToText,
  setLinkedinUrl,
  submitApplications,
  type EvidenceRow,
} from "./candidate-service";
import { MAX_COMPANIES_PER_CANDIDATE, MAX_DOCUMENT_CHARS, MAX_UPLOAD_BYTES } from "./config";
import type { LinkedinCheck } from "./facts";

const TOO_LARGE = `The file is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`;
const CEFR = z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "Native"]);

const Join = z.object({
  fields: z.array(z.string().max(100)).min(1).max(5),
  workType: z.string().min(1).max(100),
  stage: z.enum(["student", "early", "experienced", "senior"]),
  languages: z.array(z.object({ language: z.string().trim().min(1).max(40), level: CEFR })).min(1).max(8),
  email: z.email().max(200),
  consentEvent: z.literal(true),
  consentPool: z.boolean(),
  cvText: z.string().max(MAX_DOCUMENT_CHARS).nullable(),
});

export async function joinTalentPool(input: z.input<typeof Join>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = Join.safeParse(input);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    const msg: Record<string, string> = {
      fields: "Choose at least one field.",
      email: "Enter a valid email address.",
      consentEvent: "We need your consent to use your data for this event.",
      languages: "Add at least one language.",
    };
    return { ok: false, error: msg[String(path)] ?? "Check the form and try again." };
  }
  if (!(await allow("joinPool"))) return { ok: false, error: TOO_MANY };
  const id = await joinPool(parsed.data);
  return { ok: true, id };
}

/** Text from an uploaded PDF/TXT file or pasted text. */
async function readUpload(form: FormData): Promise<string | null> {
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("too_large");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return pdfToText(bytes);
    return new TextDecoder().decode(bytes);
  }
  const text = form.get("text");
  return typeof text === "string" && text.trim() ? text : null;
}

export async function readCvForPool(form: FormData): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!(await allow("documentRead"))) return { ok: false, error: TOO_MANY };
  try {
    const text = await readUpload(form);
    return text ? { ok: true, text: text.slice(0, MAX_DOCUMENT_CHARS) } : { ok: false, error: "That file looks empty." };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message === "too_large" ? TOO_LARGE : "We could not read that file. Try a PDF or paste the text." };
  }
}

export type UploadResult =
  | { ok: true; parsed: boolean; checks: LinkedinCheck[]; preview: { companyId: string; rows: EvidenceRow[] }[] }
  | { ok: false; error: string };

export async function uploadDocument(form: FormData): Promise<UploadResult> {
  const candidateId = z.string().min(1).max(100).parse(form.get("candidateId"));
  const kind = z.enum(["cv", "linkedin"]).parse(form.get("kind"));
  const companyIds = z.array(z.string().max(100)).max(MAX_COMPANIES_PER_CANDIDATE).parse(JSON.parse(String(form.get("companies") ?? "[]")));
  // Each document is one Gemma call on our GPU server.
  if (!(await allow("documentParse"))) return { ok: false, error: TOO_MANY };
  let text: string | null;
  try {
    text = form.get("reuse") === "1" ? null : await readUpload(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message === "too_large" ? TOO_LARGE : "We could not read that file. Try a PDF or paste the text." };
  }

  if (form.get("reuse") === "1") {
    const { query } = await import("@/lib/db");
    const [doc] = await query<{ cv_text: string | null }>(`SELECT cv_text FROM candidate_documents WHERE candidate_id = $1`, [candidateId]);
    text = doc?.cv_text ?? null;
  }
  if (!text || text.trim().length < 40) return { ok: false, error: "We could not find text in that document. Try another file or paste the text." };

  // Company requirement words help Gemma tag the CV consistently (company data, not candidate data).
  const topics = [...new Set((await confirmedCompanies()).filter((c) => companyIds.includes(c.id)).flatMap((c) => c.requirements.flatMap((r) => r.keywords)))].slice(0, 30);
  const result = await parseDocument(candidateId, kind, text, topics);
  return { ok: true, parsed: result.ok, checks: result.checks, preview: await evidencePreview(candidateId, companyIds) };
}

export async function saveLinkedin(candidateId: string, url: string): Promise<void> {
  const clean = z.string().max(300).parse(url.trim());
  await setLinkedinUrl(z.string().min(1).max(100).parse(candidateId), clean);
}

export async function addCandidateField(candidateId: string, field: string): Promise<void> {
  await addField(z.string().min(1).max(100).parse(candidateId), z.string().min(1).max(100).parse(field));
}

const Submit = z.object({
  candidateId: z.string().min(1).max(100),
  available: z.literal(true),
  applications: z
    .array(
      z.object({
        companyId: z.string().max(100),
        starter: z.string().max(1500),
        stated: z.record(z.string(), z.string().max(300)),
        proofs: z.record(z.string(), z.object({ type: z.enum(["diploma", "certificate", "link", "reference"]), ref: z.string().max(300) })),
      }),
    )
    .min(1)
    .max(MAX_COMPANIES_PER_CANDIDATE),
});

export async function sendApplications(input: z.input<typeof Submit>): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = Submit.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Confirm that you are available on the event dates." };
  return submitApplications(parsed.data);
}
