"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInCompany, type CompanySignInState } from "@/lib/matchready/company-auth-actions";

const START: CompanySignInState = { error: null };

/** Companies sign in with the code from their invitation e-mail. */
export function CompanySignIn({ demoCodes }: { demoCodes: { code: string; company: string; what: string }[] }) {
  const [state, action, pending] = useActionState(signInCompany, START);

  return (
    <div className="page-narrow px-5 py-16">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h1 className="title-panel">Company sign-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter the code from your invitation e-mail.</p>
        <form action={action} className="mt-6 space-y-4">
          <label className="block text-sm font-medium" htmlFor="code">
            Invitation code
            <Input id="code" name="code" autoComplete="one-time-code" autoFocus required className="mt-1.5 bg-card font-normal uppercase" />
          </label>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>

      {demoCodes.length > 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-border p-5 text-sm">
          <p className="font-medium">Demo codes (synthetic companies)</p>
          <ul className="mt-2 space-y-1.5">
            {demoCodes.map((d) => (
              <li key={d.code}>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{d.code}</code> {d.company}:{" "}
                <span className="text-muted-foreground">{d.what}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
