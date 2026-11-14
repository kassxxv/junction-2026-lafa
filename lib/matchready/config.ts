/**
 * Every threshold and limit of the product in one place. Change a rule here, not in a screen.
 * No server-only imports: safe in client components and scripts.
 */

/* ---------------- Candidate side ---------------- */

/** A candidate applies to at most this many companies. */
export const MAX_COMPANIES_PER_CANDIDATE = 3;
/** Uploaded CV / LinkedIn export: file size and how much text we keep and send to Gemma. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_DOCUMENT_CHARS = 30_000;

/* ---------------- Company side ---------------- */

/** The card draft asks the company at most this many questions. */
export const MAX_CARD_QUESTIONS = 3;
export const MAX_COMPANY_INPUT_CHARS = 20_000;
/** How much of a linked web page goes into the Gemini prompt. */
export const MAX_COMPANY_PAGE_CHARS = 15_000;
/** Optional company task: length of the task and of a candidate's answer. */
export const MAX_TASK_CHARS = 1500;
export const MAX_TASK_ANSWER_CHARS = 4000;
/** What the candidate is told the task should take. */
export const TASK_MINUTES = 20;

/* ---------------- Facts compared by code ---------------- */

/** CV and LinkedIn dates may differ by this many months and still count as the same job (shown, never hidden). */
export const DATE_TOLERANCE_MONTHS = 3;
/** Graduation years may differ by this much between CV and LinkedIn. */
export const EDUCATION_YEAR_TOLERANCE = 1;

/* ---------------- Organiser review ---------------- */

/** Bias check: flag a group whose share among approved is this far below its share among applicants. */
export const BIAS_GAP_THRESHOLD = 0.15;
/** Bias check: below this many approvals the shares mean little. */
export const BIAS_MIN_APPROVALS = 3;
/** Metric 1: a review session ends after this many minutes without an action. */
export const REVIEW_SESSION_GAP_MINUTES = 30;
/** Organiser login cookie lifetime. */
export const ORGANISER_SESSION_HOURS = 12;

/* ---------------- Abuse limits (see lib/rate-limit.ts) ---------------- */

export interface RateRule {
  /** Calls allowed per client (hashed IP) inside `windowSeconds`. */
  perClient: number;
  windowSeconds: number;
  /** Calls allowed per day across all clients: a hard cap on what a public demo can spend. */
  perDay: number;
}

export const RATE_LIMITS = {
  /** Gemini + Context.dev: one company card draft. */
  companyDraft: { perClient: 6, windowSeconds: 10 * 60, perDay: 300 },
  /** Gemini: three task suggestions for a card. */
  taskSuggest: { perClient: 6, windowSeconds: 10 * 60, perDay: 300 },
  /** Gemma: one CV or LinkedIn document. */
  documentParse: { perClient: 10, windowSeconds: 10 * 60, perDay: 500 },
  /** PDF text extraction at stage 1 (CPU only, no AI). */
  documentRead: { perClient: 20, windowSeconds: 10 * 60, perDay: 2000 },
  /** New talent-pool registrations. */
  joinPool: { perClient: 10, windowSeconds: 10 * 60, perDay: 1000 },
  /** Company invitation-code attempts. */
  companyLogin: { perClient: 10, windowSeconds: 10 * 60, perDay: 1000 },
  /** Organiser password attempts. */
  organiserLogin: { perClient: 8, windowSeconds: 10 * 60, perDay: 500 },
} satisfies Record<string, RateRule>;

export type RateBucket = keyof typeof RATE_LIMITS;
