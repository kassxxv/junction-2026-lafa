import { AlertTriangle, CheckCircle2, Info, MinusCircle, XCircle } from "lucide-react";
import type { LinkedinCheck } from "@/lib/matchready/facts";

/**
 * One visual language for facts on every screen (candidate application, organiser review, company card).
 * Colour only carries status, and never alone: every status has an icon and a word.
 *   met     → green check      check → amber triangle      missing → red cross      neutral → grey
 * Everything else (must-have, where a fact comes from) is plain text. Sentence case, no all-caps.
 */
export type FactState = "met" | "check" | "missing" | "neutral";

const ICON: Record<FactState, { Icon: typeof CheckCircle2; className: string; label: string }> = {
  met: { Icon: CheckCircle2, className: "text-status-confirmed", label: "Met" },
  check: { Icon: AlertTriangle, className: "text-status-ai", label: "To check" },
  missing: { Icon: XCircle, className: "text-status-ask", label: "Missing" },
  neutral: { Icon: MinusCircle, className: "text-muted-foreground/70", label: "Not shown" },
};

export function StatusIcon({ state, label, className = "" }: { state: FactState; label?: string; className?: string }) {
  const { Icon, className: tone, label: fallback } = ICON[state];
  return <Icon role="img" aria-label={label ?? fallback} className={`size-4 shrink-0 ${tone} ${className}`} />;
}

/** A requirement row's state: what the candidate shows against what the company asks for. */
export function requirementState(r: { mustHave: boolean; meets: boolean | null }): FactState {
  if (r.meets === true) return "met";
  if (r.mustHave) return r.meets === false ? "missing" : "check";
  return "neutral";
}

const CHECK_STATE: Record<LinkedinCheck["kind"], FactState | "info"> = {
  match: "met",
  differs: "check",
  not_found: "check",
  linkedin_only: "info",
  info: "info",
  none: "info",
};

export const CHECK_STYLE: Record<LinkedinCheck["kind"], { label: string; text: string }> = {
  match: { label: "Match", text: "text-status-confirmed" },
  differs: { label: "Differs", text: "text-status-ai" },
  not_found: { label: "Not on LinkedIn", text: "text-status-ai" },
  linkedin_only: { label: "LinkedIn only", text: "text-muted-foreground" },
  info: { label: "Note", text: "text-muted-foreground" },
  none: { label: "No LinkedIn", text: "text-muted-foreground" },
};

/** One CV ↔ LinkedIn fact as an icon and a sentence. No coloured boxes. */
export function CheckLine({ check }: { check: LinkedinCheck }) {
  const state = CHECK_STATE[check.kind];
  return (
    <li className="flex gap-2.5 py-1.5 text-sm leading-snug">
      {state === "info" ? (
        <Info role="img" aria-label={CHECK_STYLE[check.kind].label} className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
      ) : (
        <StatusIcon state={state} label={CHECK_STYLE[check.kind].label} className="mt-0.5" />
      )}
      <span className={state === "info" ? "text-muted-foreground" : ""}>{check.text}</span>
    </li>
  );
}

/**
 * CV ↔ LinkedIn facts: matches need no action, so they fold into one line; differences and notes stay visible.
 */
export function CheckList({ checks, summaryOnly = false }: { checks: LinkedinCheck[]; summaryOnly?: boolean }) {
  const matches = checks.filter((c) => c.kind === "match");
  const rest = checks.filter((c) => c.kind !== "match");
  return (
    <ul>
      {matches.length > 0 && (
        <li className="py-1.5 text-sm">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden">
              <StatusIcon state="met" label="Match" />
              <span>
                {matches.length} {matches.length === 1 ? "entry matches" : "entries match"} LinkedIn
              </span>
              <span className="text-xs text-muted-foreground underline-offset-4 group-open:hidden hover:underline">Show</span>
            </summary>
            <ul className="mt-1 ml-6.5 text-muted-foreground">
              {matches.map((c, i) => (
                <li key={i} className="py-0.5">
                  {c.text.replace(/: in both CV and LinkedIn/, "")}
                </li>
              ))}
            </ul>
          </details>
        </li>
      )}
      {!summaryOnly && rest.map((c, i) => <CheckLine key={i} check={c} />)}
    </ul>
  );
}

/** "Must-have" next to a requirement: important, not an error, so plain bold text instead of a red badge. */
export function MustHaveBadge() {
  return <span className="text-xs font-semibold whitespace-nowrap text-foreground/75">Must-have</span>;
}
