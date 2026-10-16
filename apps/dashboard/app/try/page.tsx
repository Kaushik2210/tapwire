import type { Metadata } from "next";
import { loadRepo } from "../../lib/data";
import { Playground } from "../../components/Playground";
import { ErrorPanel, PageHead } from "../../components/ui";

export const metadata: Metadata = { title: "Try it" };
export const dynamic = "force-dynamic";

export default function Try() {
  const { scars, error } = loadRepo();
  return (
    <>
      <PageHead
        eyebrow={<>Try it · <b>{scars.length} scars loaded</b></>}
        title="Would your agent trip a scar?"
        lede="Paste code and see it checked against this repo’s scars, the same way scar check reads a diff. Nothing is saved."
      />
      {error ? <ErrorPanel message={error} /> : <Playground />}
    </>
  );
}
