import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { query } from "./db";
import { env } from "./env";
import { RATE_LIMITS, type RateBucket } from "./matchready/config";

/**
 * Limits on calls that cost money or CPU (Gemini, Context.dev, Gemma, PDF parsing) and on
 * password attempts. Two counters per bucket (rules in lib/matchready/config.ts):
 *   - per client inside a short window, so one visitor cannot hammer a service;
 *   - per day for everyone, a hard cap on what a public demo can spend.
 *
 * Counters live in Postgres (table rate_limit_hits) because serverless instances share no memory.
 * If the database or the table is unavailable, the same rules run in this process's memory:
 * weaker, but never open.
 *
 * The client key is a keyed hash of the IP address. The address itself is never stored or logged.
 */

const DAY_SECONDS = 24 * 60 * 60;
const EVERYONE = "*";

async function clientKey(): Promise<string> {
  const h = await headers();
  // On Vercel the platform sets x-forwarded-for; the first entry is the client.
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const secret = env().DATABASE_URL ?? env().ORGANISER_PASSWORD ?? "local-development";
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 24);
}

async function hitDb(bucket: string, client: string, windowSeconds: number): Promise<number> {
  const [row] = await query<{ hits: number }>(
    `INSERT INTO rate_limit_hits (bucket, client, window_start, hits)
     VALUES ($1, $2, to_timestamp(floor(extract(epoch FROM now()) / $3::int) * $3::int), 1)
     ON CONFLICT (bucket, client, window_start) DO UPDATE SET hits = rate_limit_hits.hits + 1
     RETURNING hits`,
    [bucket, client, windowSeconds],
  );
  return row.hits;
}

const memory = new Map<string, { windowStart: number; hits: number }>();

function hitMemory(bucket: string, client: string, windowSeconds: number): number {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const key = `${bucket}:${client}:${windowSeconds}`;
  const entry = memory.get(key);
  const next = entry && entry.windowStart === windowStart ? { windowStart, hits: entry.hits + 1 } : { windowStart, hits: 1 };
  memory.set(key, next);
  if (memory.size > 5000) for (const [k, v] of memory) if (v.windowStart < windowStart - DAY_SECONDS) memory.delete(k);
  return next.hits;
}

/** Counts one call. Returns false when the caller is over the limit and must not proceed. */
export async function allow(bucket: RateBucket): Promise<boolean> {
  const rule = RATE_LIMITS[bucket];
  const client = await clientKey();
  try {
    const mine = await hitDb(bucket, client, rule.windowSeconds);
    if (mine > rule.perClient) return false; // rejected calls do not use up the shared daily budget
    const all = await hitDb(bucket, EVERYONE, DAY_SECONDS);
    // Old windows are useless: clear them now and then.
    if (all % 50 === 0) void query(`DELETE FROM rate_limit_hits WHERE window_start < now() - interval '2 days'`).catch(() => {});
    return all <= rule.perDay;
  } catch {
    const mine = hitMemory(bucket, client, rule.windowSeconds);
    if (mine > rule.perClient) return false;
    return hitMemory(bucket, EVERYONE, DAY_SECONDS) <= rule.perDay;
  }
}

export const TOO_MANY = "Too many requests right now. Wait a few minutes and try again.";
