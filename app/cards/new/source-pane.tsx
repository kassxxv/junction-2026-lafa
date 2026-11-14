"use client";

import { ClipboardPaste, ExternalLink, Info, Link2, PenLine, Plus, X } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DraftField, DraftSource } from "./stub-draft";

const SOURCE_ICON = { link: Link2, typed: PenLine, added: ClipboardPaste } as const;
const SOURCE_HINT = {
  link: "Read from the link you entered",
  typed: "The text you entered when creating the card",
  added: "Text you added later",
} as const;

interface Props {
  sources: DraftSource[];
  sourceId: string;
  onSourceChange: (id: string) => void;
  onAddSource: (text: string) => void;
  onRemoveSource: (id: string) => void;
  fields: DraftField[];
  activeId: string | null;
  onPick: (f: DraftField) => void;
}

/** Left pane: what the company actually sent, set as a document, with evidence marked. */
export function SourcePane({
  sources,
  sourceId,
  onSourceChange,
  onAddSource,
  onRemoveSource,
  fields,
  activeId,
  onPick,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const source = sources.find((s) => s.id === sourceId) ?? sources[0];
  const quoted = fields.filter((f) => f.sourceId === source.id && f.quote);

  return (
    <section aria-label="Source" className="flex min-h-0 flex-col border-b border-border bg-card lg:border-r lg:border-b-0">
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        <div role="tablist" className="flex min-w-0 gap-1 overflow-x-auto">
          {sources.map((s) => {
            const Icon = SOURCE_ICON[s.kind];
            const selected = s.id === source.id;
            return (
              <div
                key={s.id}
                className={`flex items-center rounded-md text-sm whitespace-nowrap ${
                  selected ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      role="tab"
                      aria-selected={selected}
                      onClick={() => onSourceChange(s.id)}
                      className={`flex items-center gap-1.5 py-1.5 pl-2.5 ${s.kind === "added" ? "pr-1" : "pr-3"}`}
                    >
                      <Icon className="size-3.5" />
                      {s.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{SOURCE_HINT[s.kind]}</TooltipContent>
                </Tooltip>
                {s.kind === "added" && (
                  <button
                    aria-label={`Remove ${s.label}`}
                    onClick={() => onRemoveSource(s.id)}
                    className="mr-1 rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setAdding((v) => !v)}>
              <Plus data-icon="inline-start" />
              Add text
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-60">
            Got another email or message from the company? Add it and the card is checked against it too.
          </TooltipContent>
        </Tooltip>
      </div>

      {adding && (
        <div className="space-y-2 border-b border-border bg-muted/40 p-3">
          <Textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste an email, a message or more notes from the company."
            className="min-h-24 bg-card"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!text.trim()}
              onClick={() => {
                onAddSource(text.trim());
                setText("");
                setAdding(false);
              }}
            >
              Add as source
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto max-w-[62ch] px-6 py-6">
          {source.kind === "added" && (
            <p className="mb-5 flex gap-2 rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              With AI connected, new information from this text is added to the card as suggestions for you to check.
              In this prototype nothing changes yet.
            </p>
          )}
          {source.url && (
            <a
              href={`https://${source.url}`}
              target="_blank"
              rel="noreferrer"
              className="mb-4 inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <span className="truncate">{source.url}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          )}
          <div className="font-serif text-[1.02rem] leading-[1.7] whitespace-pre-wrap text-foreground">
            {renderWithEvidence(source.text, quoted, activeId, onPick)}
          </div>
        </article>
      </div>

      <p className="border-t border-border px-6 py-2.5 text-xs text-muted-foreground">
        Highlighted sentences are evidence for a field. Click one to jump to it.
      </p>
    </section>
  );
}

function renderWithEvidence(
  text: string,
  fields: DraftField[],
  activeId: string | null,
  onPick: (f: DraftField) => void,
): ReactNode[] {
  const ranges = fields
    .map((f) => ({ f, start: text.indexOf(f.quote ?? "") }))
    .filter((r) => r.start >= 0)
    .map((r) => ({ ...r, end: r.start + (r.f.quote ?? "").length }))
    .sort((a, b) => a.start - b.start)
    .filter((r, i, arr) => i === 0 || r.start >= arr[i - 1].end);

  const out: ReactNode[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start > pos) out.push(<Fragment key={`t${pos}`}>{text.slice(pos, r.start)}</Fragment>);
    const active = r.f.id === activeId;
    out.push(
      <mark
        key={r.f.id}
        id={`quote-${r.f.id}`}
        role="button"
        tabIndex={0}
        aria-label={`Evidence for ${r.f.label}`}
        onClick={() => onPick(r.f)}
        onKeyDown={(e) => e.key === "Enter" && onPick(r.f)}
        className={`cursor-pointer rounded-[3px] px-0.5 text-foreground transition-colors [box-decoration-break:clone] ${
          active ? "bg-evidence-strong shadow-[inset_0_-2px_0_var(--evidence-edge)]" : "bg-evidence hover:bg-evidence-strong"
        }`}
      >
        {text.slice(r.start, r.end)}
      </mark>,
    );
    pos = r.end;
  }
  if (pos < text.length) out.push(<Fragment key={`t${pos}`}>{text.slice(pos)}</Fragment>);
  return out;
}
