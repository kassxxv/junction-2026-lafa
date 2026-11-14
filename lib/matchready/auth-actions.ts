"use server";

import { redirect } from "next/navigation";
import { endOrganiserSession, organiserGate, passwordMatches, startOrganiserSession } from "@/lib/auth";
import { LOGIN_PATH, safeNext } from "@/lib/organiser-session";
import { allow, TOO_MANY } from "@/lib/rate-limit";

export interface SignInState {
  error: string | null;
}

/** Organiser sign-in with the shared password. Attempts are rate-limited per client. */
export async function signInOrganiser(_prev: SignInState, form: FormData): Promise<SignInState> {
  const next = safeNext(String(form.get("next") ?? ""));
  const gate = organiserGate();
  if (gate === "open") redirect(next);
  if (gate === "locked") return { error: "Organiser access is not set up on this deployment (ORGANISER_PASSWORD is missing)." };
  if (!(await allow("organiserLogin"))) return { error: TOO_MANY };

  const typed = form.get("password");
  if (typeof typed !== "string" || typed.length > 200 || !passwordMatches(typed)) return { error: "That password is not correct." };
  await startOrganiserSession();
  redirect(next);
}

export async function signOutOrganiser(): Promise<void> {
  await endOrganiserSession();
  redirect(LOGIN_PATH);
}
