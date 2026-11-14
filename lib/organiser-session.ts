/**
 * Organiser session token: sign and verify. Pure Web Crypto with no imports, because
 * `proxy.ts` runs apart from the app and must not depend on app modules or Node-only APIs.
 *
 * Token = "<expiry ms>.<HMAC-SHA256(password, 'organiser:' + expiry)>". It carries no user data,
 * and changing ORGANISER_PASSWORD invalidates every session.
 */

export const ORGANISER_COOKIE = "mr_organiser";
export const LOGIN_PATH = "/login";

/**
 * open     – no password set outside production: local development works without setup.
 * locked   – no password set in production: organiser pages stay closed (fail closed).
 * password – a session cookie is required.
 */
export type GateMode = "open" | "locked" | "password";

export function gateMode(password: string | undefined, nodeEnv: string | undefined): GateMode {
  if (password && password.trim()) return "password";
  return nodeEnv === "production" ? "locked" : "open";
}

async function sign(password: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares without stopping at the first different character. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Signed token naming a subject (a company id): "<expiry>.<signature>.<subject>". */
export async function createSubjectToken(secret: string, subject: string, hours: number): Promise<string> {
  const expires = Date.now() + hours * 60 * 60 * 1000;
  return `${expires}.${await sign(secret, `subject:${subject}:${expires}`)}.${encodeURIComponent(subject)}`;
}

/** The subject of a valid, unexpired token, or null. */
export async function verifySubjectToken(secret: string, token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [expires, signature, encoded, ...rest] = token.split(".");
  if (!expires || !signature || !encoded || rest.length || !/^\d{1,16}$/.test(expires) || Number(expires) < Date.now()) return null;
  let subject: string;
  try {
    subject = decodeURIComponent(encoded);
  } catch {
    return null;
  }
  return sameString(signature, await sign(secret, `subject:${subject}:${expires}`)) ? subject : null;
}

export async function createSessionToken(password: string, hours: number): Promise<string> {
  const expires = Date.now() + hours * 60 * 60 * 1000;
  return `${expires}.${await sign(password, `organiser:${expires}`)}`;
}

export async function verifySessionToken(password: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expires, signature, ...rest] = token.split(".");
  if (!expires || !signature || rest.length || !/^\d{1,16}$/.test(expires)) return false;
  if (Number(expires) < Date.now()) return false;
  return sameString(signature, await sign(password, `organiser:${expires}`));
}

/** Only paths inside the organiser workspace are valid places to return to after sign-in. */
export function safeNext(next: string | null | undefined): string {
  return next && /^\/organiser(\/[\w\-./]*)?$/.test(next) && !next.includes("//") ? next : "/organiser";
}
