import { connection } from "next/server";
import { Suspense } from "react";
import { EVENT, formatDateRange } from "@/lib/matchready/event";
import { getEventOrDefault } from "@/lib/matchready/organiser";

/**
 * The event's name (and optionally its dates) as organisers set it in Event settings. Server component, streamed:
 * the built-in name shows until the live one arrives, and stays if the database is down.
 */
export function EventLabel({ withDates = false }: { withDates?: boolean }) {
  const fallback = withDates ? <Label name={EVENT.name} dates={formatDateRange(EVENT.startsOn, EVENT.endsOn)} where={where(EVENT.format)} /> : EVENT.name;
  return (
    <Suspense fallback={fallback}>
      <LiveLabel withDates={withDates} />
    </Suspense>
  );
}

const where = (format: string) => format.split(",")[0].trim().toLowerCase();

async function LiveLabel({ withDates }: { withDates: boolean }) {
  await connection();
  const e = await getEventOrDefault();
  return withDates ? <Label name={e.name} dates={formatDateRange(e.startsOn, e.endsOn)} where={where(e.format)} /> : e.name;
}

function Label({ name, dates, where }: { name: string; dates: string; where: string }) {
  return (
    <>
      <div className="font-medium">{name}</div>
      <div className="text-xs text-sidebar-muted">
        {dates}, {where}
      </div>
    </>
  );
}
