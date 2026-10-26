// Sanity check of what the build produced: a page with its JS and CSS inlined, the
// icons and manifest as real files, and version.json = the build stamped in the page.
import { existsSync, readFileSync } from "node:fs";
import { buildId } from "./version.mjs";

const fail = (m) => { console.error(`check-dist: ${m}`); process.exit(1); };
if (!existsSync("dist/index.html")) fail("dist/index.html is missing (run npm run build)");
if (!existsSync("dist/version.json")) fail("dist/version.json is missing");
const html = readFileSync("dist/index.html", "utf8");
if (/<script[^>]+\bsrc=/.test(html) || /<link[^>]+rel=["']?stylesheet/.test(html)) fail("dist/index.html is not self-contained");
const { build } = JSON.parse(readFileSync("dist/version.json", "utf8"));
if (build !== buildId()) fail("dist/version.json does not match dist/index.html");
if (new RegExp(`<meta name="app-build" content="${build}"`).test(html) === false) fail("dist/index.html carries a different app-build than version.json");
for (const f of ["manifest.webmanifest", "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"]) {
  if (!existsSync(`dist/${f}`)) fail(`dist/${f} is missing`);
}
if (/<link[^>]+href="(\/|https?:|data:)/.test(html)) fail("dist/index.html has a <link> that is not a relative file");
