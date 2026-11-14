import type { Metadata } from "next";
import { Instrument_Sans, Source_Serif_4 } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/** Interface typeface: structured, calm. */
const ui = Instrument_Sans({ variable: "--font-ui", subsets: ["latin", "latin-ext"] });

/** Document typeface: used only for the company's own source text. */
const doc = Source_Serif_4({ variable: "--font-document", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Recruitment event workspace",
  description: "Company cards for Espoo recruitment events (prototype, synthetic data)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${ui.variable} ${doc.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
