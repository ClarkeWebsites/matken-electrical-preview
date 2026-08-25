import { defineConfig, devices } from "@playwright/test";

const ci = Boolean(process.env.CI);
const pagesMode = process.env.MATKEN_E2E_MODE === "pages";
const serverOrigin = pagesMode
  ? "http://127.0.0.1:4176"
  : "http://127.0.0.1:4175";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: ci,
  failOnFlakyTests: ci,
  retries: ci ? 1 : 0,
  workers: ci ? 2 : undefined,
  timeout: 35_000,
  expect: {
    timeout: 8_000,
  },
  outputDir: ci
    ? "test-results/playwright"
    : "/tmp/matken-playwright-results",
  reporter: ci
    ? [
        ["line"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ]
    : [
        ["list"],
        [
          "html",
          { open: "never", outputFolder: "/tmp/matken-playwright-report" },
        ],
      ],
  use: {
    baseURL: serverOrigin,
    colorScheme: "light",
    locale: "en-JM",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    timezoneId: "America/Jamaica",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: pagesMode ? "npm run preview:pages" : "npm run dev:e2e",
    url: pagesMode
      ? `${serverOrigin}/matken-electrical-preview/`
      : `${serverOrigin}/`,
    reuseExistingServer: !ci,
    timeout: 45_000,
  },
  projects: [
    {
      name: "desktop-1440",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-390",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "webkit-iphone-smoke",
      testMatch: /routing-and-links\.spec\.js/,
      use: {
        ...devices["iPhone 13"],
        browserName: "webkit",
      },
    },
  ],
});
