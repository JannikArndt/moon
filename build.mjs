#!/usr/bin/env node
/* Bundles the ES modules and the stylesheet into one self-contained HTML file.
   No dependencies. The modules only use static top-level imports with unique
   names, so concatenating them in dependency order and stripping the module
   keywords is enough. Run: node build.mjs */
import {readFileSync, writeFileSync, mkdirSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const ORDER = ["astro","data","state","draw","sky","orrery","timeline","charts","main"];

const strip = (src) => src
  .replace(/^\s*import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "")
  .replace(/^export\s+/gm, "")
  .replace(/\bexport\s+(?=(const|let|function)\b)/g, "");

const js = ORDER
  .map(n => `/* ── src/${n}.js ────────────────────────────────────────────── */\n` +
            strip(readFileSync(join(root, "src", `${n}.js`), "utf8")).trim())
  .join("\n\n");

const css  = readFileSync(join(root, "styles.css"), "utf8");
const html = readFileSync(join(root, "index.html"), "utf8")
  .replace('<link rel="stylesheet" href="./styles.css">', `<style>\n${css}</style>`)
  .replace('<script type="module" src="./src/main.js"></script>',
           `<script>\n"use strict";\n${js}\n</script>`);

mkdirSync(join(root, "docs"), {recursive: true});
writeFileSync(join(root, "docs", "moon-lab.html"), html);
console.log(`docs/moon-lab.html  ${(html.length / 1024).toFixed(0)} kB`);
