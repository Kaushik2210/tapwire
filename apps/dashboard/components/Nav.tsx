"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandPalette, type PaletteItem } from "./CommandPalette";
import { LiveStatus } from "./LiveStatus";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/", label: "Overview" },
  { href: "/scars", label: "Scars" },
  { href: "/repeats", label: "Caught repeats" },
  { href: "/try", label: "Try it" },
];

export function Nav({ repo, items }: { repo: string; items: PaletteItem[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const palette: PaletteItem[] = [
    ...links.map((l) => ({ href: l.href, label: l.label, hint: "Page", group: "Pages" as const })),
    ...items,
  ];
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="TapWire home">
          {/* a wire with a tap on it */}
          <svg className="brand-mark" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M2 18 H11 M17 18 H26" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="14" cy="18" r="3" fill="currentColor" />
            <path d="M14 15 V6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M9 9.5 L14 5 L19 9.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          TapWire
        </Link>
        <nav className="nav-links" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="nav-tools">
          <CommandPalette items={palette} />
          <LiveStatus repo={repo} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
