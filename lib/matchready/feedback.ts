import "server-only";
import { query } from "@/lib/db";

/**
 * Metric 2: share of meetings where BOTH sides want to continue. One yes/no per side per meeting.
 * Shown only as aggregates per company — never as a judgement of a person.
 */

export interface MeetingView {
  applicationId: string;
  company: string;
  role: string | null;
  candidateCode: string;
  answers: { company: boolean | null; candidate: boolean | null };
}

export async function getMeeting(applicationId: string): Promise<MeetingView | null> {
  const [m] = await query<{ company: string; role: string | null; code: string; status: string }>(
    `SELECT co.name AS company, r.title AS role, c.code, a.status FROM applications a
     JOIN companies co ON co.id = a.company_id JOIN candidates c ON c.id = a.candidate_id
     LEFT JOIN roles r ON r.id = a.role_id WHERE a.id = $1`,
    [applicationId],
  );
  if (!m || m.status !== "approved") return null; // only approved applications become meetings
  const answers = await query<{ side: "company" | "candidate"; wants_to_continue: boolean }>(
    `SELECT side, wants_to_continue FROM meeting_feedback WHERE application_id = $1`,
    [applicationId],
  );
  return {
    applicationId,
    company: m.company,
    role: m.role,
    candidateCode: m.code,
    answers: {
      company: answers.find((a) => a.side === "company")?.wants_to_continue ?? null,
      candidate: answers.find((a) => a.side === "candidate")?.wants_to_continue ?? null,
    },
  };
}

export async function recordAnswer(applicationId: string, side: "company" | "candidate", yes: boolean): Promise<void> {
  await query(
    `INSERT INTO meeting_feedback (application_id, side, wants_to_continue) VALUES ($1, $2, $3)
     ON CONFLICT (application_id, side) DO UPDATE SET wants_to_continue = EXCLUDED.wants_to_continue, created_at = now()`,
    [applicationId, side, yes],
  );
}

export interface FeedbackDashboard {
  meetings: number; // meetings where both sides answered
  bothYes: number;
  oneSideOnly: number; // waiting for the other side
  perCompany: { company: string; meetings: number; bothYes: number }[];
  demoMeeting: { applicationId: string; company: string; candidateCode: string } | null;
}

export async function getFeedbackDashboard(): Promise<FeedbackDashboard> {
  const [per, waiting, demo] = await Promise.all([
    query<{ company: string; meetings: number; both_yes: number }>(
      `SELECT co.name AS company, count(*)::int AS meetings, count(*) FILTER (WHERE m.yes = 2)::int AS both_yes
       FROM (SELECT application_id, count(*) FILTER (WHERE wants_to_continue) AS yes FROM meeting_feedback
             GROUP BY application_id HAVING count(*) = 2) m
       JOIN applications a ON a.id = m.application_id JOIN companies co ON co.id = a.company_id
       GROUP BY co.name ORDER BY count(*) DESC, co.name`,
    ),
    query<{ n: number }>(
      `SELECT count(*)::int AS n FROM (SELECT application_id FROM meeting_feedback GROUP BY application_id HAVING count(*) = 1) x`,
    ),
    query<{ id: string; company: string; code: string }>(
      `SELECT a.id, co.name AS company, c.code FROM applications a
       JOIN companies co ON co.id = a.company_id JOIN candidates c ON c.id = a.candidate_id
       WHERE a.status = 'approved' AND (SELECT count(*) FROM meeting_feedback f WHERE f.application_id = a.id) < 2
       ORDER BY (a.company_id = 'quantumlab') DESC, c.code LIMIT 1`,
    ),
  ]);
  return {
    meetings: per.reduce((n, p) => n + p.meetings, 0),
    bothYes: per.reduce((n, p) => n + p.both_yes, 0),
    oneSideOnly: waiting[0]?.n ?? 0,
    perCompany: per.map((p) => ({ company: p.company, meetings: p.meetings, bothYes: p.both_yes })),
    demoMeeting: demo[0] ? { applicationId: demo[0].id, company: demo[0].company, candidateCode: demo[0].code } : null,
  };
}
