import type { LinkedinCheck } from "@/lib/matchready/facts";

/**
 * One look for the same facts on every screen: the candidate's application and the organiser's
 * review show CV ↔ LinkedIn checks and must-have badges identically. Sentence case, no all-caps.
 */
export const CHECK_STYLE: Record<LinkedinCheck["kind"], { label: string; text: string; border: string }> = {
  match: { label: "Match", text: "text-status-confirmed", border: "border-status-confirmed" },
  differs: { label: "Differs", text: "text-status-ai", border: "border-status-ai" },
  not_found: { label: "Not found", text: "text-status-missing", border: "border-status-missing" },
  linkedin_only: { label: "LinkedIn only", text: "text-muted-foreground", border: "border-border" },
  info: { label: "Note", text: "text-muted-foreground", border: "border-border" },
  none: { label: "No LinkedIn", text: "text-muted-foreground", border: "border-border" },
};

/** The small "Must-have" badge next to a requirement. */
export function MustHaveBadge() {
  return <span className="inline-block rounded bg-status-ask-bg px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-status-ask">Must-have</span>;
}
