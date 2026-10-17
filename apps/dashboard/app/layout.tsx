import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Nav } from "../components/Nav";
import { loadRepo } from "../lib/data";
import "./globals.css";
import "./interactions.css";

export const metadata: Metadata = {
  title: { default: "TapWire", template: "%s · TapWire" },
  description: "Turn every AI-agent mistake into an enforced rule, and measure how often it repeats.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export const dynamic = "force-dynamic";

// Applies a saved theme before first paint so there is no flash.
const themeScript = `try{var t=localStorage.getItem('tapwire-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  const { repo, scars, sample } = loadRepo();
  const repoName = repo.split(/[\\/]/).filter(Boolean).pop() ?? "repo";
  const items = [...scars]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((s) => ({ href: `/scars/${s.id}`, label: s.title, hint: `${s.id} · ${s.severity}`, group: "Scars" as const }));
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only skip">Skip to content</a>
        <Nav repo={repoName} items={items} sample={!!sample} />
        <main id="main" className="page">{children}</main>
        <footer className="foot">
          <span>
            {sample ? (
              <>Showing bundled <b>sample data</b>, not a real repository.</>
            ) : (
              <>TapWire reads the <code>.scars</code> folder of <code>{repoName}</code>.</>
            )}
          </span>
          <span>Press <kbd>/</kbd> or <kbd>Ctrl</kbd> <kbd>K</kbd> to search</span>
        </footer>
      </body>
    </html>
  );
}
