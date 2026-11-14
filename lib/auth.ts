import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";
import { ORGANISER_SESSION_HOURS } from "./matchready/config";
import { createSessionToken, gateMode, LOGIN_PATH, ORGANISER_COOKIE, safeNext, verifySessionToken, type GateMode } from "./organiser-session";

/**
 * Organiser access: one shared password (env ORGANISER_PASSWORD), a signed httpOnly cookie.
 * A prototype-level gate, not accounts: it keeps the review screens, the decisions and the
 * export (the only place emails are read) away from anyone who merely has the URL.
 *
 * `proxy.ts` blocks the pages early; the functions here are the check that counts, called inside
 * every organiser Server Action, route handler and page.
 */

export function organiserGate(): GateMode {
  return gateMode(env().ORGANISER_PASSWORD, process.env.NODE_ENV);
}

export async function isOrganiser(): Promise<boolean> {
  const mode = organiserGate();
  if (mode === "open") return true;
  if (mode === "locked") return false;
  return verifySessionToken(env().ORGANISER_PASSWORD!, (await cookies()).get(ORGANISER_COOKIE)?.value);
}

/** For pages: sends anyone without a session to the sign-in page. */
export async function requireOrganiserPage(returnTo: string): Promise<void> {
  if (!(await isOrganiser())) redirect(`${LOGIN_PATH}?next=${encodeURIComponent(safeNext(returnTo))}`);
}

export const SESSION_ENDED = "Your organiser session has ended. Sign in again.";

/** Constant-time comparison of the typed password with the configured one. */
export function passwordMatches(typed: string): boolean {
  const expected = env().ORGANISER_PASSWORD;
  if (!expected) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(typed), digest(expected));
}

export async function startOrganiserSession(): Promise<void> {
  const password = env().ORGANISER_PASSWORD;
  if (!password) return;
  (await cookies()).set(ORGANISER_COOKIE, await createSessionToken(password, ORGANISER_SESSION_HOURS), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ORGANISER_SESSION_HOURS * 60 * 60,
  });
}

export async function endOrganiserSession(): Promise<void> {
  (await cookies()).delete(ORGANISER_COOKIE);
}

/**
 * Demo helpers (reset a review, reset a company card) change shared data, so they exist only in
 * demo mode: DEMO_MODE=1, or any non-production run when DEMO_MODE is not set.
 */
export function demoMode(): boolean {
  const flag = env().DEMO_MODE;
  return flag ?? process.env.NODE_ENV !== "production";
}
