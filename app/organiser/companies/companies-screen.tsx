"use client";

import { Check, Copy, KeyRound, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { CompanyAdminRow } from "@/lib/matchready/companies-admin";
import { addCompany, issueNewCode, type InviteResult } from "@/lib/matchready/companies-actions";

export function CompaniesScreen({ companies, fields, emailOn }: { companies: CompanyAdminRow[]; fields: string[]; emailOn: boolean }) {
  const [result, setResult] = useState<InviteResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-5 py-2.5 font-medium">Company</th>
                <th className="px-5 py-2.5 font-medium">Field</th>
                <th className="px-5 py-2.5 font-medium">Card</th>
                <th className="px-5 py-2.5 font-medium">Places</th>
                <th className="px-5 py-2.5 font-medium">Applications</th>
                <th className="px-5 py-2.5 font-medium">Invitation</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.contactEmail ?? c.website ?? ""}</div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{c.field ?? "Not set"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${c.cardStatus === "confirmed" ? "bg-status-confirmed-bg text-status-confirmed" : "bg-status-ai-bg text-status-ai"}`}
                    >
                      {c.cardStatus === "confirmed" ? "Confirmed" : "Draft"}
                    </span>
                  </td>
                  <td className="px-5 py-3 tabular-nums">{c.places}</td>
                  <td className="px-5 py-3 tabular-nums">{c.applications}</td>
                  <td className="px-5 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-card whitespace-nowrap"
                      disabled={pending}
                      onClick={() => startTransition(async () => setResult(await issueNewCode(c.id)))}
                    >
                      <KeyRound data-icon="inline-start" />
                      {c.hasCode ? "New code" : "Create code"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          Codes are shown once. Only a fingerprint is stored, so a lost code is replaced with a new one and the old one stops working.
        </p>
      </section>

      <aside className="space-y-4">
        {result && <InviteResultBox result={result} emailOn={emailOn} onClose={() => setResult(null)} />}
        <AddCompanyForm fields={fields} pending={pending} onSubmit={(input) => startTransition(async () => setResult(await addCompany(input)))} />
      </aside>
    </div>
  );
}

function AddCompanyForm({
  fields,
  pending,
  onSubmit,
}: {
  fields: string[];
  pending: boolean;
  onSubmit: (input: { name: string; website: string; field: string; places: number; contactEmail: string }) => void;
}) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [field, setField] = useState(fields[0] ?? "");
  const [places, setPlaces] = useState(6);
  const [contactEmail, setContactEmail] = useState("");

  return (
    <form
      className="rounded-xl border border-border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, website, field, places, contactEmail });
      }}
    >
      <h2 className="font-semibold">Add a company</h2>
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium">
          <span className="mb-1.5 block">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Kuura Photonics Oy" className="bg-card font-normal" />
        </label>
        <label className="block text-sm font-medium">
          <span className="mb-1.5 block">Website (optional)</span>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="kuura-photonics.fi" className="bg-card font-normal" />
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
          <label className="block text-sm font-medium">
            <span className="mb-1.5 block">Field</span>
            <NativeSelect value={field} onChange={(e) => setField(e.target.value)}>
              {fields.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </NativeSelect>
          </label>
          <label className="block text-sm font-medium">
            <span className="mb-1.5 block">Places</span>
            <Input type="number" min={1} max={50} value={places} onChange={(e) => setPlaces(Number(e.target.value))} className="bg-card font-normal" />
          </label>
        </div>
        <label className="block text-sm font-medium">
          <span className="mb-1.5 block">Contact e-mail</span>
          <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required placeholder="hiring@company.fi" className="bg-card font-normal" />
        </label>
      </div>
      <Button type="submit" className="mt-4 w-full" disabled={pending}>
        <Plus data-icon="inline-start" />
        {pending ? "Adding…" : "Add company and create code"}
      </Button>
    </form>
  );
}

function InviteResultBox({ result, emailOn, onClose }: { result: InviteResult; emailOn: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!result.ok) return <p className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">{result.error}</p>;

  return (
    <div className="rounded-xl border border-status-confirmed/30 bg-card p-5">
      <p className="text-sm font-medium text-status-confirmed">Invitation code for {result.companyName}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="rounded-lg bg-muted px-3 py-1.5 font-mono text-lg tracking-wider">{result.code}</code>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void navigator.clipboard?.writeText(result.code);
            setCopied(true);
          }}
        >
          {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Shown only now. If it gets lost, create a new one.</p>
      <p className="mt-3 text-sm">
        {result.delivered
          ? "The invitation e-mail was sent."
          : emailOn
            ? "The e-mail could not be sent. Send the code yourself."
            : "E-mail is not set up on this deployment. Send this invitation yourself:"}
      </p>
      {result.preview && !result.delivered && (
        <details className="mt-2 rounded-lg border border-border px-3 py-2 text-sm" open>
          <summary className="cursor-pointer">{result.preview.subject}</summary>
          <pre className="mt-2 font-sans text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{result.preview.text}</pre>
        </details>
      )}
      <Button size="sm" variant="ghost" className="mt-3" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}
