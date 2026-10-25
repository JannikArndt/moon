// What CI runs, with only what needs reading printed. Every step runs even
// after a failure. Last line: `VERIFY: PASS` or `VERIFY: FAIL (<steps>)`.
//   node tools/verify.mjs [test build check]
import { spawnSync } from "node:child_process";

const STEPS = {
  test: "npm test --silent",
  build: "npm run --silent build",
  check: "node tools/check-dist.mjs",
};
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(STEPS);
const failed = [];
for (const step of wanted) {
  const started = Date.now();
  const r = spawnSync(STEPS[step], { shell: true, encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (r.status === 0) { console.log(`✓ ${step} (${secs} s)`); continue; }
  failed.push(step);
  console.log(`✗ ${step} (${secs} s)`);
  const out = `${r.stdout}\n${r.stderr}`.split("\n");
  const notOk = out.flatMap((l, i) => (/^\s*not ok /.test(l) ? out.slice(i, i + 25) : []));
  console.log((notOk.length ? notOk : out.slice(-40)).join("\n").trim());
}
console.log(failed.length ? `VERIFY: FAIL (${failed.join(" ")})` : "VERIFY: PASS");
process.exit(failed.length ? 1 : 0);
