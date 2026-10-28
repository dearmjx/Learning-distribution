import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning OS — Ecosystem ADI",
  description: "Research prototype for ADI learning with an AI Coach",
  appleWebApp: { capable: true, title: "Learning OS", statusBarStyle: "default" },
};

// viewport-fit=cover lets the layout pad around the iPhone notch and home indicator itself.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7faf8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
