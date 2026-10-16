import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Nav } from "../components/Nav";
import { repoPath } from "../lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "TapWire",
  description: "Turn every AI-agent mistake into an enforced rule, and measure how often it repeats.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  const repoName = repoPath().split(/[\\/]/).filter(Boolean).pop() ?? "repo";
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only skip">Skip to content</a>
        <Nav repo={repoName} />
        <main id="main" className="page">{children}</main>
      </body>
    </html>
  );
}
