import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@scar/core"],
  serverExternalPackages: ["@anthropic-ai/sdk"],
  // The workspace package lives outside this folder, so trace files from the repo root (needed on hosts like Vercel).
  outputFileTracingRoot: path.join(here, "../.."),
};

export default nextConfig;
