/**
 * Cuts personal details out of a CV before organisers see it. Pure functions, no AI, no I/O.
 * Pattern-based, so an unusual format can slip through: screens say so, and the original is never shown.
 * Every cut leaves a visible marker, so the organiser knows something was there.
 */

export interface Redaction {
  text: string;
  /** How many items of each kind were hidden, e.g. { "e-mail": 1, phone: 1 }. */
  hidden: Record<string, number>;
}

const PERSONAL_LINE = /^\s*(date of birth|born|birth ?date|age|nationality|citizenship|marital status|gender|syntymäaika|kansalaisuus)\b/i;
const ADDRESS_LINE = /\b\d{5}\b\s+[A-ZÄÖÅ][a-zäöå]+|\b[a-zäöå-]+(katu|tie|väylä|kuja|polku|street|road|avenue|lane)\s+\d+/i;

export function redactPersonalDetails(text: string, known: { name?: string | null; email?: string | null } = {}): Redaction {
  const hidden: Record<string, number> = {};
  const count = (kind: string) => (hidden[kind] = (hidden[kind] ?? 0) + 1);
  const replace = (s: string, re: RegExp, kind: string) => s.replace(re, () => (count(kind), `[${kind} hidden]`));

  let out = text;
  if (known.email && out.includes(known.email)) {
    const parts = out.split(known.email);
    hidden["e-mail"] = parts.length - 1;
    out = parts.join("[e-mail hidden]");
  }
  out = replace(out, /[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "e-mail");
  out = replace(out, /\b(https?:\/\/|www\.)\S+|\b(linkedin\.com|github\.com|gitlab\.com|twitter\.com|x\.com|facebook\.com|instagram\.com)\/\S*/gi, "link");
  out = replace(out, /(?<![\w-])\+?\d[\d\s().-]{6,}\d(?![\w-])/g, "phone");

  const lines = out.split(/\r?\n/);
  const nameWords = (known.name ?? "").split(/\s+/).filter((w) => w.length > 1);
  const firstText = lines.findIndex((l) => l.trim());
  const result = lines.map((line, i) => {
    if (PERSONAL_LINE.test(line)) return (count("personal detail"), "[personal detail hidden]");
    if (ADDRESS_LINE.test(line)) return (count("address"), "[address hidden]");
    // The first line of a CV is usually the name: 2-4 capitalised words, no digits.
    if (i === firstText && /^\s*([A-ZÄÖÅ][\p{L}'-]+\s+){1,3}[A-ZÄÖÅ][\p{L}'-]+\s*$/u.test(line)) return (count("name"), "[name hidden]");
    let l = line;
    for (const w of nameWords) l = l.replace(new RegExp(`\\b${escapeRegExp(w)}\\b`, "g"), () => (count("name"), "[name hidden]"));
    return l;
  });
  return { text: result.join("\n"), hidden };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
