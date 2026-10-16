import Link from "next/link";

export default function NotFound() {
  return (
    <div className="notice">
      <h2>That scar doesn’t exist</h2>
      <p>It may have been removed, or you are pointed at a different repository.</p>
      <Link className="button" href="/scars">Back to all scars</Link>
    </div>
  );
}
