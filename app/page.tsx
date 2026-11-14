import { redirect } from "next/navigation";

/** The company flow is the main entry; the staff workspace lives under /cards. */
export default function Home() {
  redirect("/company");
}
