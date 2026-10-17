#!/usr/bin/env node
/**
 * Why a browser test failed when the server looked fine: open the routes the specs use and print what
 * the browser actually got.
 *
 * Playwright's HTML report and the job log both live on storage that some networks cannot reach, so a
 * red CI run can be a dead end. This script is the escape hatch: it drives the same stack with the same
 * browser, and prints only text — status codes, console errors, failed requests and the test ids that
 * ended up in the DOM — so the output can travel anywhere the log cannot (the workflow posts it as a
 * PR comment).
 *
 * Usage:
 *   node scripts/diagnose-e2e.mjs                 # all routes below
 *   node scripts/diagnose-e2e.mjs /cart /login    # just these
 *
 * Environment: DIAG_BASE_URL (default http://127.0.0.1:3000).
 */
import { chromium } from "@playwright/test";

const BASE = (process.env.DIAG_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const ROUTES = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/login", "/cart"];

const browser = await chromium.launch();
const context = await browser.newContext({ baseURL: BASE });

for (const route of ROUTES) {
  const page = await context.newPage();
  const consoleMessages = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text().slice(0, 300)}`);
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "failed"}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
  });

  console.log(`\n===== ${route} =====`);
  try {
    const response = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    console.log(`document: ${response?.status() ?? "no response"}`);
  } catch (error) {
    console.log(`document: navigation failed — ${error.message.split("\n")[0]}`);
  }

  // Give hydration and the client-side queries a moment, without assuming they succeed.
  await page.waitForTimeout(4_000);

  const testIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-testid]")).map((node) => node.getAttribute("data-testid")),
  );
  console.log(`title: ${await page.title()}`);
  console.log(`data-testid nodes (${testIds.length}): ${testIds.slice(0, 25).join(", ") || "none"}`);
  console.log(`body text: ${(await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").slice(0, 400)}`);

  if (consoleMessages.length) {
    console.log(`console (${consoleMessages.length}):`);
    for (const message of consoleMessages.slice(0, 10)) console.log(`  ${message}`);
  }
  if (failedRequests.length) {
    console.log(`failed requests (${failedRequests.length}):`);
    for (const message of failedRequests.slice(0, 10)) console.log(`  ${message}`);
  }

  await page.close();
}

await browser.close();
