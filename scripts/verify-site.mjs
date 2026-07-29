import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const requiredFiles = [
  "index.html",
  "src/App.jsx",
  "src/styles.css",
  "src/data/site.js",
  "src/lib/providerConfig.js",
  "src/pages/HomePage.jsx",
  "src/pages/ServicesPage.jsx",
  "src/pages/PlannerPage.jsx",
  "src/pages/RequestPage.jsx",
  "src/pages/InvoicePage.jsx",
  "src/pages/ContentPages.jsx",
  "public/assets/matken-logo-source.png",
  "public/assets/matken-hero-solar.jpg",
  "public/assets/service-electrical.jpg",
  "public/assets/service-construction.jpg",
  "public/assets/optimized/matken-hero-solar-640.webp",
  "public/assets/optimized/matken-hero-solar-960.webp",
  "public/assets/optimized/matken-hero-solar-1440.webp",
  "public/assets/optimized/service-electrical-640.webp",
  "public/assets/optimized/service-electrical-960.webp",
  "public/assets/optimized/service-electrical-1440.webp",
  "public/assets/optimized/service-construction-640.webp",
  "public/assets/optimized/service-construction-960.webp",
  "public/assets/optimized/service-construction-1440.webp",
  "public/assets/matken-contact.vcf",
  "public/assets/fonts/dm-sans-variable.woff2",
  "public/assets/fonts/manrope-variable.woff2",
  "public/robots.txt",
  ".env.example",
];

const requiredRoutes = [
  'path="services"',
  'path="services/:slug"',
  'path="planner"',
  'path="request"',
  'path="pay-invoice"',
  'path="resources"',
  'path="resources/:slug"',
  'path="about"',
  'path="privacy"',
  'path="terms"',
];

const forbiddenPatterns = [
  /\blorem\b/i,
  /\bipsum\b/i,
  /same[- ]day service/i,
  /licensed and insured/i,
  /\b\d+\+ years\b/i,
  /\b\d+ completed projects\b/i,
  /guaranteed savings/i,
];

const sourceFiles = requiredFiles.filter((file) =>
  /\.(?:html|js|jsx|css)$/.test(file),
);

for (const file of requiredFiles) {
  await access(path.join(root, file));
}

const appSource = await readFile(path.join(root, "src/App.jsx"), "utf8");
for (const route of requiredRoutes) {
  if (!appSource.includes(route)) {
    throw new Error(`Missing required route contract: ${route}`);
  }
}

const combinedSource = (
  await Promise.all(
    sourceFiles.map((file) => readFile(path.join(root, file), "utf8")),
  )
).join("\n");

for (const pattern of forbiddenPatterns) {
  if (pattern.test(combinedSource)) {
    throw new Error(`Forbidden or unverified copy pattern found: ${pattern}`);
  }
}

if (!combinedSource.includes("Representative editorial image")) {
  throw new Error("Representative image disclosure is missing.");
}

if (!combinedSource.includes("It has not been transmitted")) {
  throw new Error("Preview request-delivery truth is missing.");
}

if (!combinedSource.includes("No public invoice-number lookup")) {
  throw new Error("Invoice privacy contract is missing.");
}

const envExample = await readFile(path.join(root, ".env.example"), "utf8");
if (
  !envExample.includes("VITE_REQUEST_ENDPOINT=\n") ||
  !envExample.includes("VITE_INVOICE_LOOKUP_ENDPOINT=\n")
) {
  throw new Error("Provider endpoints must remain blank in .env.example.");
}

const indexSource = await readFile(path.join(root, "index.html"), "utf8");
const robotsSource = await readFile(
  path.join(root, "public/robots.txt"),
  "utf8",
);
if (
  !indexSource.includes('content="noindex, nofollow, noarchive"') ||
  !robotsSource.includes("Disallow: /")
) {
  throw new Error("The unapproved prototype must remain non-indexable.");
}

console.log(
  `Verified ${requiredFiles.length} required files, ${requiredRoutes.length} routes, provider gates, and evidence-safe copy guards.`,
);
