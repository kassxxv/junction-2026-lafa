/**
 * Everything that exists only for the demo, in one place: the demo organiser, which seeded
 * company each demo step uses, and the "fill demo …" texts. All of it is SYNTHETIC.
 * Product code must not depend on these values except through the clearly labelled demo helpers.
 * No server-only imports: safe in client components and scripts.
 */

/** No real accounts in the prototype: every decision is logged under this demo organiser. */
export const DEMO_ORGANISER = {
  name: "Laura",
  initials: "LA",
  role: "Demo organiser",
  /** Written to `decisions.organiser` and `review_sessions.organiser`. */
  logName: "Laura (organiser, demo)",
};

/**
 * Demo invitation codes, one per seeded company ("kuura-photonics" → "KUURA-2026"). They are in a public repo,
 * so they are demo-only: real codes come from generateInviteCode() and only their hash is stored.
 */
export function demoInviteCode(companyId: string): string {
  return `${companyId.split("-")[0].toUpperCase()}-2026`;
}

/** Draft company with no applications: the live company demo (/company) starts here. */
export const DEMO_COMPANY_ID = "kuura-photonics";
/** Synthetic careers page served by this app, so the demo reads a real URL. */
export const DEMO_CAREERS_PATH = `/demo/${DEMO_COMPANY_ID}/careers`;
/** "Fill demo text" on the company page. `origin` is the site's own origin. */
export function demoCompanyText(origin: string): string {
  return `Need a photonics test engineer. See our careers page: ${origin.replace(/^https?:\/\//, "")}${DEMO_CAREERS_PATH}`;
}

/** Company whose review stays untouched by the seed: the live selection demo. */
export const DEMO_REVIEW_COMPANY_ID = "nordic-photonics";
/** The case the review screen opens first (title differs between CV and LinkedIn). */
export const DEMO_REVIEW_FOCUS_CODE = "A-07";
/** The seed leaves one approved meeting of this company without answers for the feedback demo. */
export const DEMO_FEEDBACK_COMPANY_ID = "quantumlab";

/** "Fill demo answers" for the synthetic candidate Aisha (same person as seed case A-07 and public/demo/*.pdf). */
export const DEMO_CANDIDATE = {
  field: "Photonics",
  languages: [
    { language: "English", level: "C1" },
    { language: "Arabic", level: "Native" },
    { language: "Finnish", level: "A2" },
  ] as { language: string; level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native" }[],
  /** A fresh address each time, so the demo can be repeated. */
  email: () => `aisha.demo+${Date.now().toString(36)}@example.com`,
  cvFile: "/demo/aisha-rahman-cv.pdf",
  linkedinFile: "/demo/aisha-rahman-linkedin.pdf",
  /** Synthetic answer to Nordic Photonics' demo task (also used by "Fill demo answers"). */
  taskAnswer:
    "At Valo Optics I set up an insertion-loss bench for fibre couplers: a tunable laser, a polarisation scrambler, the coupler under test and an optical power meter, all driven from Python. First I measured the reference without the device to get the baseline. One batch looked 0.4 dB too lossy; I checked the connectors first, then repeated the reference measurement, and found a dirty patch cord. After cleaning, the results matched the datasheet. I would check connector cleanliness and the reference again before blaming the device.",
  starter:
    "At Valo Optics I built an automated insertion-loss test bench for fibre couplers. Python drives the spectrum analyser, and test time per batch went from 3 hours to 40 minutes.",
};

/** Fixed "today" for seed data and evals, so their results do not drift. The app itself uses the current month. */
export const SEED_REFERENCE_MONTH = "2026-11";
