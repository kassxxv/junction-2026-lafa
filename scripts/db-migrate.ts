/**
 * Applies db/migrations/*.sql in order, once each. Usage: npm run db:migrate
 * `npm run db:migrate -- --reset` drops all app tables first (dev only; data is synthetic).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { closeDb, query, withTransaction } from "../lib/db";
import { classifyError } from "../lib/service";

const DIR = join(process.cwd(), "db", "migrations");

async function main() {
  if (process.argv.includes("--reset")) {
    console.log("Resetting: dropping the public schema (synthetic data only).");
    await query("DROP SCHEMA public CASCADE");
    await query("CREATE SCHEMA public");
    await query("CREATE EXTENSION IF NOT EXISTS vector");
  }

  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set((await query<{ name: string }>("SELECT name FROM schema_migrations")).map((r) => r.name));

  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    const sql = readFileSync(join(DIR, file), "utf8");
    await withTransaction(async (q) => {
      await q(sql);
      await q("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    });
    console.log(`applied ${file}`);
  }
  console.log("migrations up to date");
}

main()
  .catch((err) => {
    // SQL errors (5-char SQLSTATE) are about our SQL; connection errors may mention the host, so print only the code.
    const e = err as { code?: string; message?: string };
    const sqlError = typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code);
    console.error("migration failed:", sqlError ? `${e.code} ${e.message}` : (e.code ?? classifyError(err)));
    process.exitCode = 1;
  })
  .finally(() => closeDb());
