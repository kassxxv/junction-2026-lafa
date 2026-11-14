"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { isOrganiser, SESSION_ENDED } from "@/lib/auth";
import { checkEventSettings, updateEvent } from "./event-settings";

const isoDate = z.iso.date();
const list = z
  .array(z.string().trim().min(1).max(100))
  .max(20)
  .transform((xs) => [...new Set(xs)]);

const Settings = z.object({
  name: z.string().trim().min(2).max(120),
  format: z.string().trim().min(2).max(120),
  startsOn: isoDate,
  endsOn: isoDate,
  companyDeadline: isoDate,
  applicationDeadline: isoDate,
  decisionDate: isoDate,
  infoUrl: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null)
    .pipe(z.url({ protocol: /^https?$/ }).nullable()),
  fields: list.refine((xs) => xs.length > 0, "Add at least one field."),
  workTypes: list.refine((xs) => xs.length > 0, "Add at least one type of work."),
});

export type SaveResult = { ok: true } | { ok: false; error: string };

const LABEL: Record<string, string> = {
  name: "Enter the event name.",
  format: "Enter the format, e.g. “Online, in English”.",
  infoUrl: "The event page must be a full link starting with https://",
  fields: "Add at least one field.",
  workTypes: "Add at least one type of work.",
};

export async function saveEventSettings(input: z.input<typeof Settings>): Promise<SaveResult> {
  if (!(await isOrganiser())) return { ok: false, error: SESSION_ENDED };
  const parsed = Settings.safeParse(input);
  if (!parsed.success) {
    const path = String(parsed.error.issues[0]?.path[0]);
    return { ok: false, error: LABEL[path] ?? "Check the dates and try again." };
  }
  const problem = await checkEventSettings(parsed.data);
  if (problem) return { ok: false, error: problem };
  await updateEvent(parsed.data);
  refresh();
  return { ok: true };
}
