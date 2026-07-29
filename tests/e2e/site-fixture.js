import { expect } from "@playwright/test";

export const pagesMode = process.env.MATKEN_E2E_MODE === "pages";
export const pagesBase = "/matken-electrical-preview/";

export const supportedRoutes = [
  "/",
  "/services",
  "/services/solar",
  "/services/electrical",
  "/services/construction",
  "/planner",
  "/request",
  "/project-pack",
  "/pay-invoice",
  "/project-status",
  "/resources",
  "/resources/solar-consultation-checklist",
  "/resources/outage-priority-list",
  "/resources/electrical-request-photos",
  "/resources/construction-scope-starter",
  "/about",
  "/privacy",
  "/terms",
];

export const routeUrl = (route = "/") => {
  const normalized = route.startsWith("/") ? route : `/${route}`;
  return pagesMode ? `${pagesBase}#${normalized}` : normalized;
};

export function watchPageHealth(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push(
      `${request.method()} ${request.url()}: ${
        request.failure()?.errorText || "failed"
      }`,
    );
  });

  return () => {
    expect(consoleErrors, "browser console errors").toEqual([]);
    expect(pageErrors, "uncaught page errors").toEqual([]);
    expect(failedRequests, "failed browser requests").toEqual([]);
  };
}

export async function openStablePage(page, route) {
  const response = await page.goto(routeUrl(route), { waitUntil: "load" });
  if (response) {
    expect(response.ok(), `${route} did not return a successful app shell`).toBe(
      true,
    );
  } else {
    expect(
      pagesMode,
      `${route} changed without a document response outside HashRouter mode`,
    ).toBe(true);
  }
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page).toHaveTitle(/\S+/);
}

export async function expectNoHorizontalOverflow(page, route) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));
  expect(overflow, `${route} has horizontal overflow`).toEqual({
    body: 0,
    document: 0,
  });
}
