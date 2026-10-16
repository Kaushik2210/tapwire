"use client";

import { useRef, useState } from "react";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = false;
    }
    setState(ok ? "done" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button type="button" className={`copy ${state === "done" ? "is-done" : ""} ${className}`} onClick={copy}>
      {state === "done" ? "Copied ✓" : state === "failed" ? "Copy failed" : label}
      <span className="sr-only" aria-live="polite">
        {state === "done" ? "Copied to clipboard" : state === "failed" ? "Could not copy" : ""}
      </span>
    </button>
  );
}
