import "server-only";
import { createHash } from "node:crypto";
import { EVENT, eventInitials } from "./event";

/**
 * Tavata access code for an approved application. Derived from the event and the application id,
 * so the export and the candidate's status page always show the same code, and codes of two
 * events never collide. Real codes would come from Tavata/Espoo (docs/CONTEXT.md D6).
 */
export function accessCode(applicationId: string, event: { id: string; name: string } = EVENT): string {
  const h = createHash("sha256").update(`${event.id}:${applicationId}`).digest("hex").toUpperCase();
  return `${eventInitials(event.name)}-${h.slice(0, 4)}-${h.slice(4, 8)}`;
}
