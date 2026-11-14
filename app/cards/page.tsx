import { redirect } from "next/navigation";

/** The old staff card list is replaced by the organiser workspace. */
export default function CardsPage() {
  redirect("/organiser");
}
