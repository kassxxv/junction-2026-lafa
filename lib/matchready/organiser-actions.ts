"use server";

import { refresh } from "next/cache";
import { demoMode, isOrganiser, SESSION_ENDED } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { REVIEW_SESSION_GAP_MINUTES } from "./config";
import { getReview, ORGANISER } from "./organiser";

/**
 * Organiser decisions. Rules are enforced here, not only in the UI:
 * - batch approval only for clean cases (all must-haves met, nothing to check);
 * - anything else needs a written note to approve;
 * - never more approvals than places;
 * - every decision is a row in `decisions` (who, when, rule, note).
 *
 * Server Actions are public HTTP endpoints, so each one checks the organiser session itself
 * (the proxy on /organiser is not enough) and validates its arguments.
 */

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const CLEAN_RULE = "must-haves met, nothing to check";

type Q = Parameters<Parameters<typeof withTransaction>[0]>[0];

/** Metric 1: one review session per company while the organiser keeps working (a gap of REVIEW_SESSION_GAP_MINUTES ends it). */
async function touchSession(q: Q, companyId: string) {
  const open = await q<{ id: number }>(
    `SELECT id FROM review_sessions WHERE company_id = $1 AND organiser = $2
       AND coalesce(last_action_at, started_at) > now() - make_interval(mins => $3::int)
     ORDER BY id DESC LIMIT 1`,
    [companyId, ORGANISER, REVIEW_SESSION_GAP_MINUTES],
  );
  if (open[0]) await q(`UPDATE review_sessions SET last_action_at = now() WHERE id = $1`, [open[0].id]);
  else await q(`INSERT INTO review_sessions (company_id, organiser, started_at, last_action_at) VALUES ($1, $2, now(), now())`, [companyId, ORGANISER]);
}

export async function startReview(companyId: string): Promise<void> {
  if (typeof companyId !== "string" || !(await isOrganiser())) return;
  await withTransaction((q) => touchSession(q, companyId));
}

/**
 * Decisions for one company run one at a time: the lock is taken first and the rules are checked
 * on the state read after it, so two organisers (or a double click) cannot fill more places than exist.
 */
async function lockCompany(q: Q, companyId: string) {
  await q(`SELECT 1 FROM company_cards WHERE company_id = $1 FOR UPDATE`, [companyId]);
}

export async function approveClean(companyId: string, applicationIds: string[]): Promise<ActionResult> {
  if (!(await isOrganiser())) return { ok: false, error: SESSION_ENDED };
  if (typeof companyId !== "string" || !Array.isArray(applicationIds) || applicationIds.length > 200 || applicationIds.some((id) => typeof id !== "string")) {
    return { ok: false, error: "Nothing selected." };
  }
  const ids = [...new Set(applicationIds)];
  const result = await withTransaction<ActionResult>(async (q) => {
    await lockCompany(q, companyId);
    const review = await getReview(companyId);
    if (!review) return { ok: false, error: "Company not found." };
    const byId = new Map(review.applications.map((a) => [a.id, a]));
    const chosen = ids.map((id) => byId.get(id)).filter((a) => a !== undefined);
    const notClean = chosen.filter((a) => a.status !== "clean");
    if (notClean.length) {
      return { ok: false, error: `${notClean.map((a) => a.code).join(", ")} need a look first. Open them to approve with a note.` };
    }
    const filled = review.applications.filter((a) => a.status === "approved").length;
    const free = review.company.places - filled;
    if (chosen.length > free) return { ok: false, error: `Only ${free} places left. Select ${free} or fewer.` };
    if (!chosen.length) return { ok: false, error: "Nothing selected." };

    for (const a of chosen) {
      await q(`UPDATE applications SET status = 'approved' WHERE id = $1`, [a.id]);
      await q(`INSERT INTO decisions (application_id, organiser, action, batch, rule) VALUES ($1, $2, 'approve', true, $3)`, [a.id, ORGANISER, CLEAN_RULE]);
    }
    await touchSession(q, companyId);
    return { ok: true, message: `${chosen.length} approved` };
  });
  if (result.ok) refresh();
  return result;
}

export async function decide(
  companyId: string,
  applicationId: string,
  action: "approve" | "decline" | "undo",
  note: string,
): Promise<ActionResult> {
  if (!(await isOrganiser())) return { ok: false, error: SESSION_ENDED };
  if (typeof companyId !== "string" || typeof applicationId !== "string" || typeof note !== "string" || !["approve", "decline", "undo"].includes(action)) {
    return { ok: false, error: "Application not found." };
  }
  const text = note.trim().slice(0, 500);
  const result = await withTransaction<ActionResult>(async (q) => {
    await lockCompany(q, companyId);
    const review = await getReview(companyId);
    const app = review?.applications.find((a) => a.id === applicationId);
    if (!review || !app) return { ok: false, error: "Application not found." };

    if (action === "approve") {
      if (app.status === "approved") return { ok: false, error: `${app.code} is already approved.` };
      if (app.status !== "clean" && !text) return { ok: false, error: "Write a short note: why approve despite what is flagged?" };
      const filled = review.applications.filter((a) => a.status === "approved").length;
      if (filled >= review.company.places) return { ok: false, error: "All places are filled. Undo another approval first." };
    }

    const status = action === "approve" ? "approved" : action === "decline" ? "declined" : "submitted";
    const rule =
      action === "approve"
        ? app.status === "clean"
          ? CLEAN_RULE
          : app.status === "missing"
            ? "manual: must-have missing"
            : "manual: approved with note"
        : action === "decline"
          ? "declined, Program Pass offered"
          : "undo";

    await q(`UPDATE applications SET status = $2 WHERE id = $1`, [applicationId, status]);
    await q(`INSERT INTO decisions (application_id, organiser, action, note, batch, rule) VALUES ($1, $2, $3, $4, false, $5)`, [
      applicationId, ORGANISER, action, text || null, rule,
    ]);
    await touchSession(q, companyId);
    const done = action === "approve" ? "approved" : action === "decline" ? "declined, Program Pass offered" : "back to review";
    return { ok: true, message: `${app.code} ${done}` };
  });
  if (result.ok) refresh();
  return result;
}

/** Demo helper: puts one company's review back to the start. It deletes the decision log, so it exists only in demo mode. */
export async function resetReview(companyId: string): Promise<ActionResult> {
  if (!(await isOrganiser())) return { ok: false, error: SESSION_ENDED };
  if (!demoMode()) return { ok: false, error: "Reset is only available in demo mode." };
  if (typeof companyId !== "string") return { ok: false, error: "Company not found." };
  await withTransaction(async (q) => {
    await q(`DELETE FROM decisions WHERE application_id IN (SELECT id FROM applications WHERE company_id = $1)`, [companyId]);
    await q(`UPDATE applications SET status = 'submitted' WHERE company_id = $1`, [companyId]);
    await q(`DELETE FROM review_sessions WHERE company_id = $1`, [companyId]);
  });
  refresh();
  return { ok: true, message: "Review reset" };
}
