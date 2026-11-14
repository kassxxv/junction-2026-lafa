const STEPS = ["Talent pool", "Company deadline", "Choose and apply", "Organiser review", "Meetings on Tavata"];

/** Where the candidate is in the process. `stage` = index of the current step. Safe in client components. */
export function Timeline({ stage }: { stage: number }) {
  return (
    <ol className="my-6 grid grid-cols-5 gap-2" aria-label="Your progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-col gap-1.5">
          <span className={`h-1.5 rounded-full ${i < stage ? "bg-status-confirmed" : i === stage ? "bg-primary" : "bg-muted"}`} />
          <span className={`text-xs sm:text-sm ${i <= stage ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
        </li>
      ))}
    </ol>
  );
}
