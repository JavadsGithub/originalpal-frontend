#!/usr/bin/env node
/**
 * Turns Playwright's JSON report into a short list: every failed spec, its first error line, and the
 * line of the spec that raised it.
 *
 * A full report is megabytes of attachments and stack frames — too big for a PR comment, and the HTML
 * version is not reachable at all on networks that block GitHub's artifact storage.
 *
 * Usage: node scripts/summarize-e2e.mjs /tmp/e2e.json
 */
import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "/tmp/e2e.json";
const report = JSON.parse(readFileSync(path, "utf8"));

const failures = [];
let total = 0;

function walkSuite(suite, file) {
  const fileName = suite.file ?? file;
  for (const spec of suite.specs ?? []) {
    total += 1;
    if (spec.ok) continue;
    const test = spec.tests?.[0];
    const result = test?.results?.[test.results.length - 1];
    const error = result?.error ?? result?.errors?.[0];
    const message = (error?.message ?? result?.status ?? "failed")
      .replace(/\u001b\[[0-9;]*m/g, "")
      .split("\n")
      .filter((line) => line.trim())
      .slice(0, 4)
      .join(" / ");
    failures.push(`${fileName}:${spec.line} — ${spec.title}\n    ${message.slice(0, 400)}`);
  }
  for (const child of suite.suites ?? []) walkSuite(child, fileName);
}

for (const suite of report.suites ?? []) walkSuite(suite);

console.log(`${failures.length} of ${total} failed\n`);
for (const failure of failures) console.log(`• ${failure}\n`);
