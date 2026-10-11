import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={displayFont.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
