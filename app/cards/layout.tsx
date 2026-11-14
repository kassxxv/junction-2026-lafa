import { AppShell } from "@/components/app-shell";

export default function CardsLayout({ children }: LayoutProps<"/cards">) {
  return <AppShell>{children}</AppShell>;
}
