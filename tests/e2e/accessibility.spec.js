import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openStablePage, watchPageHealth } from "./site-fixture.js";

const auditedRoutes = [
  "/",
  "/planner",
  "/request",
  "/project-pack",
  "/pay-invoice",
  "/project-status",
];

const formatViolations = (violations) =>
  violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.nodes
          .map((node) => node.target.join(" "))
          .join(", ")}`,
    )
    .join("\n");

test.describe("WCAG automated checks", () => {
  for (const route of auditedRoutes) {
    test(`${route} has no detectable WCAG A or AA violations`, async ({
      page,
    }) => {
      const assertHealthy = watchPageHealth(page);
      await openStablePage(page, route);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(
        results.violations,
        formatViolations(results.violations),
      ).toEqual([]);
      assertHealthy();
    });
  }
});
