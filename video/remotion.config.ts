import { existsSync } from "node:fs";
import { Config } from "@remotion/cli/config";

// Use an installed Chromium-based browser instead of downloading one (override with REMOTION_BROWSER).
const candidates = [
  process.env.REMOTION_BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter((p): p is string => !!p && existsSync(p));
if (candidates[0]) Config.setBrowserExecutable(candidates[0]);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
