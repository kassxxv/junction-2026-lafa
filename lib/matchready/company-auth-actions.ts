"use server";

import { redirect } from "next/navigation";
import { endCompanySession, startCompanySession } from "@/lib/auth";
import { query } from "@/lib/db";
import { hashInviteCode, normalizeInviteCode } from "@/lib/invite-code";
import { allow, TOO_MANY } from "@/lib/rate-limit";

export interface CompanySignInState {
  error: string | null;
}

/** A company signs in with the invitation code from its e-mail. Attempts are rate-limited per client. */
export async function signInCompany(_prev: CompanySignInState, form: FormData): Promise<CompanySignInState> {
  const typed = form.get("code");
  if (typeof typed !== "string" || typed.length > 60 || normalizeInviteCode(typed).length < 6) return { error: "Enter the code from your invitation." };
  if (!(await allow("companyLogin"))) return { error: TOO_MANY };
  const [company] = await query<{ id: string }>(`SELECT id FROM companies WHERE invite_code_hash = $1`, [hashInviteCode(typed)]);
  if (!company) return { error: "That code is not valid. Check the invitation e-mail or ask the organisers." };
  await startCompanySession(company.id);
  redirect("/company");
}

export async function signOutCompany(): Promise<void> {
  await endCompanySession();
  redirect("/company");
}
