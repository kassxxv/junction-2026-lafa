"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { isOrganiser, SESSION_ENDED } from "@/lib/auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import { createCompany, invitationEmail, rotateInviteCode } from "./companies-admin";
import { getEvent } from "./organiser";

/** The code is in the result once, for the organiser to pass on. It is never stored or logged in plain text. */
export type InviteResult =
  | { ok: true; companyName: string; code: string; delivered: boolean; previewOnly: boolean; preview: { subject: string; text: string } | null }
  | { ok: false; error: string };

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function deliver(company: { name: string; contactEmail: string | null }, code: string): Promise<Omit<Extract<InviteResult, { ok: true }>, "ok" | "companyName" | "code">> {
  if (!company.contactEmail) return { delivered: false, previewOnly: true, preview: null };
  const email = invitationEmail({ name: company.name, contactEmail: company.contactEmail }, code, await origin());
  const sent = emailConfigured() ? await sendEmail(email) : null;
  return { delivered: Boolean(sent?.delivered), previewOnly: !emailConfigured(), preview: { subject: email.subject, text: email.text } };
}

const NewCompany = z.object({
  name: z.string().trim().min(2).max(120),
  website: z.string().trim().max(200).transform((v) => v.replace(/^https?:\/\//i, "").replace(/\/+$/, "") || null),
  field: z.string().max(100),
  places: z.coerce.number().int().min(1).max(50),
  contactEmail: z.email().max(200),
});

export async function addCompany(input: z.input<typeof NewCompany>): Promise<InviteResult> {
  if (!(await isOrganiser())) return { ok: false, error: SESSION_ENDED };
  const parsed = NewCompany.safeParse(input);
  if (!parsed.success) {
    const path = String(parsed.error.issues[0]?.path[0]);
    const msg: Record<string, string> = { name: "Enter the company name.", contactEmail: "Enter a valid contact e-mail.", places: "Places must be a number from 1 to 50." };
    return { ok: false, error: msg[path] ?? "Check the form and try again." };
  }
  const { fields } = await getEvent();
  const field = fields.includes(parsed.data.field) ? parsed.data.field : null;
  const { code } = await createCompany({ ...parsed.data, field });
  refresh();
  return { ok: true, companyName: parsed.data.name, code, ...(await deliver({ name: parsed.data.name, contactEmail: parsed.data.contactEmail }, code)) };
}

export async function issueNewCode(companyId: string): Promise<InviteResult> {
  if (!(await isOrganiser())) return { ok: false, error: SESSION_ENDED };
  const id = z.string().min(1).max(100).safeParse(companyId);
  if (!id.success) return { ok: false, error: "Company not found." };
  const rotated = await rotateInviteCode(id.data);
  if (!rotated) return { ok: false, error: "Company not found." };
  refresh();
  return { ok: true, companyName: rotated.name, code: rotated.code, ...(await deliver(rotated, rotated.code)) };
}
