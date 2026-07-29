import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  openStablePage,
  pagesBase,
  pagesMode,
  supportedRoutes,
  watchPageHealth,
} from "./site-fixture.js";

test.describe("route, asset, and base-path integrity", () => {
  test.describe.configure({ timeout: 90_000 });

  test("renders every supported route without runtime or layout failure", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);

    for (const route of supportedRoutes) {
      await openStablePage(page, route);
      await expectNoHorizontalOverflow(page, route);
    }

    assertHealthy();
  });

  test("keeps every internal link and public asset inside the selected base", async ({
    page,
    request,
  }) => {
    const assertHealthy = watchPageHealth(page);
    const references = [];

    for (const route of supportedRoutes) {
      await openStablePage(page, route);
      const routeReferences = await page.evaluate(() => {
        const values = [
          ...Array.from(
            document.querySelectorAll(
              'a[href], img[src], link[rel="icon"][href], link[rel="manifest"][href]',
            ),
            (element) =>
              element.getAttribute("href") || element.getAttribute("src"),
          ),
          ...Array.from(document.querySelectorAll("source[srcset]"), (source) =>
            (source.getAttribute("srcset") || "")
              .split(",")
              .map((candidate) => candidate.trim().split(/\s+/)[0]),
          ).flat(),
        ];
        return [...new Set(values.filter(Boolean))];
      });
      references.push(
        ...routeReferences.map((reference) => ({
          from: route,
          pageUrl: page.url(),
          reference,
        })),
      );
    }

    const supportedRouteSet = new Set(supportedRoutes);
    const fetchableAssets = new Set();
    for (const { from, pageUrl, reference } of references) {
      if (
        reference.startsWith("tel:") ||
        reference.startsWith("mailto:") ||
        reference.startsWith("#")
      ) {
        continue;
      }

      const resolved = new URL(reference, pageUrl);
      if (resolved.origin !== new URL(pageUrl).origin) continue;

      if (pagesMode) {
        expect(
          resolved.pathname.startsWith(pagesBase),
          `${reference} on ${from} escaped the GitHub Pages repository base`,
        ).toBe(true);
      }

      if (
        resolved.pathname.includes("/assets/") ||
        resolved.pathname.endsWith("/site.webmanifest") ||
        /\.[a-z0-9]+$/i.test(resolved.pathname)
      ) {
        fetchableAssets.add(resolved.href);
        continue;
      }

      const internalRoute = pagesMode
        ? resolved.hash.startsWith("#/")
          ? new URL(resolved.hash.slice(1), resolved.origin).pathname
          : null
        : resolved.pathname;
      if (!internalRoute) continue;

      const normalizedRoute =
        internalRoute.length > 1
          ? internalRoute.replace(/\/+$/, "")
          : internalRoute;
      expect(
        supportedRouteSet.has(normalizedRoute),
        `${reference} on ${from} points to an unsupported route`,
      ).toBe(true);
    }

    for (const asset of fetchableAssets) {
      const response = await request.get(asset);
      expect(response.ok(), `${asset} did not load`).toBe(true);
    }

    assertHealthy();
  });
});
