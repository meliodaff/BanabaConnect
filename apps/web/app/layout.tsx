import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { getLang } from "@/lib/i18n-server";
import "./globals.css";

/**
 * Headings use Public Sans, a typeface made for government websites: civic and distinctive
 * without being decorative. Body text stays in the system font for readability. next/font
 * serves the font from this site, so pages don't call Google at runtime.
 */
const displayFont = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  title: {
    default: "BanabaConnect Command Dashboard",
    template: "%s · BanabaConnect",
  },
  description: "Incident reports from residents of Barangay Banaba, ranked by priority.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The staff member's language (English or Filipino), for screen readers and client components.
  const lang = await getLang();
  return (
    <html lang={lang} className={displayFont.variable}>
      <body className="min-h-screen antialiased">
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
