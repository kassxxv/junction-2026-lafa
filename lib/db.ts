import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool, type QueryResultRow } from "pg";
import { env } from "./env";
import { classifyError, logFailure, runProbe, ServiceUnavailableError, type ServiceHealth } from "./service";

/**
 * Aiven PostgreSQL (+ pgvector). No stub data yet: when the DB is unavailable,
 * callers get a ServiceUnavailableError and should show a clear "database offline" state.
 */

declare global {
  // Survives Next.js dev hot reloads so we don't open a new pool per edit.
  var __lafaPgPool: { pool: Pool; tlsVerified: boolean } | undefined;
}

function createPool(): { pool: Pool; tlsVerified: boolean } {
  const { DATABASE_URL, DATABASE_CA_CERT } = env();
  if (!DATABASE_URL) throw new ServiceUnavailableError("database", "not_configured");

  // SSL settings in the URL would override the `ssl` option below
  // (and current pg treats sslmode=require as verify-full), so we control TLS here.
  const url = new URL(DATABASE_URL);
  for (const p of ["sslmode", "uselibpqcompat", "sslrootcert", "sslcert", "sslkey"]) url.searchParams.delete(p);

  let ssl: { ca?: string; rejectUnauthorized: boolean };
  let tlsVerified: boolean;
  if (DATABASE_CA_CERT) {
    let ca: string;
    try {
      // Path comes from env at runtime; don't let the bundler trace the whole project.
      ca = readFileSync(resolve(/*turbopackIgnore: true*/ process.cwd(), DATABASE_CA_CERT), "utf8");
    } catch {
      throw new ServiceUnavailableError("database", "tls_failed");
    }
    ssl = { ca, rejectUnauthorized: true };
    tlsVerified = true;
  } else {
    // Prototype fallback: encrypted, but the server certificate is not verified.
    console.warn("[database] DATABASE_CA_CERT not set: TLS certificate is NOT verified");
    ssl = { rejectUnauthorized: false };
    tlsVerified = false;
  }

  const pool = new Pool({
    connectionString: url.toString(),
    ssl,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
  // Without this listener an idle-client error would crash the server process.
  pool.on("error", (err) => logFailure("database", "idle client", classifyError(err)));
  return { pool, tlsVerified };
}

function getPool(): { pool: Pool; tlsVerified: boolean } {
  globalThis.__lafaPgPool ??= createPool();
  return globalThis.__lafaPgPool;
}

export function isDbConfigured(): boolean {
  return Boolean(env().DATABASE_URL);
}

const CONNECTION_ERRORS = new Set(["not_configured", "timeout", "unreachable", "auth_failed", "tls_failed"]);

/**
 * Parameterised query. Connection problems become ServiceUnavailableError;
 * SQL errors are re-thrown unchanged so bugs stay visible.
 */
export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  try {
    const result = await getPool().pool.query<T>(text, params);
    return result.rows;
  } catch (err) {
    const code = classifyError(err);
    if (CONNECTION_ERRORS.has(code)) {
      logFailure("database", "query", code);
      throw err instanceof ServiceUnavailableError ? err : new ServiceUnavailableError("database", code);
    }
    throw err;
  }
}

export async function health(): Promise<ServiceHealth> {
  if (!isDbConfigured()) return { status: "not_configured", mode: "stub", error: "not_configured" };

  return runProbe("database", "live", async () => {
    const { pool, tlsVerified } = getPool();
    const { rows } = await pool.query<{ pgvector: string | null }>(
      "SELECT (SELECT extversion FROM pg_extension WHERE extname = 'vector') AS pgvector",
    );
    const pgvector = rows[0]?.pgvector ?? null;
    return {
      status: pgvector ? "ok" : "degraded",
      details: { pgvector: pgvector ?? "missing", tlsVerified },
    };
  });
}
