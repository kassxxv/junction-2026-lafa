import { redirect } from "next/navigation";
import { connection } from "next/server";
import { query } from "@/lib/db";

/** Opens the company with the most applications. */
export default async function ReviewIndex() {
  await connection();
  const [first] = await query<{ id: string }>(
    `SELECT company_id AS id FROM applications GROUP BY company_id ORDER BY count(*) DESC LIMIT 1`,
  );
  redirect(first ? `/organiser/review/${first.id}` : "/organiser");
}
