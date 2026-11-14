import "server-only";
import ContextDev from "context.dev";
import { env } from "./env";
import { classifyError, logFailure, runProbe, stubsForced, type ServiceHealth, type Sourced } from "./service";

/**
 * Context.dev — company websites only. Never use People Search or send candidate data.
 * Fallback: return null so the company types its profile by hand.
 */

const CALL_TIMEOUT_MS = 45_000;

let client: ContextDev | undefined;

function getClient(apiKey: string): ContextDev {
  client ??= new ContextDev({ apiKey, timeout: CALL_TIMEOUT_MS, maxRetries: 1 });
  return client;
}

export interface CompanyPage {
  url: string;
  markdown: string;
}

function isPublicHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** Scrapes a company website to markdown. Stub data is `null` (manual profile entry). */
export async function scrapeCompanyPage(rawUrl: string): Promise<Sourced<CompanyPage | null>> {
  const { CONTEXT_DEV_API_KEY } = env();
  if (stubsForced() || !CONTEXT_DEV_API_KEY) return { source: "stub", data: null, reason: "not_configured" };

  const url = isPublicHttpUrl(rawUrl);
  if (!url) return { source: "stub", data: null, reason: "bad_response" };

  try {
    const res = await getClient(CONTEXT_DEV_API_KEY).web.scrape({ url: url.toString(), formats: { markdown: true } });
    if (!res.markdown.success || !res.markdown.data) {
      logFailure("contextdev", "scrape", "bad_response");
      return { source: "stub", data: null, reason: "bad_response" };
    }
    return { source: "live", data: { url: url.toString(), markdown: res.markdown.data } };
  } catch (err) {
    const reason = classifyError(err);
    logFailure("contextdev", "scrape", reason);
    return { source: "stub", data: null, reason };
  }
}

/**
 * By default only reports whether the key is set (no request, no cost).
 * With HEALTH_PROBE_CONTEXTDEV=1 it reads one account log entry to verify the key.
 */
export async function health(): Promise<ServiceHealth> {
  const { CONTEXT_DEV_API_KEY, HEALTH_PROBE_CONTEXTDEV } = env();
  if (!CONTEXT_DEV_API_KEY) return { status: "not_configured", mode: "stub", error: "not_configured" };
  const mode = stubsForced() ? "stub" : "live";
  if (!HEALTH_PROBE_CONTEXTDEV) return { status: "unchecked", mode };

  return runProbe("contextdev", mode, async (signal) => {
    await getClient(CONTEXT_DEV_API_KEY).logs.list({ limit: 1 }, { signal });
    return { status: "ok" };
  });
}
