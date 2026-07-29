import assert from "node:assert/strict";

const origin = (process.env.SITE_ORIGIN || "http://127.0.0.1:4173").replace(
  /\/+$/,
  "",
);
const timeoutMilliseconds = 10_000;
const routes = [
  "/",
  "/services",
  "/services/solar",
  "/planner",
  "/request",
  "/pay-invoice",
  "/resources",
  "/about",
  "/privacy",
  "/terms",
];
const assets = [
  {
    path: "/assets/optimized/matken-hero-solar-640.webp",
    contentType: "image/webp",
  },
  {
    path: "/assets/optimized/service-electrical-640.webp",
    contentType: "image/webp",
  },
  {
    path: "/assets/optimized/service-construction-640.webp",
    contentType: "image/webp",
  },
  {
    path: "/assets/matken-contact.vcf",
    includes: "BEGIN:VCARD",
  },
];

const inspectRoute = async (path) => {
  const response = await fetch(new URL(path, `${origin}/`), {
    headers: { Accept: "text/html" },
    signal: AbortSignal.timeout(timeoutMilliseconds),
  });
  const body = await response.text();

  assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
  assert.match(body, /<div id="root"><\/div>/, `${path} has no app root`);
  assert.match(
    body,
    /noindex, nofollow, noarchive/,
    `${path} lost the prototype noindex guard`,
  );
  return `200 ${path}`;
};

const inspectAsset = async ({ path, contentType, includes }) => {
  const response = await fetch(new URL(path, `${origin}/`), {
    signal: AbortSignal.timeout(timeoutMilliseconds),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());

  assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
  if (contentType) {
    assert.match(
      response.headers.get("content-type") || "",
      new RegExp(`^${contentType.replace("/", "\\/")}`),
      `${path} has the wrong content type`,
    );
  }
  assert.ok(bytes.byteLength > 32, `${path} is unexpectedly empty`);
  if (includes) {
    assert.match(
      new TextDecoder().decode(bytes),
      new RegExp(includes),
      `${path} is missing expected content`,
    );
  }
  return `200 ${path}`;
};

const results = await Promise.all([
  ...routes.map(inspectRoute),
  ...assets.map(inspectAsset),
]);

console.log(
  `PASS: local Matken preview responded on ${results.length} checked surfaces at ${origin}`,
);
for (const result of results) console.log(`- ${result}`);
