#!/usr/bin/env -S npx tsx
import { resolve } from "node:path";
import { Command } from "commander";
import {
  captureScar,
  checkRepo,
  computeAmnesiaRate,
  exportScars,
  isMock,
  readEvents,
  readScars,
  ScarError,
} from "@scar/core";

const paint = (code: string) => (s: string) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const c = { red: paint("31"), green: paint("32"), dim: paint("2"), bold: paint("1") };

function fail(err: unknown): never {
  console.error(c.red(`✖ ${err instanceof ScarError ? err.message : (err as Error).message}`));
  process.exit(2);
}

const program = new Command("scar")
  .description("Turn an AI agent's fixed mistakes into enforced rules, and measure repeats.")
  .option("-r, --repo <path>", "repository to work in", process.cwd());

const repoOf = () => resolve(program.opts().repo as string);

program
  .command("capture <commit-sha>")
  .description("Write a scar from a fixing commit")
  .action(async (sha: string) => {
    try {
      const scar = await captureScar(repoOf(), sha);
      console.log(c.green(`✔ Captured ${scar.id}: ${c.bold(scar.title)} (${scar.severity})`));
      console.log(c.dim(`  ${scar.whatWentWrong}`));
      console.log(c.dim(`  Saved to .scars/scars.json${isMock() ? " (mock mode)" : ""}`));
    } catch (err) {
      fail(err);
    }
  });

program
  .command("check")
  .description("Flag code in the working diff that reintroduces a past scar")
  .option("--staged", "check only staged changes")
  .option("--no-record", "do not log repeat events")
  .action(async (opts: { staged?: boolean; record: boolean }) => {
    try {
      const repo = repoOf();
      const res = await checkRepo(repo, { staged: opts.staged, record: opts.record });
      const scars = new Map(readScars(repo).map((s) => [s.id, s]));
      if (res.notice) console.log(c.dim(res.notice));
      if (res.hits.length === 0) {
        console.log(c.green(`✔ No repeats found${res.scarCount ? ` (checked against ${res.scarCount} scars)` : ""}.`));
        return;
      }
      console.log(c.red(c.bold(`✖ ${res.hits.length} repeat${res.hits.length > 1 ? "s" : ""} of a past mistake:`)));
      for (const h of res.hits) {
        const s = scars.get(h.scarId);
        console.log(`\n  ${c.bold(s?.title ?? h.scarId)} ${c.dim(`[${s?.severity ?? "?"} · ${h.via}]`)}`);
        console.log(`  ${h.file}:${h.line}`);
        if (h.text) console.log(c.dim(`  > ${h.text}`));
        console.log(`  Why: ${h.reason}`);
        if (s) console.log(`  Instead: ${s.goodPattern}`);
      }
      const { rate } = computeAmnesiaRate(readEvents(repo));
      if (rate !== null) console.log(c.dim(`\nAmnesia Rate is now ${(rate * 100).toFixed(0)}%.`));
      process.exitCode = 1;
    } catch (err) {
      fail(err);
    }
  });

program
  .command("export")
  .description("Write the managed Scars section into AGENTS.md and CLAUDE.md")
  .action(() => {
    try {
      const files = exportScars(repoOf());
      console.log(c.green(`✔ Updated the Scars section in ${files.join(" and ")}.`));
    } catch (err) {
      fail(err);
    }
  });

program.parseAsync().catch(fail);
