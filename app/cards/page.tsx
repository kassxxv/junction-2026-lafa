import { ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Synthetic rows; nothing is stored yet. */
const CARDS = [
  { id: "norrvik", company: "Norrvik Logistics Oy", goals: "Fill a position, explore talent", status: "Draft", done: 6, total: 9 },
  { id: "kallio", company: "Kallio Health Tech", goals: "Fill a position", status: "Published", done: 8, total: 8 },
  { id: "aalto", company: "Aalto Grid Energy", goals: "Employer branding", status: "Waiting for the company", done: 2, total: 3 },
];

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Published: "bg-status-confirmed-bg text-status-confirmed",
  "Waiting for the company": "bg-status-ask-bg text-status-ask",
};

export default function CardsPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-card px-6 py-4">
        <div>
          <p className="text-sm text-muted-foreground">Tech and Logistics Day</p>
          <h1 className="text-xl font-semibold tracking-tight">Company cards</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="bg-card">
            <Link href="/company">
              <ExternalLink data-icon="inline-start" />
              Company view
            </Link>
          </Button>
          <Button asChild>
            <Link href="/cards/new">
              <Plus data-icon="inline-start" />
              New card
            </Link>
          </Button>
        </div>
      </header>

      <div className="p-6">
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Why they come</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Required fields</th>
              </tr>
            </thead>
            <tbody>
              {CARDS.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3.5 font-medium">
                    <Link href="/cards/new?step=review" className="hover:underline">
                      {c.company}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{c.goals}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground tabular-nums">
                    {c.done} of {c.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Sample companies for the prototype. All data is synthetic.</p>
      </div>
    </div>
  );
}
