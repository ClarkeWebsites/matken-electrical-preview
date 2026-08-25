import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  projectPhotoSlugFor,
  validatePublicationManifest,
  webpDimensions,
} from "./project-photo-manifest.mjs";

const workspaceRoot = process.cwd();
const sourceDirectory = join(workspaceRoot, "pictures and videos");
const reviewDirectory = join(sourceDirectory, "00-client-review");
const manifestFile = join(reviewDirectory, "PHOTO_PUBLICATION_MANIFEST.json");
const outputDirectory = join(workspaceRoot, "public", "assets", "projects");
const thumbnailDirectory = join(outputDirectory, "thumbs");
const optimizedAssetDirectory = join(
  workspaceRoot,
  "public",
  "assets",
  "optimized",
);
const dataFile = join(workspaceRoot, "src", "data", "approvedProjectPhotos.js");
const temporaryDirectory = join(tmpdir(), `matken-project-photos-${process.pid}`);
const stagedOutputDirectory = join(temporaryDirectory, "projects");
const stagedThumbnailDirectory = join(stagedOutputDirectory, "thumbs");
const stagedDataFile = join(temporaryDirectory, "approvedProjectPhotos.js");
const stagedHomepageHero = join(temporaryDirectory, "matken-project-hero-960.webp");

const run = (command, arguments_) =>
  execFileSync(command, arguments_, {
    stdio: ["ignore", "ignore", "inherit"],
  });

const fileHash = (file) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

const syncGeneratedWebps = (stagedDirectory, targetDirectory, expectedNames) => {
  mkdirSync(targetDirectory, { recursive: true });
  for (const filename of expectedNames) {
    copyFileSync(join(stagedDirectory, filename), join(targetDirectory, filename));
  }

  const staleNames = readdirSync(targetDirectory).filter(
    (filename) => filename.endsWith(".webp") && !expectedNames.has(filename),
  );
  for (const filename of staleNames) {
    rmSync(join(targetDirectory, filename));
  }
  return staleNames;
};

if (!existsSync(manifestFile)) {
  throw new Error(`Missing project-photo publication manifest: ${manifestFile}`);
}

const manifest = validatePublicationManifest(
  JSON.parse(readFileSync(manifestFile, "utf8")),
);
const homepageHero = manifest.photos.find((photo) => photo.homepageHero === true);

mkdirSync(stagedOutputDirectory, { recursive: true });
mkdirSync(stagedThumbnailDirectory, { recursive: true });

try {
  const records = [];
  const fullHashes = new Map();
  const thumbnailHashes = new Map();
  const expectedNames = new Set();

  manifest.photos.forEach((photo, index) => {
    const source = join(sourceDirectory, photo.source);
    if (!existsSync(source) || !lstatSync(source).isFile()) {
      throw new Error(
        `Approved source photo is missing or not a regular file: ${photo.source}`,
      );
    }

    const slug = projectPhotoSlugFor(photo.source);
    const filename = `${slug}.webp`;
    const resizedJpeg = join(temporaryDirectory, `${index + 1}.jpg`);
    const thumbnailJpeg = join(temporaryDirectory, `${index + 1}-thumb.jpg`);
    const output = join(stagedOutputDirectory, filename);
    const thumbnailOutput = join(stagedThumbnailDirectory, filename);

    run("sips", [
      "--resampleHeightWidthMax",
      "1440",
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      "82",
      source,
      "--out",
      resizedJpeg,
    ]);
    run("cwebp", ["-quiet", "-q", "78", resizedJpeg, "-o", output]);
    run("sips", [
      "--resampleHeightWidthMax",
      "640",
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      "76",
      source,
      "--out",
      thumbnailJpeg,
    ]);
    run("cwebp", [
      "-quiet",
      "-q",
      "70",
      thumbnailJpeg,
      "-o",
      thumbnailOutput,
    ]);

    const fullHash = fileHash(output);
    const thumbnailHash = fileHash(thumbnailOutput);
    const duplicateFull = fullHashes.get(fullHash);
    const duplicateThumbnail = thumbnailHashes.get(thumbnailHash);
    if (duplicateFull || duplicateThumbnail) {
      const duplicate = duplicateFull || duplicateThumbnail;
      throw new Error(
        `Approved photos ${duplicate.source} and ${photo.source} produce duplicate public derivatives. Keep only one canonical manifest record.`,
      );
    }
    fullHashes.set(fullHash, photo);
    thumbnailHashes.set(thumbnailHash, photo);

    const fullDimensions = webpDimensions(readFileSync(output));
    const thumbnailDimensions = webpDimensions(readFileSync(thumbnailOutput));
    expectedNames.add(filename);
    records.push({
      id: photo.id,
      src: `/assets/projects/${filename}`,
      alt: photo.altText || "",
      altStatus: photo.altText === null ? "pending" : "approved",
      featured: photo.featured === true,
      width: fullDimensions.width,
      height: fullDimensions.height,
      thumbnailWidth: thumbnailDimensions.width,
      thumbnailHeight: thumbnailDimensions.height,
    });
  });

  const homepageHeroJpeg = join(temporaryDirectory, "homepage-hero-960.jpg");
  run("sips", [
    "--resampleHeightWidthMax",
    "960",
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    "80",
    join(sourceDirectory, homepageHero.source),
    "--out",
    homepageHeroJpeg,
  ]);
  run("cwebp", [
    "-quiet",
    "-q",
    "76",
    homepageHeroJpeg,
    "-o",
    stagedHomepageHero,
  ]);

  const generatedRecords = records.map(
    (record) => `  Object.freeze(${JSON.stringify(record)}),`,
  );
  const generatedSource = [
    "/* Generated by npm run photos:publish from the explicit publication manifest. */",
    "export const approvedProjectPhotos = Object.freeze([",
    ...generatedRecords,
    "]);",
    "",
  ].join("\n");
  writeFileSync(stagedDataFile, generatedSource);

  const staleFullNames = syncGeneratedWebps(
    stagedOutputDirectory,
    outputDirectory,
    expectedNames,
  );
  const staleThumbnailNames = syncGeneratedWebps(
    stagedThumbnailDirectory,
    thumbnailDirectory,
    expectedNames,
  );
  mkdirSync(optimizedAssetDirectory, { recursive: true });
  copyFileSync(
    stagedHomepageHero,
    join(optimizedAssetDirectory, "matken-project-hero-960.webp"),
  );
  copyFileSync(stagedDataFile, dataFile);

  console.log(
    `Published ${records.length} explicitly approved, unique project photos.`,
  );
  console.log(
    `Removed ${staleFullNames.length + staleThumbnailNames.length} stale generated derivatives.`,
  );
} finally {
  if (existsSync(temporaryDirectory)) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}
