import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PublicShell } from "@/components/public-shell";
import { isOrganiser, organiserGate } from "@/lib/auth";
import { safeNext } from "@/lib/organiser-session";
import { LoginForm } from "./login-form";

/** Sign-in for event organisers: one shared password (see lib/auth.ts). */
export default function LoginPage(props: PageProps<"/login">) {
  return (
    <PublicShell right="For organisers">
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <Content {...props} />
      </Suspense>
    </PublicShell>
  );
}

async function Content({ searchParams }: PageProps<"/login">) {
  await connection();
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  if (await isOrganiser()) redirect(next);

  return (
    <div className="mx-auto max-w-sm px-5 py-16">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h1 className="title-panel">Organiser sign-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The review screens, decisions and the export for Tavata are for the event team only.
        </p>
        <LoginForm next={next} locked={organiserGate() === "locked"} />
      </div>
    </div>
  );
}
