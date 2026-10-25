// Writes dist/version.json = {"build": "<12 hex>"} after the build: a content
// hash of dist/index.html, the one file the site is made of. A content hash,
// not the commit, so a docs-only push does not change it. The app never
// fetches this file (CLAUDE.md: no network calls at runtime); CI and
// tools/live.mjs read it to prove a deploy is live.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

export function buildId(file = "dist/index.html") {
  return createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 12);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync("dist/version.json", JSON.stringify({ build: buildId() }) + "\n");
}
