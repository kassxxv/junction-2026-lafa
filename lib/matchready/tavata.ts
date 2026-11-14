import "server-only";
import { createHash } from "node:crypto";

/**
 * Tavata access code for an approved application. Derived from the application id,
 * so the export and the candidate's status page always show the same code.
 * Real codes would come from Tavata/Espoo (docs/CONTEXT.md D6).
 */
export function accessCode(applicationId: string): string {
  const h = createHash("sha256").update(`dttf-2026:${applicationId}`).digest("hex").toUpperCase();
  return `DTTF-${h.slice(0, 4)}-${h.slice(4, 8)}`;
}
