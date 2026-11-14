import { AppShell } from "@/components/app-shell";

export default function OrganiserLayout({ children }: LayoutProps<"/organiser">) {
  return <AppShell>{children}</AppShell>;
}
