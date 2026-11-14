import { hasValue } from "./field-row";
import { DONE, GOALS, type DraftField, type DraftSection, type GoalId } from "./stub-draft";

/** The card as event organisers and candidates will see it. Values not yet confirmed are marked. */
export function CardPreview({ sections, goals }: { sections: DraftSection[]; goals: GoalId[] }) {
  const get = (sectionId: string, fieldId: string) =>
    sections.find((s) => s.id === sectionId)?.fields.find((f) => f.id === fieldId);
  const name = get("company", "name");
  const summary = get("company", "summary");
  const goalLabels = GOALS.filter((g) => goals.includes(g.id)).map((g) => g.label.toLowerCase());

  return (
    <article className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border px-7 pt-7 pb-6">
        <h2 className="text-2xl font-semibold tracking-tight">{name?.value as string}</h2>
        {summary && <Value field={summary} className="mt-2 text-muted-foreground" />}
        {goalLabels.length > 0 && (
          <p className="mt-4 text-sm">
            At this event they want to {goalLabels.join(" and ")}.
          </p>
        )}
      </header>

      {sections
        .filter((s) => s.id !== "company")
        .map((s) => (
          <section key={s.id} className="border-b border-border px-7 py-6 last:border-0">
            <h3 className="mb-4 text-lg font-semibold">{s.title}</h3>
            <dl className="grid gap-4">
              {s.fields
                .filter((f) => hasValue(f.value))
                .map((f) => (
                  <div key={f.id}>
                    <dt className="mb-1 text-sm text-muted-foreground">{f.label}</dt>
                    <dd>
                      <Value field={f} />
                    </dd>
                  </div>
                ))}
            </dl>
          </section>
        ))}
    </article>
  );
}

function Value({ field, className = "" }: { field: DraftField; className?: string }) {
  const pending = !DONE.includes(field.status);
  const body = Array.isArray(field.value) ? (
    <span className="flex flex-wrap gap-1.5">
      {field.value.map((v) => (
        <span key={v} className="rounded-md bg-muted px-2 py-0.5 text-sm">
          {v}
        </span>
      ))}
    </span>
  ) : (
    <span>{field.value}</span>
  );
  return (
    <div className={`${className} ${pending ? "rounded-md border border-dashed border-status-ai/60 p-2" : ""}`}>
      {body}
      {pending && <span className="mt-1 block text-xs text-status-ai">Not confirmed yet</span>}
    </div>
  );
}
