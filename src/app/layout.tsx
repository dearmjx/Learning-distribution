import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning OS — Ecosystem ADI",
  description: "Research prototype for ADI learning with an AI Coach",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
