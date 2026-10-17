// Bundles the CLI and the core library into one runnable file: packages/cli/dist/tapwire.mjs
// Only the Anthropic SDK stays external (it is a normal dependency of the published package).
import { chmodSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = join(root, "packages/cli/dist/tapwire.mjs");
mkdirSync(dirname(outfile), { recursive: true });

await build({
  entryPoints: [join(root, "packages/cli/src/index.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  external: ["@anthropic-ai/sdk"],
  legalComments: "none",
  logLevel: "warning",
  banner: {
    // `commander` is CommonJS, so give the ESM bundle a `require`.
    js: "#!/usr/bin/env node\nimport { createRequire as __tapwireCreateRequire } from 'node:module';\nconst require = __tapwireCreateRequire(import.meta.url);",
  },
});
chmodSync(outfile, 0o755);
console.log(`Built ${outfile}`);
