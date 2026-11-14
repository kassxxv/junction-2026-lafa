import "server-only";
import { query, withTransaction } from "@/lib/db";
import type { Email } from "@/lib/email";
import { generateInviteCode, hashInviteCode } from "@/lib/invite-code";

/**
 * Organisers manage the companies of the event: add a company, hand out its invitation code. The code is
 * shown once and only its hash is stored, so a lost code is replaced, never looked up.
 */

export interface CompanyAdminRow {
  id: string;
  name: string;
  website: string | null;
  field: string | null;
  contactEmail: string | null;
  cardStatus: "draft" | "confirmed";
  places: number;
  applications: number;
  hasCode: boolean;
}

export async function listCompaniesForOrganiser(): Promise<CompanyAdminRow[]> {
  const rows = await query<{ id: string; name: string; website: string | null; field: string | null; contact_email: string | null; status: "draft" | "confirmed"; places: number; applications: number; has_code: boolean }>(
    `SELECT c.id, c.name, c.website, c.field, c.contact_email, cc.status, cc.places,
            (SELECT count(*) FROM applications a WHERE a.company_id = c.id)::int AS applications,
            c.invite_code_hash IS NOT NULL AS has_code
     FROM companies c JOIN company_cards cc ON cc.company_id = c.id
     ORDER BY c.created_at DESC, c.name`,
  );
  return rows.map((r) => ({
    id: r.id, name: r.name, website: r.website, field: r.field, contactEmail: r.contact_email, cardStatus: r.status,
    places: r.places, applications: r.applications, hasCode: r.has_code,
  }));
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // accents: "Väre" -> "vare"
    .replace(/\b(oy|oyj|ab|ltd|inc|gmbh|llc)\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "company";

export interface NewCompany {
  name: string;
  website: string | null;
  field: string | null;
  places: number;
  contactEmail: string;
}

/** Adds a company with an empty draft card and a fresh invitation code. Returns the code (shown once). */
export async function createCompany(input: NewCompany): Promise<{ id: string; code: string }> {
  const code = generateInviteCode();
  const id = await withTransaction(async (q) => {
    const [event] = await q<{ id: string }>(`SELECT id FROM events LIMIT 1`);
    const base = slugify(input.name);
    const taken = await q<{ id: string }>(`SELECT id FROM companies WHERE id = $1 OR id LIKE $2`, [base, `${base}-%`]);
    let id = base;
    for (let n = 2; taken.some((t) => t.id === id); n++) id = `${base}-${n}`;
    await q(
      `INSERT INTO companies (id, event_id, name, website, field, invite_code_hash, contact_email, synthetic) VALUES ($1,$2,$3,$4,$5,$6,$7,false)`,
      [id, event.id, input.name, input.website, input.field, hashInviteCode(code), input.contactEmail],
    );
    await q(`INSERT INTO company_cards (company_id, places) VALUES ($1, $2)`, [id, input.places]);
    await q(`INSERT INTO roles (id, company_id, title) VALUES ($1, $2, 'Not filled in yet')`, [`${id}.role.1`, id]);
    return id;
  });
  return { id, code };
}

/** Replaces the company's code: the old one stops working at once. Returns the new code (shown once). */
export async function rotateInviteCode(companyId: string): Promise<{ code: string; name: string; contactEmail: string | null } | null> {
  const code = generateInviteCode();
  const [c] = await query<{ name: string; contact_email: string | null }>(
    `UPDATE companies SET invite_code_hash = $2 WHERE id = $1 RETURNING name, contact_email`,
    [companyId, hashInviteCode(code)],
  );
  return c ? { code, name: c.name, contactEmail: c.contact_email } : null;
}

export function invitationEmail(company: { name: string; contactEmail: string }, code: string, origin: string, EVENT: { name: string }): Email {
  return {
    to: company.contactEmail,
    subject: `Your invitation to ${EVENT.name}`,
    text: [
      `Hello ${company.name},`,
      ``,
      `You are invited to meet professionals at ${EVENT.name}. Tell us who you want to meet: paste a job ad, a link or two lines, and confirm your card.`,
      ``,
      `1. Open ${origin}/company`,
      `2. Sign in with your code: ${code}`,
      ``,
      `Confirm your card by the company deadline. Then professionals in your field can choose you, and the organisers select who gets a meeting with you.`,
      ``,
      `The event team, City of Espoo`,
    ].join("\n"),
  };
}
