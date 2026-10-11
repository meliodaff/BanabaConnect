import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BanabaConnect Command Dashboard",
    template: "%s · BanabaConnect",
  },
  description: "Incident reports from residents of Barangay Banaba, ranked by priority.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
