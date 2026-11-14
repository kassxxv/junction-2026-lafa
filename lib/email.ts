import "server-only";
import { env } from "./env";
import { classifyError, logFailure, withTimeout, type ErrorCode, type ServiceHealth } from "./service";

/**
 * E-mail via Resend (https://resend.com), plain HTTPS, no SDK.
 * - No RESEND_API_KEY: nothing is sent; callers show the message as a preview instead.
 * - DEMO_EMAIL_TO set: every message goes to that one inbox (demo people have synthetic addresses).
 * Never log addresses or message bodies.
 */

export interface Email {
  to: string;
  subject: string;
  text: string;
}

export type EmailResult = { delivered: true } | { delivered: false; reason: ErrorCode | "preview" };

const SEND_TIMEOUT_MS = 10_000;

export function emailConfigured(): boolean {
  return Boolean(env().RESEND_API_KEY);
}

export async function sendEmail(email: Email): Promise<EmailResult> {
  const { RESEND_API_KEY, EMAIL_FROM, DEMO_EMAIL_TO } = env();
  if (!RESEND_API_KEY) return { delivered: false, reason: "preview" };
  const to = DEMO_EMAIL_TO ?? email.to;
  const text = DEMO_EMAIL_TO ? `${email.text}\n\n(Demo: this message was meant for a synthetic address.)` : email.text;
  try {
    await withTimeout(SEND_TIMEOUT_MS, async (signal) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal,
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EMAIL_FROM ?? "bridgy <onboarding@resend.dev>", to: [to], subject: email.subject, text }),
      });
      if (!res.ok) throw Object.assign(new Error("resend http error"), { status: res.status });
    });
    return { delivered: true };
  } catch (err) {
    const reason = classifyError(err);
    logFailure("email", "send", reason);
    return { delivered: false, reason };
  }
}

/** Reports whether e-mail is configured. Sends nothing (a probe would cost a message). */
export async function health(): Promise<ServiceHealth> {
  // Optional service: without a key the app shows previews, so "not set" must not turn the overall status red.
  return emailConfigured() ? { status: "unchecked", mode: "live", details: { configured: true } } : { status: "unchecked", mode: "stub", details: { configured: false } };
}
