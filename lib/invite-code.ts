/**
 * Invitation codes for companies. Pure functions (no server-only imports) so the seed script can use them.
 * Codes are compared as hashes: the database never holds a usable code.
 */
import { createHash, randomInt } from "node:crypto";

/** Upper-case, without spaces or dashes: "kuura-2026", "KUURA 2026" and "KUURA2026" are the same code. */
export function normalizeInviteCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashInviteCode(code: string): string {
  return createHash("sha256").update(`bridgy-invite:${normalizeInviteCode(code)}`).digest("hex");
}

/** A new random code like "K7QF-2MXP-9RTA" (no 0/O/1/I to avoid misreading). */
export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const group = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}
