// test/deploy-contract.test.mjs — the deploy conventions, as tests.
// Template from the app-conventions skill. Fails when the Dockerfile ships
// something the build id does not hash, when a pin floats, when a workflow
// runs without permissions or a timeout, when a command is undocumented.
// Delete a block only if the repo has no such thing (e.g. no Dockerfile on
// GitHub Pages) — never to get green.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const has = (p) => existsSync(join(ROOT, p));


const workflows = has(".github/workflows") ? readdirSync(join(ROOT, ".github/workflows")).filter((f) => /\.ya?ml$/.test(f)) : [];

test("every action is pinned to a commit SHA with its version as a comment", () => {
  for (const f of workflows) {
    for (const [line, ref] of read(`.github/workflows/${f}`).matchAll(/uses:\s*(\S+)(.*)$/gm)) {
      if (ref.startsWith("./")) continue;
      assert.match(line, /@[0-9a-f]{40}\s+#\s*v\d/, `${f}: ${ref.trim()} is not pinned to a SHA with a # vX comment`);
    }
  }
});

test("every workflow declares permissions and every job a timeout", () => {
  for (const f of workflows) {
    const y = read(`.github/workflows/${f}`);
    assert.match(y, /^permissions:/m, `${f} has no top-level permissions`);
    const jobs = y.split(/^jobs:\s*$/m)[1] || "";
    const names = [...jobs.matchAll(/^ {2}([\w-]+):\s*$/gm)].map((m) => m[1]);
    for (const name of names) {
      const body = jobs.split(new RegExp(`^ {2}${name}:\\s*$`, "m"))[1].split(/^ {2}[\w-]+:\s*$/m)[0];
      assert.match(body, /timeout-minutes:/, `${f}: job ${name} has no timeout-minutes`);
    }
  }
});

test("CLAUDE.md exists and names every npm script", () => {
  assert.ok(has("CLAUDE.md"), "CLAUDE.md is missing");
  if (!has("package.json")) return;
  const claude = read("CLAUDE.md");
  const scripts = Object.keys(JSON.parse(read("package.json")).scripts || {});
  for (const s of ["verify", "live", "ship"]) assert.ok(scripts.includes(s), `package.json has no "${s}" script`);
  for (const s of scripts) assert.match(claude, new RegExp(`npm (run )?${s}\\b`), `CLAUDE.md does not mention npm run ${s}`);
});

test("the build writes version.json for the live check; src/ only fetches the app's own relative version.json", () => {
  assert.match(read("package.json"), /"build":\s*"vite build && node tools\/version\.mjs"/);
  // Network calls are allowed (owner decision 2026-10-26), but a third-party origin
  // needs a deliberate change here: only same-origin relative version.json passes.
  for (const f of readdirSync(join(ROOT, "src"))) {
    const src = read(`src/${f}`);
    assert.doesNotMatch(src, /XMLHttpRequest|sendBeacon|WebSocket|EventSource|import\s*\(\s*["'`]https?:/, `src/${f} uses a network API other than fetch`);
    for (const m of src.matchAll(/\bfetch\s*\(\s*(.{0,40})/g)) {
      assert.match(m[1], /^["'`]version\.json(\?|["'`])/, `src/${f}: fetch(${m[1]}…) is not the app's own relative version.json`);
    }
  }
});
