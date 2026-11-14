"use client";

import { Check, Pencil, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { hasValue, TagEditor, TextEditor } from "../cards/new/field-row";
import { GOALS, type DraftField, type DraftSection, type GoalId } from "../cards/new/stub-draft";

/**
 * The finished card for the company: reads like a document, no boxes per field.
 * Click any value to change it. Guesses are marked softly and can be confirmed.
 */
export function CardDocument({
  sections,
  goals,
  onUpdate,
}: {
  sections: DraftSection[];
  goals: GoalId[];
  onUpdate: (fieldId: string, patch: Partial<DraftField>) => void;
}) {
  const company = sections.find((s) => s.id === "company");
  const name = company?.fields.find((f) => f.id === "name");
  const summary = company?.fields.find((f) => f.id === "summary");
  const eventGoal = company?.fields.find((f) => f.id === "event-goal");
  const goalText = GOALS.filter((g) => goals.includes(g.id)).map((g) => g.label.toLowerCase());

  return (
    <article className="text-[1.02rem] leading-relaxed">
      <h2 className="text-3xl font-semibold tracking-tight">{name?.value as string}</h2>
      {summary && (
        <div className="mt-2 text-muted-foreground">
          <EditableValue field={summary} onUpdate={(p) => onUpdate(summary.id, p)} />
        </div>
      )}
      {goalText.length > 0 && <p className="mt-5">At this event you want to {goalText.join(" and ")}.</p>}
      {eventGoal && (
        <div className="mt-5">
          <div className="text-sm text-muted-foreground">{eventGoal.label}</div>
          <div className="mt-0.5">
            <EditableValue field={eventGoal} onUpdate={(p) => onUpdate(eventGoal.id, p)} />
          </div>
        </div>
      )}

      {sections
        .filter((s) => s.id !== "company")
        .map((s) => (
          <section key={s.id} className="mt-10">
            <h3 className="text-xl font-semibold tracking-tight">
              {s.goal === "fill" ? `Open role: ${s.title}` : s.title}
            </h3>
            <dl className="mt-4 space-y-5">
              {s.fields.map((f) => (
                <div key={f.id}>
                  <dt className="text-sm text-muted-foreground">{f.label}</dt>
                  <dd className="mt-0.5">
                    <EditableValue field={f} onUpdate={(p) => onUpdate(f.id, p)} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
    </article>
  );
}

function EditableValue({ field, onUpdate }: { field: DraftField; onUpdate: (p: Partial<DraftField>) => void }) {
  const [editing, setEditing] = useState(false);
  const guessed = field.status === "ai";
  const open = !hasValue(field.value);

  if (field.kind === "list" && (editing || !open)) {
    return (
      <div>
        <TagEditor
          values={Array.isArray(field.value) ? field.value : []}
          onChange={(v) => onUpdate({ value: v, status: v.length ? "confirmed" : "missing" })}
          onFocus={() => setEditing(true)}
        />
        {guessed && <GuessNote onConfirm={() => onUpdate({ status: "confirmed" })} />}
      </div>
    );
  }

  if (editing) {
    return (
      <TextEditor
        initial={typeof field.value === "string" ? field.value : ""}
        onSave={(v) => {
          onUpdate({ value: v, status: v ? "confirmed" : "missing" });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group -mx-1.5 rounded-md px-1.5 py-0.5 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {open ? (
          <span className="text-muted-foreground">Left open. Add it here if you like.</span>
        ) : (
          <span className={guessed ? "underline decoration-status-ai/50 decoration-dotted underline-offset-4" : ""}>
            {field.value as string}
          </span>
        )}
        <Pencil className="ml-2 inline size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </button>
      {guessed && !open && <GuessNote onConfirm={() => onUpdate({ status: "confirmed" })} />}
    </div>
  );
}

function GuessNote({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-status-ai">
      <Sparkles className="size-3.5" />
      We guessed this from your text.
      <Button size="xs" variant="outline" className="bg-card" onClick={onConfirm}>
        <Check data-icon="inline-start" />
        That’s right
      </Button>
    </div>
  );
}
