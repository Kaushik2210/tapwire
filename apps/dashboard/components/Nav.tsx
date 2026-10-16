"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
  { href: "/scars", label: "Scars" },
  { href: "/repeats", label: "Caught repeats" },
];

export function Nav({ repo }: { repo: string }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
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
        <span className="watching" title="Repository being read">
          <span className="pulse" aria-hidden="true" />
          {repo}
        </span>
      </div>
    </header>
  );
}
