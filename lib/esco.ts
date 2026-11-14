import "server-only";
import { z } from "zod";
import { classifyError, logFailure, runProbe, stubsForced, type ServiceHealth, type Sourced } from "./service";

/**
 * ESCO web-service API (public, no key). ESCO is a vocabulary, not truth:
 * when there is no good match, callers keep the original skill name.
 * Fallback: an empty result list.
 */

const BASE_URL = "https://ec.europa.eu/esco/api";
const CALL_TIMEOUT_MS = 10_000;

export interface EscoSkill {
  uri: string;
  title: string;
}

const SearchResponse = z.object({
  _embedded: z.object({
    results: z.array(z.object({ uri: z.string(), title: z.string() })),
  }),
});

async function search(text: string, language: string, limit: number, signal: AbortSignal): Promise<EscoSkill[]> {
  const params = new URLSearchParams({ text, type: "skill", language, limit: String(limit), full: "false" });
  const res = await fetch(`${BASE_URL}/search?${params}`, { signal, headers: { accept: "application/json" } });
  if (!res.ok) throw Object.assign(new Error("esco http error"), { status: res.status });
  const body = SearchResponse.parse(await res.json());
  return body._embedded.results.map(({ uri, title }) => ({ uri, title }));
}

/** Searches ESCO skills. Returns `[]` as stub data, meaning "keep the original skill". */
export async function searchSkills(
  text: string,
  { language = "en", limit = 5 }: { language?: string; limit?: number } = {},
): Promise<Sourced<EscoSkill[]>> {
  if (stubsForced()) return { source: "stub", data: [], reason: "not_configured" };
  try {
    return { source: "live", data: await search(text, language, limit, AbortSignal.timeout(CALL_TIMEOUT_MS)) };
  } catch (err) {
    const reason = classifyError(err);
    logFailure("esco", "search", reason);
    return { source: "stub", data: [], reason };
  }
}

export async function health(): Promise<ServiceHealth> {
  return runProbe("esco", stubsForced() ? "stub" : "live", async (signal) => {
    await search("python", "en", 1, signal);
    return { status: "ok" };
  });
}
