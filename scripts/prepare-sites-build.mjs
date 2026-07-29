#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const client = path.join(dist, "client");
const index = path.join(client, "index.html");
const worker = path.join(root, "worker", "index.js");
const hosting = path.join(root, ".openai", "hosting.json");
const githubPagesBase = process.env.GITHUB_PAGES_BASE?.trim() || "";

if (!existsSync(index)) {
  throw new Error("Missing client build input: " + index);
}

if (githubPagesBase) {
  if (!/^\/[a-zA-Z0-9._/-]+\/$/.test(githubPagesBase)) {
    throw new Error(
      "GITHUB_PAGES_BASE must be a slash-wrapped repository path.",
    );
  }

  const rewritePublicPaths = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        rewritePublicPaths(file);
        continue;
      }
      if (!/\.(?:css|html|js)$/.test(entry.name)) continue;

      const source = readFileSync(file, "utf8");
      const rewritten = source
        .replace(
          /(^|["'(=:])\/assets\//g,
          `$1${githubPagesBase}assets/`,
        )
        .replaceAll(
          'href:"/"',
          `href:"${githubPagesBase}#/"`,
        )
        .replaceAll(
          '"/site.webmanifest"',
          `"${githubPagesBase}site.webmanifest"`,
        );
      if (rewritten !== source) writeFileSync(file, rewritten);
    }
  };

  rewritePublicPaths(client);

  const manifestPath = path.join(client, "site.webmanifest");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.start_url = `${githubPagesBase}#/`;
    manifest.scope = githubPagesBase;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  copyFileSync(index, path.join(client, "404.html"));
  writeFileSync(path.join(client, ".nojekyll"), "");

  console.log(
    `Prepared GitHub Pages build at ${githubPagesBase}: dist/client`,
  );
} else {
  for (const file of [worker, hosting]) {
    if (!existsSync(file)) {
      throw new Error("Missing Sites build input: " + file);
    }
  }

  mkdirSync(path.join(dist, "server"), { recursive: true });
  mkdirSync(path.join(dist, ".openai"), { recursive: true });
  copyFileSync(worker, path.join(dist, "server", "index.js"));
  copyFileSync(hosting, path.join(dist, ".openai", "hosting.json"));

  console.log(
    "Prepared Sites build: dist/server/index.js and dist/.openai/hosting.json",
  );
}
