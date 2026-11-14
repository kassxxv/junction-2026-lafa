"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInOrganiser, type SignInState } from "@/lib/matchready/auth-actions";

const START: SignInState = { error: null };

export function LoginForm({ next, locked }: { next: string; locked: boolean }) {
  const [state, action, pending] = useActionState(signInOrganiser, START);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm font-medium" htmlFor="password">
        Organiser password
        <Input id="password" name="password" type="password" autoComplete="current-password" autoFocus required disabled={locked} className="mt-1.5 bg-card font-normal" />
      </label>
      {(state.error || locked) && (
        <p role="alert" className="text-sm text-destructive">
          {state.error ?? "Organiser access is not set up on this deployment (ORGANISER_PASSWORD is missing)."}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending || locked} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
