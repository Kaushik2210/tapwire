// WCAG AA contrast audit of the dashboard colour tokens (light and dark). Run: npm run a11y:contrast
import { readFileSync } from "node:fs";

const css = readFileSync("apps/dashboard/app/globals.css", "utf8");

// Pull the token blocks: light = first :root, dark = the data-theme="dark" block.
function tokens(block) {
  const out = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const light = tokens(css.match(/:root \{([\s\S]*?)\n\}/)[1]);
const dark = tokens(css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/)[1]);

function parse(c) {
  c = c.trim();
  if (c.startsWith("#")) {
    const h = c.slice(1);
    const f = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)).concat(1);
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(",").map((x) => parseFloat(x));
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  throw new Error("cannot parse " + c);
}
const over = (fg, bg) => {
  const a = fg[3];
  return [0, 1, 2].map((i) => Math.round(fg[i] * a + bg[i] * (1 - a))).concat(1);
};
const lum = ([r, g, b]) => {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

function audit(name, t) {
  const bg = parse(t.bg), surface = parse(t.surface), surface2 = parse(t["surface-2"]);
  const rows = [];
  const check = (label, fg, base, min = 4.5) => {
    const r = ratio(fg, base);
    rows.push({ label, ratio: r.toFixed(2), need: min, ok: r >= min });
  };
  check("text on bg", parse(t.text), bg);
  check("text on surface", parse(t.text), surface);
  check("text-2 on bg", parse(t["text-2"]), bg);
  check("text-2 on surface", parse(t["text-2"]), surface);
  check("text-2 on surface-2", parse(t["text-2"]), surface2);
  check("accent on bg", parse(t.accent), bg);
  check("accent on surface", parse(t.accent), surface);
  for (const k of ["good", "warn", "crit", "accent"]) {
    const tint = over(parse(t[k === "accent" ? "accent-bg" : `${k}-bg`]), surface);
    check(`${k} text on its tint (badges)`, parse(t[k]), tint);
    const tintBg = over(parse(t[k === "accent" ? "accent-bg" : `${k}-bg`]), bg);
    check(`${k} text on tint over page bg`, parse(t[k]), tintBg);
  }
  check("bg text on text button", parse(t.bg), parse(t.text));
  check("focus ring (accent) vs surface, 3:1", parse(t.accent), surface, 3);
  console.log(`\n${name}`);
  for (const r of rows) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.ratio.padStart(5)} (>= ${r.need})  ${r.label}`);
  return rows.filter((r) => !r.ok).length;
}

const fails = audit("LIGHT", light) + audit("DARK", dark);
console.log(`\n${fails} failing pairs`);
