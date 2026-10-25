// Is this tree's build what the live site serves? Needs a local build
// (npm run build) to know the id.
//   node tools/live.mjs            answers now (exit 1 if not)
//   node tools/live.mjs --wait     polls every 5 s, up to 15 min (Pages' CDN caches ~10 min)
//   node tools/live.mjs --url <b>  another base URL
// Last line: `LIVE: <build>` or `NOT LIVE: want <a>, <url> serves <b>`.
import { existsSync, readFileSync } from "node:fs";

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const base = (arg("--url") || process.env.APP_URL || "https://jannikarndt.github.io/moon").replace(/\/$/, "");
const wait = process.argv.includes("--wait");
if (!existsSync("dist/version.json")) { console.log("NOT LIVE: no local build (run npm run build first)"); process.exit(1); }
const want = JSON.parse(readFileSync("dist/version.json", "utf8")).build;
const started = Date.now();

async function served() {
  try {
    const res = await fetch(`${base}/version.json?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const body = await res.json().catch(() => ({}));
    return body.build || `HTTP ${res.status}`;
  } catch (err) {
    return err.cause?.code || err.name;
  }
}

let last = "";
for (;;) {
  const got = await served();
  if (got === want) { console.log(`LIVE: ${want}`); process.exit(0); }
  const secs = Math.round((Date.now() - started) / 1000);
  if (!wait || secs > 900) { console.log(`NOT LIVE: want ${want}, ${base} serves ${got}`); process.exit(1); }
  if (got !== last) { console.log(`  ${secs} s: ${base} serves ${got}`); last = got; }
  await new Promise((r) => setTimeout(r, 5000));
}
