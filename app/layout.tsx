import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Renewal Radar",
  description: "Claude reads the fine print. Renewal Radar remembers it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
