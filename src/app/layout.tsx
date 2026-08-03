import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PortalProvider } from "@/lib/client";
import { Toaster } from "@/components/Toaster";

export const metadata: Metadata = {
  title: "Khan Pharmacy · Staff Portal",
  description:
    "Production-ready staff portal for Khan Pharmacy — punch clock, supervisor control, tasks, and real-time payroll."
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <PortalProvider>
          {children}
          <Toaster />
        </PortalProvider>
      </body>
    </html>
  );
}
