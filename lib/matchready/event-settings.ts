import "server-only";
import { query } from "@/lib/db";
import { getEvent } from "./organiser";

/**
 * Event settings: the one events row that organisers edit. Fields and work types that companies or people already
 * chose cannot be removed (their answers would point at nothing); rename = add the new one, then move the old ones.
 */

export interface EventSettingsInput {
  name: string;
  format: string;
  startsOn: string;
  endsOn: string;
  companyDeadline: string;
  applicationDeadline: string;
  decisionDate: string;
  infoUrl: string | null;
  fields: string[];
  workTypes: string[];
}

/** How many companies / pool members use each field and work type: shown next to each item and checked on save. */
export async function eventUsage(): Promise<{ fields: Record<string, number>; workTypes: Record<string, number> }> {
  const [byField, byWork] = await Promise.all([
    query<{ v: string; n: number }>(
      `SELECT v, count(*)::int AS n FROM (
         SELECT field AS v FROM companies WHERE field IS NOT NULL
         UNION ALL SELECT unnest(fields) FROM pool_profiles) x GROUP BY v`,
    ),
    query<{ v: string; n: number }>(`SELECT work_type AS v, count(*)::int AS n FROM pool_profiles GROUP BY work_type`),
  ]);
  return {
    fields: Object.fromEntries(byField.map((r) => [r.v, r.n])),
    workTypes: Object.fromEntries(byWork.map((r) => [r.v, r.n])),
  };
}

/** Checks the order of dates and that nothing in use disappears. Returns the first problem in plain words, or null. */
export async function checkEventSettings(s: EventSettingsInput): Promise<string | null> {
  if (s.endsOn < s.startsOn) return "The event cannot end before it starts.";
  if (!(s.companyDeadline <= s.applicationDeadline)) return "The company deadline must be on or before the application deadline.";
  if (!(s.applicationDeadline <= s.decisionDate)) return "The decision date must be on or after the application deadline.";
  if (!(s.decisionDate <= s.startsOn)) return "The decision date must be on or before the first event day.";

  const used = await eventUsage();
  const goneField = Object.keys(used.fields).find((f) => !s.fields.includes(f));
  if (goneField) return `“${goneField}” is in use (${used.fields[goneField]}). Keep it, or move those companies and people first.`;
  const goneWork = Object.keys(used.workTypes).find((w) => !s.workTypes.includes(w));
  if (goneWork) return `“${goneWork}” is in use by ${used.workTypes[goneWork]} people in the pool. Keep it.`;
  return null;
}

export async function updateEvent(s: EventSettingsInput): Promise<void> {
  const { id } = await getEvent();
  await query(
    `UPDATE events SET name = $2, format = $3, starts_on = $4, ends_on = $5, company_deadline = $6,
            application_deadline = $7, decision_date = $8, info_url = $9, fields = $10, work_types = $11
      WHERE id = $1`,
    [id, s.name, s.format, s.startsOn, s.endsOn, s.companyDeadline, s.applicationDeadline, s.decisionDate, s.infoUrl, s.fields, s.workTypes],
  );
}
