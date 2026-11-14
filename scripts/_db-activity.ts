/**
 * Dev helper: closes this app user's OTHER sessions in this database (e.g. a transaction left
 * open by a crashed script). Run: npx tsx --conditions=react-server --env-file=.env scripts/_db-activity.ts
 * Prints only counts — no hosts, users or queries.
 */
import { closeDb, query } from "../lib/db";

query(
  `SELECT pg_terminate_backend(pid) AS done FROM pg_stat_activity
   WHERE datname = current_database() AND usename = current_user AND pid <> pg_backend_pid()
     AND state = 'idle in transaction'`,
)
  .then((rows) => console.log(`closed stuck transactions: ${rows.length}`))
  .catch(() => console.log("could not close sessions"))
  .finally(() => closeDb());
