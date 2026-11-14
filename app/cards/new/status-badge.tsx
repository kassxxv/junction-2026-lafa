import { CircleCheck, CircleDashed, MessageCircleQuestion, Quote, Sparkles, UserPen } from "lucide-react";
import type { ComponentType } from "react";
import type { FieldStatus } from "./stub-draft";

/** One look per status: colour is never the only signal — there is always an icon and a word. */
export const STATUS_META: Record<
  FieldStatus,
  { label: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  staff: { label: "Entered by you", icon: UserPen, className: "text-muted-foreground" },
  source: { label: "From source", icon: Quote, className: "bg-status-source-bg text-status-source" },
  ai: { label: "AI suggestion", icon: Sparkles, className: "bg-status-ai-bg text-status-ai" },
  missing: { label: "Missing", icon: CircleDashed, className: "bg-status-missing-bg text-status-missing" },
  confirmed: { label: "Confirmed", icon: CircleCheck, className: "bg-status-confirmed-bg text-status-confirmed" },
  ask: { label: "Ask company", icon: MessageCircleQuestion, className: "bg-status-ask-bg text-status-ask" },
};

export function StatusBadge({ status }: { status: FieldStatus }) {
  const { label, icon: Icon, className } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
