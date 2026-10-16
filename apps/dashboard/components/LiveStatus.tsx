"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const INTERVAL_MS = 4000;

/** Re-reads the .scars folder every few seconds so a `scar check` in the terminal shows up without a reload. */
export function LiveStatus({ repo }: { repo: string }) {
  const router = useRouter();
  const [live, setLive] = useState(true);
  const [ago, setAgo] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    last.current = Date.now();
  }, []);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
        last.current = Date.now();
      }
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [live, router]);

  useEffect(() => {
    const id = setInterval(() => setAgo(Math.floor((Date.now() - last.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      type="button"
      className={live ? "watching is-live" : "watching"}
      aria-pressed={live}
      aria-label={`Live updates for ${repo} are ${live ? "on" : "paused"}. Press to ${live ? "pause" : "resume"}.`}
      title={live ? "Reading the repo every few seconds. Click to pause." : "Paused. Click to resume."}
      onClick={() => setLive((v) => !v)}
    >
      <span className="pulse" aria-hidden="true" />
      <span aria-hidden="true">{repo}</span>
      <span className="live-tag" aria-hidden="true">{live ? `live · ${ago}s` : "paused"}</span>
    </button>
  );
}
