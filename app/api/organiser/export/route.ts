import { createHash } from "node:crypto";
import { query } from "@/lib/db";

/**
 * GET /api/organiser/export?company=<id> — CSV of APPROVED candidates for Tavata.
 * The only place identity (email) is joined, and only after an organiser approved the person.
 * Access codes are derived from the application id, so re-exporting gives the same codes.
 * Exact Tavata import format: to be confirmed with the organisers (see docs/CONTEXT.md D6).
 */
export async function GET(request: Request) {
  const companyId = new URL(request.url).searchParams.get("company");
  if (!companyId) return new Response("Missing ?company=", { status: 400 });

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

  const accessCode = (id: string) => {
    const h = createHash("sha256").update(`dttf-2026:${id}`).digest("hex").toUpperCase();
    return `DTTF-${h.slice(0, 4)}-${h.slice(4, 8)}`;
  };
  const cell = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    "access_code,email,candidate_code,company,role",
    ...rows.map((r) => [accessCode(r.app_id), r.email, r.code, r.company, r.role].map(cell).join(",")),
  ].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tavata-${companyId}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
