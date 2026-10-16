"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export interface PaletteItem {
  href: string;
  label: string;
  hint: string;
  group: "Pages" | "Scars";
}

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [mac, setMac] = useState(false);

  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => !needle || `${i.label} ${i.hint}`.toLowerCase().includes(needle));
  }, [items, q]);

  function show() {
    setQ("");
    setIdx(0);
    if (!dialog.current?.open) dialog.current?.showModal();
    requestAnimationFrame(() => input.current?.focus());
  }
  const close = () => dialog.current?.close();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.current?.open) close();
        else show();
      } else if (e.key === "/" && !isTyping(e.target) && !dialog.current?.open) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(item?: PaletteItem) {
    if (!item) return;
    close();
    router.push(item.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[idx]);
    }
  }

  let lastGroup = "";
  return (
    <>
      <button type="button" className="search-btn" onClick={show} aria-label="Search pages and scars" aria-keyshortcuts="Control+K Meta+K /">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="search-label">Search</span>
        <kbd>{mac ? "⌘K" : "Ctrl K"}</kbd>
      </button>

      <dialog
        ref={dialog}
        className="palette"
        aria-label="Search pages and scars"
        onClick={(e) => e.target === dialog.current && close()}
      >
        <div className="palette-box">
          <input
            ref={input}
            className="palette-input"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[idx] ? `pal-${idx}` : undefined}
            placeholder="Jump to a page or scar…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={onInputKey}
          />
          <ul id="palette-list" role="listbox" className="palette-list">
            {results.length === 0 && <li className="palette-empty">No matches for “{q}”.</li>}
            {results.map((r, i) => {
              const header = r.group !== lastGroup ? r.group : null;
              lastGroup = r.group;
              return (
                <li key={r.href} role="presentation">
                  {header && <p className="palette-group">{header}</p>}
                  <button
                    type="button"
                    id={`pal-${i}`}
                    role="option"
                    aria-selected={i === idx}
                    className={i === idx ? "palette-item is-active" : "palette-item"}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => go(r)}
                  >
                    <span>{r.label}</span>
                    <span className="palette-hint">{r.hint}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="palette-foot"><kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</p>
        </div>
      </dialog>
    </>
  );
}
