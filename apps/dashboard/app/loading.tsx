export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="skeleton" style={{ height: "0.875rem", width: "9rem", marginBottom: "0.75rem" }} />
      <div className="skeleton" style={{ height: "3rem", width: "min(34rem, 80%)", marginBottom: "2rem" }} />
      <div className="skeleton" style={{ height: "17rem", marginBottom: "1.5rem" }} />
      <div className="skeleton" style={{ height: "18rem" }} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
