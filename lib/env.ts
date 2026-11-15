import "server-only";
import { z } from "zod";

/**
 * Server-only environment. Every variable is optional so the app boots with an
 * empty `.env`; a missing or invalid value simply puts that service in stub mode.
 * Never return these values to the client or include them in logs/responses.
 */

/** Empty strings count as "not set"; invalid values are dropped instead of crashing. */
const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().optional(),
);
const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.url().optional().catch(undefined),
);
const flag = z
  .string()
  .optional()
  .transform((v) => v === "1" || v?.toLowerCase() === "true");
/** Like `flag`, but "not set" stays undefined so the caller can pick a default. */
const optionalFlag = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === "" ? undefined : v === "1" || v.toLowerCase() === "true"));

const EnvSchema = z.object({
  DATABASE_URL: optionalUrl,
  /** Path to the Aiven CA certificate (PEM), e.g. ./certs/ca.pem */
  DATABASE_CA_CERT: optionalString,

  GEMMA_BASE_URL: optionalUrl,
  GEMMA_MODEL: optionalString,
  GEMMA_API_KEY: optionalString,
  GEMMA_EMBED_MODEL: optionalString,

  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: optionalString,

  CONTEXT_DEV_API_KEY: optionalString,

  /** Signs company and organiser session cookies. Not set: falls back to other server secrets. */
  SESSION_SECRET: optionalString,
  /** Resend (https://resend.com) for reminder e-mails. Not set: e-mails are shown as previews in the app. */
  RESEND_API_KEY: optionalString,
  /** Sender, e.g. "bridgy <onboarding@resend.dev>". */
  EMAIL_FROM: optionalString,
  /** Demo: every e-mail goes to this one inbox instead of the (synthetic) addresses. */
  DEMO_EMAIL_TO: optionalString,
  /** Shared password for /organiser and /api/organiser. Not set: open in development, locked in production. */
  ORGANISER_PASSWORD: optionalString,
  /** Demo helpers that change shared data (reset review, reset company card). Not set: on outside production. */
  DEMO_MODE: optionalFlag,

  /** Force every service wrapper into stub mode (demo without network). */
  USE_STUBS: flag,
  /** Let /api/health make a real (account-read) call to Context.dev. Off by default. */
  HEALTH_PROBE_CONTEXTDEV: flag,
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function env(): Env {
  cached ??= EnvSchema.parse(process.env);
  return cached;
}
