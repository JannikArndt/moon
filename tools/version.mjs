// Stamps a finished build. Run after `vite build` (npm run build).
//   - the build id is a content hash of everything in dist/ except version.json,
//     taken with <meta name="app-build"> reset to "dev" so it never depends on itself;
//     a content hash, not the commit, so a docs-only push changes nothing
//   - the id is written into that meta (the page knows its own build) and into
//     dist/version.json = {"build": "<12 hex>"}, which the open page, CI and
//     tools/live.mjs compare against
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const META = /(<meta name="app-build" content=")[^"]*(")/;

function files(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]))
    .sort();
}

export function buildId(dist = "dist") {
  const hash = createHash("sha256");
  for (const file of files(dist)) {
    const rel = relative(dist, file).split(sep).join("/");
    if (rel === "version.json") continue;
    let body = readFileSync(file);
    if (rel === "index.html") body = Buffer.from(body.toString("utf8").replace(META, "$1dev$2"));
    hash.update(`${rel}\0${body.length}\0`).update(body);
  }
  return hash.digest("hex").slice(0, 12);
}

export function stamp(dist = "dist") {
  const build = buildId(dist);
  const index = join(dist, "index.html");
  const html = readFileSync(index, "utf8");
  if (!META.test(html)) throw new Error('dist/index.html has no <meta name="app-build">');
  writeFileSync(index, html.replace(META, `$1${build}$2`));
  writeFileSync(join(dist, "version.json"), JSON.stringify({ build }) + "\n");
  return build;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`BUILD: ${stamp()}`);
