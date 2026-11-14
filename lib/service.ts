import "server-only";
import { env } from "./env";

export type ServiceName = "database" | "gemma" | "gemini" | "contextdev" | "esco";

/**
 * Fixed vocabulary for failures. Health responses and logs only ever contain
 * these codes, never raw upstream messages (which can include hosts or URLs).
 */
export type ErrorCode =
  | "not_configured"
  | "timeout"
  | "unreachable"
  | "auth_failed"
  | "tls_failed"
  | "model_missing"
  | "bad_response"
  | "unknown";

/**
 * ok             – reachable and fully usable
 * unchecked      – configured, but deliberately not probed (costs credits)
 * degraded       – reachable, but something is missing (e.g. no model set)
 * down           – configured, but the check failed
 * not_configured – required env vars are missing
 */
export type HealthStatus = "ok" | "unchecked" | "degraded" | "down" | "not_configured";

export interface ServiceHealth {
  status: HealthStatus;
  /** "stub" means the wrapper currently answers with canned data. */
  mode: "live" | "stub";
  latencyMs?: number;
  error?: ErrorCode;
  /** Only fixed, non-secret facts (booleans, versions). */
  details?: Record<string, string | boolean>;
}

/** Result of a wrapper call: the UI must show stub data as sample output and never store it as real. */
export type Sourced<T> =
  | { source: "live"; data: T }
  | { source: "stub"; data: T; reason: ErrorCode };

export class ServiceUnavailableError extends Error {
  constructor(
    readonly service: ServiceName,
    readonly code: ErrorCode,
  ) {
    super(`${service} unavailable: ${code}`);
    this.name = "ServiceUnavailableError";
  }
}

export const HEALTH_TIMEOUT_MS = 3_000;

export function stubsForced(): boolean {
  return env().USE_STUBS;
}

class TimeoutError extends Error {
  constructor() {
    super("timeout");
    this.name = "TimeoutError";
  }
}

/** Runs `fn` with an abort signal and a hard deadline (for clients that ignore signals, like pg). */
export async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError());
    }, ms);
  });
  try {
    return await Promise.race([fn(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

const NETWORK_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH"]);
const TLS_CODES = new Set([
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

/** Maps any thrown value to a safe ErrorCode. Never inspects or returns the message text. */
export function classifyError(err: unknown): ErrorCode {
  if (err instanceof ServiceUnavailableError) return err.code;
  if (!(err instanceof Error)) return "unknown";

  const name = err.name;
  const e = err as Error & { code?: unknown; status?: unknown; cause?: unknown };
  const code = typeof e.code === "string" ? e.code : undefined;
  const status = typeof e.status === "number" ? e.status : undefined;

  if (name === "TimeoutError" || name === "AbortError" || name.endsWith("TimeoutError") || code === "ETIMEDOUT") {
    return "timeout";
  }
  if (code && TLS_CODES.has(code)) return "tls_failed";
  if (code && NETWORK_CODES.has(code)) return "unreachable";
  // Postgres auth: invalid_password / invalid_authorization_specification
  if (code === "28P01" || code === "28000") return "auth_failed";
  if (status === 401 || status === 403) return "auth_failed";
  if (status === 404) return "model_missing";
  if (status !== undefined) return status >= 500 ? "unreachable" : "bad_response";
  if (name.endsWith("ConnectionError")) return "unreachable";
  if (name === "ZodError" || name === "SyntaxError") return "bad_response";
  // fetch() wraps network failures in TypeError with the real error as `cause`.
  if (e.cause !== undefined && e.cause !== err) {
    const inner = classifyError(e.cause);
    if (inner !== "unknown") return inner;
  }
  return "unknown";
}

/** Logs a failure by code only — safe for a public repo with uploaded transcripts. */
export function logFailure(service: ServiceName, op: string, code: ErrorCode): void {
  console.warn(`[${service}] ${op} failed: ${code}`);
}

/**
 * Runs a health probe with a deadline and turns any failure into a ServiceHealth.
 * The probe returns the status/details for the success case.
 */
export async function runProbe(
  service: ServiceName,
  mode: ServiceHealth["mode"],
  probe: (signal: AbortSignal) => Promise<Omit<ServiceHealth, "mode" | "latencyMs">>,
): Promise<ServiceHealth> {
  const started = performance.now();
  try {
    const result = await withTimeout(HEALTH_TIMEOUT_MS, probe);
    return { ...result, mode, latencyMs: Math.round(performance.now() - started) };
  } catch (err) {
    const error = classifyError(err);
    logFailure(service, "health", error);
    return { status: "down", mode, error, latencyMs: Math.round(performance.now() - started) };
  }
}
