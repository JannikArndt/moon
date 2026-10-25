// Minimal sanity check of what the build produced: one self-contained page
// (no external script or stylesheet left behind) and a matching version.json.
import { existsSync, readFileSync } from "node:fs";
import { buildId } from "./version.mjs";

const fail = (m) => { console.error(`check-dist: ${m}`); process.exit(1); };
if (!existsSync("dist/index.html")) fail("dist/index.html is missing (run npm run build)");
if (!existsSync("dist/version.json")) fail("dist/version.json is missing");
const html = readFileSync("dist/index.html", "utf8");
if (/<script[^>]+\bsrc=/.test(html) || /<link[^>]+rel=["']?stylesheet/.test(html)) fail("dist/index.html is not self-contained");
const { build } = JSON.parse(readFileSync("dist/version.json", "utf8"));
if (build !== buildId()) fail("dist/version.json does not match dist/index.html");
