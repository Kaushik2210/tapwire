import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Nav } from "../components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scar Tissue",
  description: "Turn every AI-agent mistake into an enforced rule, and measure how often it repeats.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only">Skip to content</a>
        <Nav />
        <main id="main" className="page">{children}</main>
      </body>
    </html>
  );
}
