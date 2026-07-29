import { readFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const clientDirectory = path.join(root, "dist", "client");
const indexPath = path.join(clientDirectory, "index.html");
const indexSource = await readFile(indexPath, "utf8");

const entryScript = indexSource.match(
  /<script[^>]+src="([^"]+)"[^>]*><\/script>/i,
)?.[1];
const entryStylesheet = indexSource.match(
  /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/i,
)?.[1];

if (!entryScript || !entryStylesheet) {
  throw new Error("Could not resolve the entry JavaScript and stylesheet.");
}

const pagesBase = process.env.GITHUB_PAGES_BASE?.trim() || "";
if (pagesBase) {
  for (const publicPath of [entryScript, entryStylesheet]) {
    if (!publicPath.startsWith(pagesBase)) {
      throw new Error(
        `GitHub Pages entry escaped ${pagesBase}: ${publicPath}`,
      );
    }
  }
}

const toClientPath = (publicPath) => {
  const relativePath = pagesBase
    ? publicPath.slice(pagesBase.length)
    : publicPath.replace(/^\/+/, "");
  return path.join(clientDirectory, relativePath);
};

const gzipBytes = async (file) =>
  gzipSync(await readFile(file), { level: 9 }).byteLength;

const entryJavaScriptGzip = await gzipBytes(toClientPath(entryScript));
const entryCssGzip = await gzipBytes(toClientPath(entryStylesheet));
const assetNames = await readdir(path.join(clientDirectory, "assets"));
const JavaScriptNames = assetNames.filter((name) => name.endsWith(".js"));
const totalJavaScriptGzip = (
  await Promise.all(
    JavaScriptNames.map((name) =>
      gzipBytes(path.join(clientDirectory, "assets", name)),
    ),
  )
).reduce((total, bytes) => total + bytes, 0);

const budgets = [
  ["entry JavaScript gzip", entryJavaScriptGzip, 105 * 1024],
  ["entry CSS gzip", entryCssGzip, 20 * 1024],
  ["all JavaScript gzip", totalJavaScriptGzip, 170 * 1024],
];

for (const [label, actual, maximum] of budgets) {
  if (actual > maximum) {
    throw new Error(
      `${label} is ${actual.toLocaleString()} bytes; budget is ${maximum.toLocaleString()} bytes.`,
    );
  }
}

console.log("PASS: Matken production bundle stays within its budgets.");
for (const [label, actual, maximum] of budgets) {
  console.log(
    `- ${label}: ${actual.toLocaleString()} / ${maximum.toLocaleString()} bytes`,
  );
}
