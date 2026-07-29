import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import { chromium } from "playwright";

const serverOrigin = "http://127.0.0.1:4176";
const pagesRoot = `${serverOrigin}/matken-electrical-preview/`;
const reportDirectory = process.env.CI
  ? path.resolve(".lighthouseci", "reports")
  : "/tmp/matken-lighthouse-reports";
const thresholds = Object.freeze({
  performance: 0.85,
  accessibility: 0.95,
  "best-practices": 0.9,
  "first-contentful-paint": 2_200,
  "largest-contentful-paint": 3_000,
  "cumulative-layout-shift": 0.1,
  "total-blocking-time": 350,
});
const profiles = [
  {
    name: "home-desktop",
    url: `${pagesRoot}#/`,
    preset: "desktop",
  },
  {
    name: "planner-mobile",
    url: `${pagesRoot}#/planner`,
  },
];

const server = spawn("npm", ["run", "preview:pages"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk;
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk;
});

const waitForServer = async () => {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `Pages preview exited before Lighthouse started.\n${serverOutput}`,
      );
    }
    try {
      const response = await fetch(pagesRoot, {
        signal: AbortSignal.timeout(1_500),
      });
      if (response.ok) return;
    } catch {
      // The preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for the Pages preview.\n${serverOutput}`);
};

const assertAtLeast = (profile, label, value, minimum) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `${profile} ${label} did not return a numeric Lighthouse score. Confirm the Pages artifact and route loaded before auditing.`,
    );
  }
  if (value < minimum) {
    throw new Error(
      `${profile} ${label} score ${value.toFixed(2)} is below ${minimum.toFixed(2)}.`,
    );
  }
};

const assertAtMost = (profile, label, value, maximum) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `${profile} ${label} did not return a numeric Lighthouse value. Confirm the Pages artifact and route loaded before auditing.`,
    );
  }
  if (value > maximum) {
    throw new Error(
      `${profile} ${label} ${Math.round(value)} exceeds ${maximum}.`,
    );
  }
};

let chrome;
try {
  await waitForServer();
  await mkdir(reportDirectory, { recursive: true });
  chrome = await launch({
    chromePath: process.env.CHROME_PATH || chromium.executablePath(),
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });

  const summaries = [];
  for (const profile of profiles) {
    const result = await lighthouse(profile.url, {
      port: chrome.port,
      output: "html",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices"],
      ...(profile.preset ? { preset: profile.preset } : {}),
    });
    if (!result?.lhr) {
      throw new Error(`Lighthouse returned no result for ${profile.name}.`);
    }

    const categories = result.lhr.categories;
    const audits = result.lhr.audits;
    const summary = {
      profile: profile.name,
      url: profile.url,
      performance: categories.performance.score,
      accessibility: categories.accessibility.score,
      "best-practices": categories["best-practices"].score,
      "first-contentful-paint":
        audits["first-contentful-paint"].numericValue,
      "largest-contentful-paint":
        audits["largest-contentful-paint"].numericValue,
      "cumulative-layout-shift":
        audits["cumulative-layout-shift"].numericValue,
      "total-blocking-time": audits["total-blocking-time"].numericValue,
    };

    assertAtLeast(
      profile.name,
      "performance",
      summary.performance,
      thresholds.performance,
    );
    assertAtLeast(
      profile.name,
      "accessibility",
      summary.accessibility,
      thresholds.accessibility,
    );
    assertAtLeast(
      profile.name,
      "best practices",
      summary["best-practices"],
      thresholds["best-practices"],
    );
    for (const metric of [
      "first-contentful-paint",
      "largest-contentful-paint",
      "cumulative-layout-shift",
      "total-blocking-time",
    ]) {
      assertAtMost(
        profile.name,
        metric,
        summary[metric],
        thresholds[metric],
      );
    }

    summaries.push(summary);
    await writeFile(
      path.join(reportDirectory, `${profile.name}.html`),
      result.report,
    );
  }

  await writeFile(
    path.join(reportDirectory, "summary.json"),
    `${JSON.stringify({ thresholds, summaries }, null, 2)}\n`,
  );
  console.log(
    `PASS: ${summaries.length} Lighthouse profiles stayed within Matken budgets.`,
  );
  for (const summary of summaries) {
    console.log(
      `- ${summary.profile}: performance ${summary.performance.toFixed(2)}, accessibility ${summary.accessibility.toFixed(2)}, best practices ${summary["best-practices"].toFixed(2)}`,
    );
  }
} finally {
  await chrome?.kill();
  if (server.exitCode === null) server.kill("SIGTERM");
}
