"use client";

import { Check, MessageCircleQuestion, Pencil, Sparkles, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "./status-badge";
import type { DraftField } from "./stub-draft";

export function hasValue(v: DraftField["value"]): boolean {
  return Array.isArray(v) ? v.length > 0 : v.trim() !== "";
}

interface Props {
  field: DraftField;
  active: boolean;
  editing: boolean;
  onSelect: () => void;
  onEditingChange: (editing: boolean) => void;
  onUpdate: (patch: Partial<DraftField>) => void;
}

export function FieldRow({ field, active, editing, onSelect, onEditingChange, onUpdate }: Props) {
  const isStaff = field.status === "staff";
  const needsDecision = field.status === "ai" || field.status === "missing";
  const canReject = field.status === "ai" && hasValue(field.value);

  /** Any edit by a person makes the value confirmed (staff input stays “entered by you”). */
  function setValue(value: DraftField["value"]) {
    onUpdate({ value, status: isStaff ? "staff" : hasValue(value) ? "confirmed" : "missing" });
  }

  return (
    <div
      id={`field-${field.id}`}
      onClick={onSelect}
      className={`group relative scroll-mt-24 px-5 py-4 transition-colors ${
        active ? "bg-accent/60" : "hover:bg-muted/40"
      }`}
    >
      {active && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}

      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-foreground">
          {field.label}
          {field.required && (
            <span className="ml-1 text-muted-foreground" aria-label="required">
              *
            </span>
          )}
        </div>
        <StatusBadge status={field.status} />
      </div>

      <div className="mt-2">
        {field.kind === "list" ? (
          <TagEditor
            values={Array.isArray(field.value) ? field.value : []}
            onChange={setValue}
            onFocus={onSelect}
          />
        ) : editing ? (
          <TextEditor
            initial={typeof field.value === "string" ? field.value : ""}
            onSave={(v) => {
              setValue(v);
              onEditingChange(false);
            }}
            onCancel={() => onEditingChange(false)}
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
              onEditingChange(true);
            }}
            className="group/value -mx-2 block w-[calc(100%+1rem)] rounded-md px-2 py-1 text-left text-[0.95rem] leading-relaxed hover:bg-card focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {hasValue(field.value) ? (
              <span>{field.value as string}</span>
            ) : (
              <span className="text-muted-foreground">Not filled in yet. Click to write.</span>
            )}
            <Pencil className="ml-2 inline size-3.5 text-muted-foreground opacity-0 group-hover/value:opacity-100" />
          </button>
        )}
      </div>

      {field.question && field.status !== "confirmed" && field.status !== "staff" && field.status !== "source" && (
        <div className="mt-3 rounded-md border border-border bg-card px-3 py-2.5">
          <p className="flex gap-2 text-sm text-muted-foreground">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-status-ai" />
            {field.question}
          </p>
          {field.options && (
            <div className="mt-2 flex flex-wrap gap-2 pl-6" onClick={(e) => e.stopPropagation()}>
              {field.options.map((o) => (
                <Button
                  key={o}
                  size="sm"
                  variant="outline"
                  className={`bg-card ${o === field.suggested ? "border-status-ai/50" : ""}`}
                  onClick={() => onUpdate({ value: o, status: "confirmed" })}
                >
                  {o}
                  {o === field.suggested && <span className="text-xs text-status-ai">suggested</span>}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decisions: only where a decision is needed, and only on the selected row or on hover. */}
      {!editing && (needsDecision || field.status === "ask") && (
        <div
          className={`mt-3 flex-wrap gap-2 ${active ? "flex" : "hidden group-hover:flex group-focus-within:flex"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {field.status === "ai" && hasValue(field.value) && (
            <Button size="sm" onClick={() => onUpdate({ status: "confirmed" })}>
              <Check data-icon="inline-start" />
              Accept
            </Button>
          )}
          {canReject && (
            <Button
              size="sm"
              variant="outline"
              className="bg-card"
              onClick={() => onUpdate({ value: field.kind === "list" ? [] : "", status: "missing" })}
            >
              <X data-icon="inline-start" />
              Reject
            </Button>
          )}
          {field.status !== "ask" ? (
            <Button size="sm" variant="ghost" onClick={() => onUpdate({ status: "ask" })}>
              <MessageCircleQuestion data-icon="inline-start" />
              Ask the company
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ status: hasValue(field.value) ? "ai" : "missing" })}
            >
              Back to my list
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function TextEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSave(text.trim());
    if (e.key === "Escape") onCancel();
  }
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        className="min-h-20 bg-card text-[0.95rem]"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => onSave(text.trim())}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">Ctrl+Enter to save, Esc to cancel</span>
      </div>
    </div>
  );
}

/** Skills and areas: Enter adds a tag, × removes it. */
export function TagEditor({
  values,
  onChange,
  onFocus,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  onFocus: () => void;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-md border border-border bg-card py-0.5 pr-1 pl-2 text-sm">
          {v}
          <button
            type="button"
            aria-label={`Remove ${v}`}
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onFocus={onFocus}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
          if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={add}
        placeholder={values.length ? "Add…" : "Type and press Enter"}
        className="min-w-28 flex-1 rounded-md bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground focus:bg-card"
      />
    </div>
  );
}
