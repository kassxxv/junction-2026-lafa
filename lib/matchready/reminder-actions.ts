"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { isOrganiser, SESSION_ENDED } from "@/lib/auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import { markReminded, remindersFor } from "./reminders";

export type ReminderResult =
  | { ok: true; delivered: number; failed: number; preview: { to: string; subject: string; text: string }[]; previewOnly: boolean }
  | { ok: false; error: string };

/** Organisers: send the "want to continue?" reminders for one company's meetings (or show them as a preview). */
export async function sendMeetingReminders(companyId: string): Promise<ReminderResult> {
  if (!(await isOrganiser())) return { ok: false, error: SESSION_ENDED };
  const id = z.string().min(1).max(100).safeParse(companyId);
  if (!id.success) return { ok: false, error: "Choose a company." };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const reminders = await remindersFor(id.data, `${proto}://${host}`);
  if (!reminders.length) return { ok: true, delivered: 0, failed: 0, preview: [], previewOnly: !emailConfigured() };

  let delivered = 0;
  let failed = 0;
  if (emailConfigured()) {
    for (const r of reminders) {
      const res = await sendEmail(r);
      if (res.delivered) {
        delivered++;
        await markReminded(r.applicationIds);
      } else failed++;
    }
  }
  refresh();
  // The preview shows who it is for by name or blind code, never the address.
  const preview = reminders.slice(0, 3).map((r) => ({ to: r.recipientLabel, subject: r.subject, text: r.text }));
  return { ok: true, delivered, failed, preview, previewOnly: !emailConfigured() };
}
