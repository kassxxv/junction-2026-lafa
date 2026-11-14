import "server-only";
import { query } from "@/lib/db";
import type { Email } from "@/lib/email";
import { EVENT } from "./event";

/**
 * Reminder e-mails after the meetings of one company: "Want to continue the conversation?", sent to each side
 * that has not answered yet, with a link back to its own page. Only approved meetings, only the question:
 * no answers of the other side, no judgement of anyone. This is the one place besides the Tavata export that
 * reads candidate e-mail addresses, and only for people the organisers approved.
 */

export interface Reminder extends Email {
  /** What the organiser sees in the preview instead of the address: "QuantumLab Oy" or "Candidate A-01". */
  recipientLabel: string;
  applicationIds: string[];
}

export async function remindersFor(companyId: string, origin: string): Promise<Reminder[]> {
  const rows = await query<{
    id: string; candidate_id: string; code: string; company: string; company_email: string | null; candidate_email: string;
    role: string | null; company_answered: boolean; candidate_answered: boolean;
  }>(
    `SELECT a.id, a.candidate_id, c.code, co.name AS company, co.contact_email AS company_email, i.email AS candidate_email, r.title AS role,
            EXISTS (SELECT 1 FROM meeting_feedback f WHERE f.application_id = a.id AND f.side = 'company') AS company_answered,
            EXISTS (SELECT 1 FROM meeting_feedback f WHERE f.application_id = a.id AND f.side = 'candidate') AS candidate_answered
     FROM applications a
     JOIN candidates c ON c.id = a.candidate_id
     JOIN candidate_identity i ON i.candidate_id = a.candidate_id
     JOIN companies co ON co.id = a.company_id
     LEFT JOIN roles r ON r.id = a.role_id
     WHERE a.company_id = $1 AND a.status = 'approved'
     ORDER BY c.code`,
    [companyId],
  );
  const out: Reminder[] = [];

  const companyOpen = rows.filter((r) => !r.company_answered);
  if (companyOpen.length && companyOpen[0].company_email) {
    out.push({
      to: companyOpen[0].company_email,
      recipientLabel: companyOpen[0].company,
      applicationIds: companyOpen.map((r) => r.id),
      subject: `Your meetings at ${EVENT.name}: want to continue?`,
      text: [
        `Hello ${companyOpen[0].company},`,
        ``,
        `Thank you for joining ${EVENT.name}. One question about each meeting you had: do you want to continue the conversation?`,
        ``,
        ...companyOpen.map((r) => `- Candidate ${r.code}${r.role ? `, ${r.role}` : ""}`),
        ``,
        `Answer on your company page (sign in with your invitation code): ${origin}/company`,
        ``,
        `If you and the candidate both say yes, the organisers will connect you. A "no" is never shown to the other side.`,
        ``,
        `The event team, City of Espoo`,
      ].join("\n"),
    });
  }

  for (const r of rows.filter((x) => !x.candidate_answered)) {
    out.push({
      to: r.candidate_email,
      recipientLabel: `Candidate ${r.code}`,
      applicationIds: [r.id],
      subject: `Your meeting with ${r.company}: want to continue?`,
      text: [
        `Hello,`,
        ``,
        `You met ${r.company}${r.role ? ` about the ${r.role} role` : ""} at ${EVENT.name}. Do you want to continue the conversation?`,
        ``,
        `Answer here: ${origin}/candidate/${encodeURIComponent(r.candidate_id)}`,
        ``,
        `If you both say yes, the organisers will connect you. A "no" is never shown to the company.`,
        ``,
        `The event team, City of Espoo`,
      ].join("\n"),
    });
  }
  return out;
}

export async function markReminded(applicationIds: string[]): Promise<void> {
  if (applicationIds.length) await query(`UPDATE applications SET reminder_sent_at = now() WHERE id = ANY ($1)`, [applicationIds]);
}

/** Companies with approved meetings, for the organiser's reminder panel. */
export async function companiesWithMeetings(): Promise<{ id: string; name: string; meetings: number; open: number; remindedAt: string | null }[]> {
  return query(
    `SELECT co.id, co.name, count(*)::int AS meetings,
            count(*) FILTER (WHERE (SELECT count(*) FROM meeting_feedback f WHERE f.application_id = a.id) < 2)::int AS open,
            to_char(max(a.reminder_sent_at) AT TIME ZONE 'Europe/Helsinki', 'DD Mon HH24:MI') AS "remindedAt"
     FROM applications a JOIN companies co ON co.id = a.company_id
     WHERE a.status = 'approved' GROUP BY co.id, co.name ORDER BY co.name`,
  );
}
