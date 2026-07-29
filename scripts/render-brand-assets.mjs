import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const brandDirectory = path.join(projectRoot, "public", "assets", "brand");

const renders = [
  {
    source: "matken-social-avatar.svg",
    output: "matken-icon-32.png",
    width: 32,
    height: 32,
  },
  {
    source: "matken-social-avatar.svg",
    output: "matken-apple-touch-icon.png",
    width: 180,
    height: 180,
  },
  {
    source: "matken-social-avatar.svg",
    output: "matken-icon-192.png",
    width: 192,
    height: 192,
  },
  {
    source: "matken-social-avatar.svg",
    output: "matken-icon-512.png",
    width: 512,
    height: 512,
  },
  {
    source: "matken-social-card.svg",
    output: "matken-social-card.png",
    width: 1200,
    height: 630,
  },
];

await mkdir(brandDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const render of renders) {
    const page = await browser.newPage({
      viewport: { width: render.width, height: render.height },
      deviceScaleFactor: 1,
    });
    await page.goto(
      pathToFileURL(path.join(brandDirectory, render.source)).href,
      { waitUntil: "load" },
    );
    await page.screenshot({
      path: path.join(brandDirectory, render.output),
      animations: "disabled",
    });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`Rendered ${renders.length} Matken brand assets.`);
