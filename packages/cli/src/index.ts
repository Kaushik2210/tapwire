import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command, Option } from "commander";
import {
  captureScar,
  checkRepo,
  computeAmnesiaRate,
  ensureStore,
  exportScars,
  filesFromHookInput,
  formatAgentMessage,
  installHook,
  isHookInstalled,
  isMock,
  readEvents,
  readScars,
  ScarError,
  START,
  TARGET_FILES,
  uninstallHook,
  watchRepo,
  type EventSource,
} from "@scar/core";

import pkg from "../package.json";

// Pick up ANTHROPIC_API_KEY etc. from a local .env if there is one (never committed).
try {
  process.loadEnvFile(".env");
} catch {
  /* no .env file: fine */
}

const paint = (code: string) => (s: string) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const c = { red: paint("31"), green: paint("32"), yellow: paint("33"), dim: paint("2"), bold: paint("1") };

function fail(err: unknown): never {
  console.error(c.red(`✖ ${err instanceof ScarError ? err.message : (err as Error).message}`));
  process.exit(2);
}

const program = new Command("tapwire")
  .description("Turn an AI agent's fixed mistakes into enforced rules, and measure repeats.")
  .version(pkg.version, "-v, --version")
  .option("-r, --repo <path>", "repository to work in", process.cwd());

const repoOf = () => resolve(program.opts().repo as string);

/** The command a pre-commit hook runs: `tapwire` from PATH if there is one, otherwise this exact file. */
function hookCommand(semantic: boolean): string {
  const flags = `check --staged --source hook${semantic ? "" : " --offline"}`;
  const self = fileURLToPath(import.meta.url).replace(/\\/g, "/");
  const node = process.execPath.replace(/\\/g, "/");
  const direct = self.endsWith(".ts") ? `"${node}" --import tsx "${self}"` : `"${node}" "${self}"`;
  return `ROOT=$(git rev-parse --show-toplevel)
if command -v tapwire >/dev/null 2>&1; then
  tapwire --repo "$ROOT" ${flags}
else
  ${direct} --repo "$ROOT" ${flags}
fi`;
}

function hasAgentNotes(repo: string): boolean {
  return TARGET_FILES.some((f) => existsSync(join(repo, f)) && readFileSync(join(repo, f), "utf8").includes(START));
}

program
  .command("init")
  .description("Set up TapWire in this repository: scar store, pre-commit hook, agent instructions")
  .option("--no-hook", "do not install the pre-commit hook")
  .option("--semantic", "let the hook also run the (slower, paid) LLM pass; default is the fast offline check")
  .action((opts: { hook: boolean; semantic?: boolean }) => {
    try {
      const repo = repoOf();
      console.log(ensureStore(repo) ? c.green("✔ Created .scars/ (commit it so your team shares the scars)") : c.dim("• .scars/ already exists"));
      if (opts.hook) {
        try {
          installHook(repo, hookCommand(!!opts.semantic));
          console.log(c.green("✔ Installed the pre-commit hook (blocks commits that repeat a scar)"));
        } catch (err) {
          console.log(c.yellow(`! Hook not installed: ${(err as Error).message}`));
        }
      }
      const files = exportScars(repo);
      console.log(c.green(`✔ Added the Scars section to ${files.join(" and ")} so your AI agent reads it first`));
      console.log(`\nNext: fix a bug, commit the fix, then run ${c.bold("tapwire capture")} (it uses your latest commit).`);
      console.log(c.dim("To make your AI agent hear about a repeat right after each edit: tapwire agent-setup"));
      console.log(c.dim("Run `tapwire status` any time to see how it is going."));
    } catch (err) {
      fail(err);
    }
  });

program
  .command("capture [commit-sha]")
  .description("Write a scar from a fixing commit (default: the latest commit)")
  .option("--export", "also refresh the Scars section in AGENTS.md and CLAUDE.md")
  .action(async (sha: string | undefined, opts: { export?: boolean }) => {
    try {
      const repo = repoOf();
      const scar = await captureScar(repo, sha ?? "HEAD");
      console.log(c.green(`✔ Captured ${scar.id}: ${c.bold(scar.title)} (${scar.severity})`));
      console.log(c.dim(`  ${scar.whatWentWrong}`));
      console.log(c.dim(`  Saved to .scars/scars.json${isMock() ? " (mock mode)" : ""}`));
      if (opts.export) {
        exportScars(repo);
        console.log(c.green("✔ Refreshed the Scars section for your AI agent"));
      } else if (hasAgentNotes(repo)) {
        console.log(c.dim("  Tip: run `tapwire export` (or capture with --export) so your agent sees the new scar."));
      }
    } catch (err) {
      fail(err);
    }
  });

program
  .command("check")
  .description("Flag code that reintroduces a past scar (exit 1 if it finds one)")
  .option("--staged", "check only staged changes")
  .option("--base <ref>", "CI mode: check everything changed since this ref, e.g. origin/main")
  .option("--offline", "regex only: fast, free, no network")
  .option("--json", "print machine-readable JSON")
  .option("--no-record", "do not log repeat events")
  .option("--file <path...>", "only report hits in these files")
  .addOption(new Option("--source <source>", "how this check was triggered").choices(["check", "hook", "agent", "watch"]).default("check").hideHelp())
  .action(async (opts: { staged?: boolean; base?: string; offline?: boolean; json?: boolean; record: boolean; file?: string[]; source: EventSource }) => {
    try {
      const repo = repoOf();
      const res = await checkRepo(repo, {
        staged: opts.staged,
        base: opts.base,
        semantic: !opts.offline,
        record: opts.record,
        files: opts.file,
        source: opts.source,
      });
      const scars = new Map(readScars(repo).map((s) => [s.id, s]));
      const { rate } = computeAmnesiaRate(readEvents(repo));

      if (opts.json) {
        console.log(
          JSON.stringify(
            {
              ok: res.hits.length === 0,
              scarCount: res.scarCount,
              linesChecked: res.checked ?? 0,
              amnesiaRate: rate,
              notice: res.notice ?? null,
              hits: res.hits.map((h) => ({ ...h, scar: scars.get(h.scarId)?.title ?? null, severity: scars.get(h.scarId)?.severity ?? null, instead: scars.get(h.scarId)?.goodPattern ?? null })),
            },
            null,
            2,
          ),
        );
        process.exitCode = res.hits.length ? 1 : 0;
        return;
      }

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
      if (rate !== null) console.log(c.dim(`\nAmnesia Rate is now ${(rate * 100).toFixed(0)}%.`));
      process.exitCode = 1;
    } catch (err) {
      fail(err);
    }
  });

program
  .command("status")
  .description("Show whether TapWire is set up and how it is going")
  .action(() => {
    try {
      const repo = repoOf();
      const scars = readScars(repo);
      const events = readEvents(repo);
      const { repeats, newMistakes, rate } = computeAmnesiaRate(events);
      const key = !!process.env.ANTHROPIC_API_KEY;
      const mode = isMock() ? "mock (built-in fixtures)" : key ? "live (API key found)" : "live, but no API key: capture will fail, check uses regex only";
      const row = (k: string, v: string) => console.log(`  ${k.padEnd(18)}${v}`);
      console.log(c.bold(`TapWire status for ${repo}`));
      row("Scars", String(scars.length));
      row("Events", `${events.length} (${newMistakes} new mistakes, ${repeats} repeats caught)`);
      row("Amnesia Rate", rate === null ? "no data yet" : `${Math.round(rate * 100)}%  (lower is better)`);
      row("Pre-commit hook", isHookInstalled(repo) ? c.green("installed") : c.yellow("not installed (run: tapwire hook install)"));
      row("Agent notes", hasAgentNotes(repo) ? c.green("AGENTS.md / CLAUDE.md have a Scars section") : c.yellow("missing (run: tapwire export)"));
      row("AI mode", mode);
      if (scars.length === 0) console.log(c.dim("\nNo scars yet. Fix a bug, commit it, then: tapwire capture <commit-sha>"));
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

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

program
  .command("agent-check")
  .description("Run right after an AI agent edits a file: tell it immediately if it repeated a past mistake")
  .option("--file <path...>", "the edited file(s); otherwise they are read from the JSON an agent hook sends on stdin")
  .option("--semantic", "also run the LLM pass (slower, paid); default is the fast offline check")
  .action(async (opts: { file?: string[]; semantic?: boolean }) => {
    // Exit codes follow the agent-hook convention: 0 = fine, 2 = tell the agent (message on stderr), 1 = tool error (never blocks).
    try {
      const repo = repoOf();
      let files = opts.file ?? [];
      if (files.length === 0 && !process.stdin.isTTY) files = filesFromHookInput(await readStdin());
      const res = await checkRepo(repo, { files: files.length ? files : undefined, semantic: !!opts.semantic, source: "agent" });
      if (res.hits.length === 0) return;
      console.error(formatAgentMessage(res.hits, readScars(repo)));
      process.exitCode = 2;
    } catch (err) {
      console.error(`TapWire could not check that edit: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("watch")
  .description("Watch the repository and flag a repeat of a past mistake the moment it is written to disk")
  .option("--semantic", "also run the LLM pass (slower, paid)")
  .action((opts: { semantic?: boolean }) => {
    try {
      const repo = repoOf();
      const scars = new Map(readScars(repo).map((s) => [s.id, s]));
      if (scars.size === 0) console.log(c.yellow("No scars yet: capture one first (tapwire capture <commit-sha>)."));
      console.log(c.bold(`Watching ${repo}`) + c.dim("  (Ctrl+C to stop)"));
      const stop = watchRepo(
        repo,
        (hits) => {
          process.stdout.write("\x07");
          for (const h of hits) {
            const s = scars.get(h.scarId);
            console.log(c.red(c.bold(`\n✖ ${new Date().toLocaleTimeString()}  ${s?.title ?? h.scarId} repeated at ${h.file}:${h.line}`)));
            if (h.text) console.log(c.dim(`  > ${h.text}`));
            console.log(`  Why: ${s?.whatWentWrong ?? h.reason}`);
            if (s) console.log(`  Instead: ${s.goodPattern}`);
          }
        },
        { semantic: !!opts.semantic, onError: (err) => console.error(c.dim(`check failed: ${err.message}`)) },
      );
      process.on("SIGINT", () => {
        stop();
        process.exit(0);
      });
    } catch (err) {
      fail(err);
    }
  });

program
  .command("agent-setup")
  .description("Show how to make an AI agent hear about a repeat right after each edit")
  .action(() => {
    console.log(`${c.bold("Give your AI agent instant feedback")}

TapWire cannot control what a model writes, but it can tell the agent the moment it repeats a
fixed mistake, so the agent corrects itself in the same turn.

${c.bold("1. Agents with post-edit command hooks")} (the command receives the edit as JSON on stdin; exit code 2 sends stderr back to the agent):

  {
    "hooks": {
      "PostToolUse": [
        { "matcher": "Edit|Write|MultiEdit",
          "hooks": [ { "type": "command", "command": "tapwire agent-check" } ] }
      ]
    }
  }

${c.bold("2. Any other agent or editor")}: run ${c.bold("tapwire watch")} in a terminal. It prints an alert (and rings the bell)
the instant a repeat is written to disk.

${c.bold("3. Always")}: the pre-commit hook and ${c.bold("tapwire check --base origin/main")} in CI are the hard stop.

Test it by hand:  echo '{"tool_input":{"file_path":"src/app.js"}}' | tapwire agent-check`);
  });

const hook = program.command("hook").description("Block commits that reintroduce a past scar");

hook
  .command("install")
  .description("Install a pre-commit hook that runs `tapwire check --staged`")
  .option("--semantic", "also run the LLM pass on every commit (slower, paid); default is the fast offline check")
  .action((opts: { semantic?: boolean }) => {
    try {
      const path = installHook(repoOf(), hookCommand(!!opts.semantic));
      console.log(c.green(`✔ Pre-commit hook installed at ${path}`));
      console.log(c.dim("  Commits that reintroduce a scar are now blocked. Bypass once with: git commit --no-verify"));
    } catch (err) {
      fail(err);
    }
  });

hook
  .command("uninstall")
  .description("Remove the TapWire pre-commit hook")
  .action(() => {
    try {
      console.log(uninstallHook(repoOf()) ? c.green("✔ Hook removed.") : c.dim("No TapWire hook was installed."));
    } catch (err) {
      fail(err);
    }
  });

program.parseAsync().catch(fail);
