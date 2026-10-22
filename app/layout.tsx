import type { Metadata, Viewport } from "next";
import { themeBootScript } from "@/lib/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "zencharts",
  description: "Just the chart. Nothing else.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The boot script sets data-theme + CSS vars on <html> before hydration,
    // so its attributes intentionally differ from the server render.
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Apply the saved theme before paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript() }} />
        {children}
      </body>
    </html>
  );
}
