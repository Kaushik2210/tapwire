# TapWire

Turn every mistake an AI coding agent makes into an enforced rule, and measure how often it repeats fixed mistakes.

```bash
# not on the npm registry yet: install the release file (gives you `tapwire` and the short alias `scar`)
npm install -g https://github.com/Kaushik2210/tapwire/releases/download/v0.2.0/kaushik2210-tapwire-0.2.0.tgz

cd your-repo
tapwire init                            # creates .scars/, installs a pre-commit hook, writes agent instructions
git commit -m "fix: ..."                # fix a bug as usual
tapwire capture --export                # turn your latest commit (the fix) into a scar your agent will read
tapwire status                          # see how it is going
```

From then on, `tapwire check` (and the pre-commit hook) flags code that brings a fixed mistake back, and exits `1` so it can block a commit or fail CI.

- `tapwire agent-setup` shows how to make your AI agent hear about a repeat right after each edit; `tapwire watch` alerts you the instant one is written.
- `tapwire check --staged` checks what you are about to commit; `--base origin/main` checks a whole branch (for CI); `--offline` is regex-only (fast, free); `--json` is for tools.
- Capture and the semantic check use the Anthropic API: set `ANTHROPIC_API_KEY` (or put it in a local `.env`). Set `SCAR_MOCK=1` to try everything without a key.

Full documentation: https://github.com/Kaushik2210/tapwire#readme
