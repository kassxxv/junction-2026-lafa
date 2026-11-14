import "server-only";
import { query } from "@/lib/db";

/**
 * Meetings as each side sees them: every approved application is a meeting. After the meeting each side answers
 * one question ("want to continue?"). A side sees its own answer and only one shared outcome: both said yes.
 * The other side's "no" is never shown to anyone (feedback is never a judgement of a person).
 */

export interface MeetingItem {
  applicationId: string;
  /** Who you met: the candidate's blind code for companies, the company name for candidates. */
  title: string;
  subtitle: string | null;
  myAnswer: boolean | null;
  bothYes: boolean;
}

export interface CompanyPortal {
  places: number;
  applications: number;
  approved: number;
  meetings: MeetingItem[];
}

export async function getCompanyPortal(companyId: string): Promise<CompanyPortal> {
  const [card] = await query<{ places: number }>(`SELECT places FROM company_cards WHERE company_id = $1`, [companyId]);
  const [counts] = await query<{ applications: number; approved: number }>(
    `SELECT count(*)::int AS applications, count(*) FILTER (WHERE status = 'approved')::int AS approved FROM applications WHERE company_id = $1`,
    [companyId],
  );
  const rows = await query<{ id: string; code: string; role: string | null; company_yes: boolean | null; candidate_yes: boolean | null }>(
    `SELECT a.id, c.code, r.title AS role,
            (SELECT wants_to_continue FROM meeting_feedback f WHERE f.application_id = a.id AND f.side = 'company') AS company_yes,
            (SELECT wants_to_continue FROM meeting_feedback f WHERE f.application_id = a.id AND f.side = 'candidate') AS candidate_yes
     FROM applications a JOIN candidates c ON c.id = a.candidate_id LEFT JOIN roles r ON r.id = a.role_id
     WHERE a.company_id = $1 AND a.status = 'approved' ORDER BY c.code`,
    [companyId],
  );
  return {
    places: card?.places ?? 0,
    applications: counts?.applications ?? 0,
    approved: counts?.approved ?? 0,
    meetings: rows.map((r) => ({
      applicationId: r.id,
      title: `Candidate ${r.code}`,
      subtitle: r.role,
      myAnswer: r.company_yes,
      bothYes: r.company_yes === true && r.candidate_yes === true,
    })),
  };
}

export async function getCandidateMeetings(candidateId: string): Promise<MeetingItem[]> {
  const rows = await query<{ id: string; company: string; role: string | null; company_yes: boolean | null; candidate_yes: boolean | null }>(
    `SELECT a.id, co.name AS company, r.title AS role,
            (SELECT wants_to_continue FROM meeting_feedback f WHERE f.application_id = a.id AND f.side = 'company') AS company_yes,
            (SELECT wants_to_continue FROM meeting_feedback f WHERE f.application_id = a.id AND f.side = 'candidate') AS candidate_yes
     FROM applications a JOIN companies co ON co.id = a.company_id LEFT JOIN roles r ON r.id = a.role_id
     WHERE a.candidate_id = $1 AND a.status = 'approved' ORDER BY co.name`,
    [candidateId],
  );
  return rows.map((r) => ({
    applicationId: r.id,
    title: r.company,
    subtitle: r.role,
    myAnswer: r.candidate_yes,
    bothYes: r.company_yes === true && r.candidate_yes === true,
  }));
}

/** The application, if it is an approved meeting that belongs to this company / this candidate. */
export async function meetingOwner(applicationId: string): Promise<{ companyId: string; candidateId: string } | null> {
  const [a] = await query<{ company_id: string; candidate_id: string; status: string }>(
    `SELECT company_id, candidate_id, status FROM applications WHERE id = $1`,
    [applicationId],
  );
  return a && a.status === "approved" ? { companyId: a.company_id, candidateId: a.candidate_id } : null;
}
