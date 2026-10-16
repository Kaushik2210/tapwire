"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";
const ORDER: Mode[] = ["system", "light", "dark"];
const KEY = "tapwire-theme";

const icons: Record<Mode, React.ReactNode> = {
  system: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  dark: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />,
};

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") setMode(saved);
    } catch {
      /* storage unavailable: stay on system */
    }
  }, []);

  function apply(next: Mode) {
    setMode(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }

  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => apply(next)}
      aria-label={`Theme: ${mode}. Switch to ${next}.`}
      title={`Theme: ${mode} (click for ${next})`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icons[mode]}
      </svg>
    </button>
  );
}
