import { connection } from "next/server";
import { requireOrganiserPage } from "@/lib/auth";
import { eventUsage } from "@/lib/matchready/event-settings";
import { getEvent } from "@/lib/matchready/organiser";
import { SettingsScreen } from "./settings-screen";

/** Organisers set the event's name, dates, fields and types of work. Every page reads these values. */
export default async function SettingsPage() {
  await connection();
  await requireOrganiserPage("/organiser/settings");
  const [event, usage] = await Promise.all([getEvent(), eventUsage()]);

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border bg-card px-6 py-5">
        <h1 className="title-panel">Event settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What companies and professionals see: the name, the dates, the fields and the types of work on the talent-pool form.
        </p>
      </header>
      <SettingsScreen
        initial={{
          name: event.name,
          format: event.format,
          startsOn: event.startsOn,
          endsOn: event.endsOn,
          companyDeadline: event.companyDeadline,
          applicationDeadline: event.applicationDeadline,
          decisionDate: event.decisionDate,
          infoUrl: event.infoUrl ?? "",
          fields: event.fields,
          workTypes: event.workTypes,
        }}
        usage={usage}
      />
    </div>
  );
}
