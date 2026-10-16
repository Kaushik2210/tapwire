export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="skeleton" style={{ height: "2.5rem", width: "60%", marginBottom: "1.5rem" }} />
      <div className="grid">
        <div className="skeleton col-5" style={{ height: "15rem" }} />
        <div className="skeleton col-7" style={{ height: "15rem" }} />
        <div className="skeleton col-12" style={{ height: "14rem" }} />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
