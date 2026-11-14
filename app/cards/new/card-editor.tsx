"use client";

/**
 * Company card editor (layout A: source | fields), on stub data.
 * Next step replaces STUB_* with the Gemini draft route; the UI stays.
 */

import { CircleCheck, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CardPreview } from "./card-preview";
import { FieldRow } from "./field-row";
import { InputStep } from "./input-step";
import { SourcePane } from "./source-pane";
import {
  DONE,
  emptyPosition,
  GOALS,
  NEEDS_ATTENTION,
  STUB_INPUT,
  STUB_SECTIONS,
  STUB_SOURCES,
  type DraftField,
  type DraftSection,
  type DraftSource,
  type GoalId,
} from "./stub-draft";

export function CardEditor() {
  // `?step=review` opens the review screen directly (demos, screenshots).
  const direct = useSearchParams().get("step") === "review";
  const [goals, setGoals] = useState<GoalId[] | null>(direct ? STUB_INPUT.goals : null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {goals === null ? (
        <>
          <PageHeader title="New company card" />
          <div className="flex-1 overflow-y-auto">
            <InputStep onDone={setGoals} />
          </div>
        </>
      ) : (
        <ReviewStep initialGoals={goals} />
      )}
    </div>
  );
}

function ReviewStep({ initialGoals }: { initialGoals: GoalId[] }) {
  const [goals, setGoals] = useState<GoalId[]>(initialGoals);
  const [sections, setSections] = useState<DraftSection[]>(STUB_SECTIONS);
  const [sources, setSources] = useState<DraftSource[]>(STUB_SOURCES);
  const [sourceId, setSourceId] = useState(STUB_SOURCES[0].id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<"fields" | "preview">("fields");
  const [saved, setSaved] = useState(false);

  const visible = useMemo(() => sections.filter((s) => !s.goal || goals.includes(s.goal)), [sections, goals]);
  const fields = useMemo(() => visible.flatMap((s) => s.fields), [visible]);
  const required = fields.filter((f) => f.required);
  const done = required.filter((f) => DONE.includes(f.status)).length;
  const attention = fields.filter((f) => NEEDS_ATTENTION.includes(f.status));
  const waiting = fields.filter((f) => f.status === "ask");
  const canPublish = done === required.length && goals.length > 0;

  const select = useCallback((f: DraftField, opts: { scrollField?: boolean } = {}) => {
    setActiveId(f.id);
    setView("fields");
    if (f.sourceId) setSourceId(f.sourceId);
    requestAnimationFrame(() => {
      document.getElementById(`quote-${f.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (opts.scrollField)
        document.getElementById(`field-${f.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, []);

  const update = useCallback((id: string, patch: Partial<DraftField>) => {
    setSaved(false);
    setSections((prev) =>
      prev.map((s) => ({ ...s, fields: s.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
    );
  }, []);

  // Keyboard: J / K move through what needs attention, Enter accepts, E edits.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable=true]") || e.ctrlKey || e.metaKey || e.altKey) return;
      const idx = attention.findIndex((f) => f.id === activeId);
      if (e.key === "j" || e.key === "k") {
        if (!attention.length) return;
        const next = e.key === "j" ? (idx + 1) % attention.length : (idx - 1 + attention.length) % attention.length;
        select(attention[idx < 0 ? 0 : next], { scrollField: true });
      }
      const active = fields.find((f) => f.id === activeId);
      if (!active) return;
      if (e.key === "Enter" && active.status === "ai") update(active.id, { status: "confirmed" });
      if (e.key === "e" && active.kind === "text") {
        e.preventDefault();
        setEditingId(active.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attention, activeId, fields, select, update]);

  function toggleGoal(id: GoalId) {
    setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  }

  return (
    <>
      <PageHeader title={STUB_INPUT.companyName}>
        <div className="flex flex-wrap items-center gap-3">
          <Progress done={done} total={required.length} />
          <Button variant="outline" className="bg-card" onClick={() => setSaved(true)}>
            {saved ? "Draft saved" : "Save draft"}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* span keeps the tooltip working while the button is disabled */}
              <span tabIndex={canPublish ? -1 : 0}>
                <Button disabled={!canPublish}>Publish card</Button>
              </span>
            </TooltipTrigger>
            {!canPublish && (
              <TooltipContent>
                {waiting.some((f) => f.required)
                  ? "Some required fields are waiting for the company."
                  : "Fill in or accept every required field first."}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </PageHeader>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <SourcePane
          sources={sources}
          sourceId={sourceId}
          onSourceChange={setSourceId}
          onAddSource={(text) => {
            const n = sources.filter((s) => s.kind === "added").length + 1;
            const id = `added-${Date.now()}`;
            setSources((s) => [...s, { id, kind: "added", label: `Added text ${n}`, text }]);
            setSourceId(id);
          }}
          onRemoveSource={(id) => {
            setSources((s) => s.filter((x) => x.id !== id));
            if (sourceId === id) setSourceId(sources[0].id);
          }}
          fields={fields}
          activeId={activeId}
          onPick={(f) => select(f, { scrollField: true })}
        />

        <section aria-label="Card fields" className="flex min-h-0 flex-col">
          <div className="flex items-center gap-1 border-b border-border bg-card px-3 py-2">
            {(["fields", "preview"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  view === v ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "fields" ? "Fields" : "Card preview"}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {view === "preview" ? (
              <div className="p-6">
                <CardPreview sections={visible} goals={goals} />
              </div>
            ) : (
              <>
                <AttentionBar
                  attention={attention}
                  waiting={waiting.length}
                  activeId={activeId}
                  onPick={(f) => select(f, { scrollField: true })}
                />

                <div className="space-y-8 px-4 py-6 sm:px-6">
                  <div>
                    <h2 className="mb-1 text-base font-semibold">Why they come to the event</h2>
                    <p className="mb-3 text-sm text-muted-foreground">This decides which parts of the card are shown.</p>
                    <div className="flex flex-wrap gap-2">
                      {GOALS.map((g) => {
                        const on = goals.includes(g.id);
                        return (
                          <button
                            key={g.id}
                            aria-pressed={on}
                            onClick={() => toggleGoal(g.id)}
                            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {g.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {visible.map((s) => (
                    <div key={s.id}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h2 className="text-base font-semibold">
                          {s.goal === "fill" && <span className="font-normal text-muted-foreground">Position: </span>}
                          {s.title}
                        </h2>
                        {s.goal === "fill" && sections.filter((x) => x.goal === "fill").length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSections((prev) => prev.filter((x) => x.id !== s.id))}
                          >
                            <Trash2 data-icon="inline-start" />
                            Remove position
                          </Button>
                        )}
                      </div>
                      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {s.fields.map((f) => (
                          <FieldRow
                            key={f.id}
                            field={f}
                            active={f.id === activeId}
                            editing={f.id === editingId}
                            onSelect={() => select(f)}
                            onEditingChange={(on) => setEditingId(on ? f.id : null)}
                            onUpdate={(patch) => update(f.id, patch)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  {goals.includes("fill") && (
                    <Button
                      variant="outline"
                      className="w-full border-dashed bg-transparent"
                      onClick={() => {
                        const p = emptyPosition();
                        setSections((prev) => {
                          const lastFill = prev.map((s) => s.goal).lastIndexOf("fill");
                          return [...prev.slice(0, lastFill + 1), p, ...prev.slice(lastFill + 1)];
                        });
                      }}
                    >
                      <Plus data-icon="inline-start" />
                      Add another position
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function AttentionBar({
  attention,
  waiting,
  activeId,
  onPick,
}: {
  attention: DraftField[];
  waiting: number;
  activeId: string | null;
  onPick: (f: DraftField) => void;
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
      {attention.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium">
            {attention.length} {attention.length === 1 ? "field needs" : "fields need"} you
          </span>
          {attention.map((f) => (
            <button
              key={f.id}
              onClick={() => onPick(f)}
              className={`rounded-full border px-2.5 py-0.5 text-sm transition-colors ${
                f.id === activeId
                  ? "border-primary bg-accent text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto hidden items-center gap-1 text-xs text-muted-foreground xl:flex">
            <Kbd>J</Kbd> next <Kbd>Enter</Kbd> accept <Kbd>E</Kbd> edit
          </span>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm">
          <CircleCheck className="size-4 text-status-confirmed" />
          Nothing needs you right now.
          {waiting > 0 && (
            <span className="text-muted-foreground">
              {waiting} {waiting === 1 ? "field is" : "fields are"} waiting for the company.
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-label={`${done} of ${total} required fields done`}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-status-confirmed transition-all" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <span className="tabular-nums">
        {done} of {total} required
      </span>
    </div>
  );
}

function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-card px-6 py-4">
      <div>
        <Link href="/cards" className="text-sm text-muted-foreground hover:text-foreground">
          Company cards
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      {children}
    </header>
  );
}
