import { connection } from "next/server";
import { health as contextdevHealth } from "@/lib/contextdev";
import { health as dbHealth } from "@/lib/db";
import { health as escoHealth } from "@/lib/esco";
import { health as geminiHealth } from "@/lib/gemini";
import { health as gemmaHealth } from "@/lib/gemma";
import type { HealthStatus, ServiceHealth, ServiceName } from "@/lib/service";

type Overall = "ok" | "degraded" | "down";

const FINE: HealthStatus[] = ["ok", "unchecked"];
const BROKEN: HealthStatus[] = ["down", "not_configured"];

/**
 * GET /api/health — per-service status. Contains only status codes, latencies and
 * fixed booleans/versions: no keys, URLs, hosts or upstream error messages.
 * Always 200 so the UI can render partial outages.
 */
export async function GET() {
  // Cache Components: run at request time, never prerender at build.
  await connection();

  const checks: Record<ServiceName, () => Promise<ServiceHealth>> = {
    database: dbHealth,
    gemma: gemmaHealth,
    gemini: geminiHealth,
    contextdev: contextdevHealth,
    esco: escoHealth,
  };

  const entries = await Promise.all(
    Object.entries(checks).map(async ([name, check]): Promise<[string, ServiceHealth]> => {
      try {
        return [name, await check()];
      } catch {
        // Health functions handle their own errors; this is a last-resort guard.
        return [name, { status: "down", mode: "stub", error: "unknown" }];
      }
    }),
  );
  const services = Object.fromEntries(entries) as Record<ServiceName, ServiceHealth>;

  const statuses = Object.values(services).map((s) => s.status);
  const overall: Overall = statuses.every((s) => FINE.includes(s))
    ? "ok"
    : statuses.every((s) => BROKEN.includes(s))
      ? "down"
      : "degraded";

  return Response.json(
    { overall, checkedAt: new Date().toISOString(), services },
    { headers: { "Cache-Control": "no-store" } },
  );
}
