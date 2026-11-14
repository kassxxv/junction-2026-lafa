/**
 * The event's starting values. Organisers change the live values in Event settings (the events row, read with
 * getEvent()); this object is what db:seed writes, the fallback when the database is down, and the stable id
 * used for Tavata codes.
 *
 * Originally: ONE source for its name, dates, deadlines and fields.
 * These are public facts from espoo.fi (the event is real; companies and people are synthetic).
 *
 * - `npm run db:seed` writes this object into the `events` row.
 * - Pages use `getEvent()` / `getEventOrDefault()`; the landing page and headers render EVENT first and stream in the live values.
 * - Both format dates with the helpers below, so no page spells out a date by hand.
 *
 * No server-only imports: safe in client components and scripts.
 */

export interface EventFacts {
  id: string;
  name: string;
  /** ISO dates, YYYY-MM-DD. */
  startsOn: string;
  endsOn: string;
  /** Stored in the database and shown as-is. */
  format: string;
  /** Short form for headers. */
  place: string;
  fields: string[];
  /** Choices on the talent-pool form. Set by the organisers per event, like the fields; the server accepts nothing else. */
  workTypes: string[];
  careerStages: { id: "student" | "early" | "experienced" | "senior"; label: string }[];
  companyDeadline: string;
  applicationDeadline: string;
  decisionDate: string;
  infoUrl: string;
  infoUrlLabel: string;
}

export const EVENT: EventFacts = {
  id: "dttf-2026",
  name: "Deep Tech Talent Forum",
  startsOn: "2026-11-26",
  endsOn: "2026-11-27",
  format: "Online, in English",
  place: "online",
  fields: ["Semiconductors & Microelectronics", "Photonics", "Quantum technologies"],
  workTypes: ["Testing and validation", "Engineering and design", "Research", "Production", "Business and sales"],
  careerStages: [
    { id: "student", label: "Student" },
    { id: "early", label: "Early career (0–2 years)" },
    { id: "experienced", label: "Experienced (2–7 years)" },
    { id: "senior", label: "Senior (7+ years)" },
  ],
  companyDeadline: "2026-11-18",
  applicationDeadline: "2026-11-20",
  decisionDate: "2026-11-21",
  infoUrl: "https://www.espoo.fi/en/DeepTechTalentForum",
  infoUrlLabel: "espoo.fi",
};

/** Calendar dates have no time zone: format them in UTC so server and browser agree. */
function utc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "18 November" (long) or "18 Nov" (short). */
export function formatDay(iso: string, month: "long" | "short" = "long"): string {
  return utc(iso).toLocaleDateString("en-GB", { day: "numeric", month, timeZone: "UTC" });
}

/** "26–27 November", "26–27 Nov", "26–27 November 2026", or "30 November – 1 December" across months. */
export function formatDateRange(startIso: string, endIso: string, opts: { month?: "long" | "short"; year?: boolean } = {}): string {
  const month = opts.month ?? "long";
  const a = utc(startIso);
  const b = utc(endIso);
  const year = opts.year ? ` ${b.getUTCFullYear()}` : "";
  if (startIso === endIso) return `${formatDay(endIso, month)}${year}`;
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  return sameMonth ? `${a.getUTCDate()}–${formatDay(endIso, month)}${year}` : `${formatDay(startIso, month)} – ${formatDay(endIso, month)}${year}`;
}

/** Initials of the event name, e.g. "Deep Tech Talent Forum" → "DTTF" (prefix of meeting-pass codes). */
export function eventInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}
