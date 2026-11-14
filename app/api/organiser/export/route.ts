import { isOrganiser } from "@/lib/auth";
import { query } from "@/lib/db";
import { accessCode } from "@/lib/matchready/tavata";

/**
 * GET /api/organiser/export?company=<id> — CSV of APPROVED candidates for Tavata.
 * The only place identity (email) is joined, and only after an organiser approved the person.
 * Access codes are derived from the application id, so re-exporting gives the same codes.
 * Exact Tavata import format: to be confirmed with the organisers (see docs/CONTEXT.md D6).
 *
 * Organisers only: this is the one response that contains email addresses.
 */
export async function GET(request: Request) {
  if (!(await isOrganiser())) return new Response("Sign in as an organiser first.", { status: 401, headers: { "Cache-Control": "no-store" } });
  const companyId = new URL(request.url).searchParams.get("company");
  if (!companyId || companyId.length > 100) return new Response("Missing ?company=", { status: 400 });

  const rows = await query<{ app_id: string; code: string; email: string; company: string; role: string | null }>(
    `SELECT a.id AS app_id, c.code, i.email, co.name AS company, r.title AS role
     FROM applications a
     JOIN candidates c ON c.id = a.candidate_id
     JOIN candidate_identity i ON i.candidate_id = a.candidate_id
     JOIN companies co ON co.id = a.company_id
     LEFT JOIN roles r ON r.id = a.role_id
     WHERE a.company_id = $1 AND a.status = 'approved'
     ORDER BY c.code`,
    [companyId],
  );

  // Company names and role titles are typed by companies. A cell starting with = + - @ would run as a
  // formula when the organiser opens the file in a spreadsheet, so such cells get a leading apostrophe.
  const cell = (v: string | null) => {
    const text = (v ?? "").replace(/[\r\n]+/g, " ");
    return `"${(/^[=+\-@\t]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
  };
  const csv = [
    "access_code,email,candidate_code,company,role",
    ...rows.map((r) => [accessCode(r.app_id), r.email, r.code, r.company, r.role].map(cell).join(",")),
  ].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tavata-${companyId.replace(/[^a-z0-9._-]/gi, "_")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
