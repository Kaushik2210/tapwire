"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="notice notice-error" role="alert">
      <h2>Something went wrong</h2>
      <p>The dashboard hit an unexpected error while reading your scars. Check the terminal for details, then try again.</p>
      <button className="button" onClick={reset}>Try again</button>
    </div>
  );
}
