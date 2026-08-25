import { expect, test } from "@playwright/test";
import {
  openStablePage,
  pagesBase,
  pagesMode,
  watchPageHealth,
} from "./site-fixture.js";

test.describe("Matken core customer journeys", () => {
  test("builds a private Blueprint and carries it into Request", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/");
    await page.waitForTimeout(250);
    expect(
      await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .some((entry) => entry.name.includes("ProjectBlueprint")),
      ),
    ).toBe(false);

    await page.getByRole("button", { name: "Start my blueprint" }).click();
    await page
      .getByRole("radio", {
        name: "Keep essentials on during outages",
      })
      .check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("radio", { name: "Home", exact: true }).check();
    await page.getByRole("radio", { name: "Planning", exact: true }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page
      .getByRole("checkbox", {
        name: "Recent electricity bills or monthly kWh totals",
      })
      .check();
    await page.getByRole("button", { name: "Create my blueprint" }).click();

    await expect(
      page.getByRole("heading", {
        name: "Your Matken Project Blueprint",
        exact: true,
      }),
    ).toBeFocused();
    await page
      .getByRole("link", { name: "Use this blueprint in my request" })
      .click();

    await expect(
      page.getByRole("heading", {
        name: "Give the project a useful starting point.",
      }),
    ).toBeVisible();
    await expect(page.getByText("Your private Project Blueprint was applied"))
      .toBeVisible();
    await expect(
      page.getByRole("button", { name: /Solar & storage/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("combobox", { name: "Property type" }))
      .toHaveValue("Home");
    assertHealthy();
  });

  test("copies a router-safe Planner link and restores its inputs", async ({
    context,
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    const expectedOrigin = pagesMode
      ? "http://127.0.0.1:4176"
      : "http://127.0.0.1:4175";
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: expectedOrigin,
    });
    await openStablePage(page, "/planner");

    const monthlyUsage = page.getByRole("slider", {
      name: /Monthly electricity use/i,
    });
    await monthlyUsage.fill("780");
    await expect(monthlyUsage).toHaveValue("780");
    await page.getByRole("button", { name: "Copy plan link" }).click();

    const copiedUrl = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    const copied = new URL(copiedUrl);
    expect(copied.origin).toBe(expectedOrigin);
    if (pagesMode) {
      expect(copied.pathname).toBe(pagesBase);
      const routed = new URL(copied.hash.slice(1), expectedOrigin);
      expect(routed.pathname).toBe("/planner");
      expect(routed.searchParams.get("monthly")).toBe("780");
      expect(routed.searchParams.get("essential")).toMatch(/^\d+(?:\.\d+)?$/);
      expect(routed.searchParams.get("hours")).toMatch(/^\d+$/);
      expect(routed.searchParams.get("panel")).toMatch(/^\d+$/);
    } else {
      expect(copied.pathname).toBe("/planner");
      expect(copied.searchParams.get("monthly")).toBe("780");
    }
    expect(copiedUrl).not.toMatch(/name|email|phone|loadPlan|refrigeration/i);

    await page.goto(copiedUrl, { waitUntil: "load" });
    await expect(
      page.getByRole("slider", { name: /Monthly electricity use/i }),
    ).toHaveValue("780");
    assertHealthy();
  });

  test("turns a Planner result into a downloadable private Project Pack", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/planner");

    await page.getByRole("link", { name: "Add to Project Pack" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Bring the whole project conversation into one pack.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /4\.2 kW solar · 10\.0 kWh battery/i,
      }),
    ).toBeVisible();

    const downloadStarted = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download Project Pack" })
      .click();
    const download = await downloadStarted;
    expect(download.suggestedFilename()).toBe("matken-project-pack.html");
    assertHealthy();
  });

  test("preserves all four Project Pack sections through the request handoff", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/");

    await page.getByRole("button", { name: "Start my blueprint" }).click();
    await page
      .getByRole("radio", {
        name: "Keep essentials on during outages",
      })
      .check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("radio", { name: "Home", exact: true }).check();
    await page.getByRole("radio", { name: "Planning", exact: true }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page
      .getByRole("checkbox", {
        name: "Recent electricity bills or monthly kWh totals",
      })
      .check();
    await page.getByRole("button", { name: "Create my blueprint" }).click();
    await page.getByRole("link", { name: "Add to Project Pack" }).click();

    await expect(page.getByText("01 · Project Blueprint")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Keep essentials on during outages",
      }),
    ).toBeVisible();

    await openStablePage(page, "/planner");
    await page.getByRole("link", { name: "Add to Project Pack" }).click();
    await expect(page.getByText("01 · Project Blueprint")).toBeVisible();
    await expect(
      page.getByText("02 · Educational planning range"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /4\.2 kW solar · 10\.0 kWh battery/i,
      }),
    ).toBeVisible();

    await openStablePage(page, "/request");
    await page
      .getByRole("button", { name: /Electrical/i })
      .first()
      .click();
    await page.getByRole("combobox", { name: "Property type" }).selectOption(
      "Home",
    );
    await page.getByRole("combobox", { name: "Parish" }).selectOption(
      "Saint Andrew",
    );
    await page.getByRole("button", { name: "Continue" }).click();
    await page
      .getByRole("checkbox", {
        name: "Affected rooms, circuits, or equipment identified",
      })
      .check();
    await page
      .getByRole("button", { name: "Within a few months" })
      .click();
    await page
      .getByRole("textbox", { name: /^Project details/ })
      .fill(
        "We need a non-emergency electrical upgrade review for several rooms in our home.",
      );
    await page.getByRole("button", { name: "Continue" }).click();
    await page
      .getByRole("textbox", { name: "Name" })
      .fill("Full Pack Customer");
    await page
      .getByRole("textbox", { name: "Phone" })
      .fill("(876) 555-0101");
    await page
      .getByRole("checkbox", {
        name: /Matken may contact me about this service request/i,
      })
      .check();
    await page.getByRole("button", { name: "Review request" }).click();
    await page
      .getByRole("button", { name: "Prepare request summary" })
      .click();
    await page.getByRole("button", { name: "Open Project Pack" }).click();

    await expect(page.getByText("01 · Project Blueprint")).toBeVisible();
    await expect(
      page.getByText("02 · Educational planning range"),
    ).toBeVisible();
    await expect(page.getByText("03 · Readiness")).toBeVisible();
    await expect(page.getByText("04 · Request summary")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Keep essentials on during outages",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /4\.2 kW solar · 10\.0 kWh battery/i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Full Pack Customer/)).toBeVisible();
    await expect(
      page.getByText("Affected rooms, circuits, or equipment identified", {
        exact: true,
      }),
    ).toBeVisible();

    const serializedHistoryState = await page.evaluate(() =>
      JSON.stringify(window.history.state),
    );
    expect(serializedHistoryState).not.toContain("Full Pack Customer");
    expect(serializedHistoryState).not.toContain("555-0101");
    expect(serializedHistoryState).not.toContain("requestTransferKey");

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("01 · Project Blueprint")).toBeVisible();
    await expect(
      page.getByText("02 · Educational planning range"),
    ).toBeVisible();
    await expect(page.getByText("03 · Readiness")).toBeVisible();
    await expect(page.getByText("04 · Request summary")).toHaveCount(0);
    await expect(page.getByText(/Full Pack Customer/)).toHaveCount(0);
    assertHealthy();
  });

  test("reviews a service-specific request while photos remain local", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/request");

    await page
      .getByRole("button", { name: /Electrical/i })
      .first()
      .click();
    await page.getByRole("combobox", { name: "Property type" }).selectOption(
      "Home",
    );
    await page.getByRole("combobox", { name: "Parish" }).selectOption(
      "Saint Andrew",
    );
    await page.getByRole("button", { name: "Continue" }).click();
    await page
      .getByRole("button", { name: "Within a few months" })
      .click();
    await page
      .getByRole("textbox", { name: /^Project details/ })
      .fill(
        "We need a non-emergency review of an electrical upgrade for our home.",
      );

    const onePixelPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "panel-context.png",
      mimeType: "image/png",
      buffer: onePixelPng,
    });
    await expect(page.getByText("panel-context.png")).toBeVisible();
    await expect(page.getByText("Local only")).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("textbox", { name: "Name" }).fill("A Customer");
    await page
      .getByRole("textbox", { name: "Phone" })
      .fill("(876) 555-0101");
    await page
      .getByRole("checkbox", {
        name: /Matken may contact me about this service request/i,
      })
      .check();
    await page.getByRole("button", { name: "Review request" }).click();

    await expect(
      page.getByText("Check every detail before the final action."),
    ).toBeFocused();
    await expect(
      page.getByText(/1 local photo preview/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Photos stay on this device/i),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Prepare request summary" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Your request is organized and ready to share.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/local photo preview stayed on this device/i),
    ).toBeVisible();

    await page.getByRole("button", { name: "Open Project Pack" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Bring the whole project conversation into one pack.",
      }),
    ).toBeVisible();
    await expect(page.getByText(/A Customer/)).toBeVisible();
    const serializedHistoryState = await page.evaluate(() =>
      JSON.stringify(window.history.state),
    );
    expect(serializedHistoryState).not.toContain("A Customer");
    expect(serializedHistoryState).not.toContain("555-0101");
    assertHealthy();
  });

  test("keeps invoice access generic while the provider is gated", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/pay-invoice");

    await page.getByLabel("Invoice reference").fill("MKN-INV-0000");
    await page.getByLabel("Billing email").fill("client@example.com");
    await page.getByRole("button", { name: "Request secure access" }).click();

    await expect(
      page.getByText(
        /Online invoice access is not connected in this prototype/i,
      ),
    ).toBeVisible();
    await expect(
      page.getByText(/No public invoice-number lookup/i),
    ).toBeVisible();
    assertHealthy();
  });

  test("keeps project tracking private while the provider is gated", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/project-status");

    await page.getByLabel("Project reference").fill("MKN-PROJECT-001");
    await page.getByLabel("Project email").fill("client@example.com");
    await page.getByRole("button", { name: "Send one-time link" }).click();

    await expect(
      page.getByText(
        /Project tracking is not connected in this prototype/i,
      ),
    ).toBeVisible();
    await expect(
      page.getByText(/No project lookup was performed and no message was sent/i),
    ).toBeVisible();
    assertHealthy();
  });

  test("opens private search and reaches a matching service route", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/");
    await expect(
      page.locator('header a[href*="pay-invoice"], footer a[href*="pay-invoice"], header a[href*="project-status"], footer a[href*="project-status"]'),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Search this website" }).click();
    const searchbox = page.getByRole("searchbox", {
      name: "Search this website",
    });
    await searchbox.fill("invoice payment");
    await expect(
      page.locator('.site-search-dialog a[href*="pay-invoice"], .site-search-dialog a[href*="project-status"]'),
    ).toHaveCount(0);
    await searchbox.fill("battery backup");
    await page
      .getByRole("link", { name: /Solar & storage/i })
      .first()
      .click();

    await expect(page).toHaveURL(
      pagesMode
        ? new RegExp(`${pagesBase.replaceAll("/", "\\/")}#\\/services\\/solar$`)
        : /\/services\/solar$/,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Solar & storage" }),
    ).toBeVisible();
    assertHealthy();
  });

  test("keeps live-call and private-tool copy across public routes", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    for (const route of ["/", "/services", "/planner", "/request", "/about"]) {
      await openStablePage(page, route);
      await expect(
        page.getByText(/The verified public number is live/).first(),
      ).toBeVisible();
    }
    assertHealthy();
  });

  test("recovers from a missing page without implying delivery", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/this-page-does-not-exist");
    await expect(page).toHaveTitle(/Page not found/);
    await expect(
      page.locator(".not-found").getByRole("link", { name: /Call \(876\) 568-2616/ }),
    ).toBeVisible();
    await expect(
      page.locator(".not-found").getByRole("link", { name: /Prepare a request/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/The verified public number is live/).first(),
    ).toBeVisible();
    assertHealthy();
  });

  test("publishes the approved project gallery without performance claims", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/");
    await page.waitForTimeout(250);
    expect(
      await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .some((entry) => entry.name.includes("ApprovedProjectGallery")),
      ),
    ).toBe(false);
    await page.getByTestId("approved-gallery-trigger").scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("heading", {
        name: /A closer look at approved project photography/i,
      }),
    ).toBeVisible();
    await expect(page.locator(".approved-photo-grid img")).toHaveCount(12);
    await expect(page.locator(".approved-photo-grid img").first()).toHaveAttribute(
      "src",
      /\/assets\/projects\/thumbs\//,
    );
    await page
      .getByRole("button", {
        name: /Open project photograph 1 of \d+/i,
      })
      .click();
    await expect(page.getByRole("dialog", { name: /Photo 1 of \d+/i })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("dialog", { name: /Photo 2 of \d+/i })).toBeVisible();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("button", { name: "Next photo" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: /Open project photograph 1 of \d+/i,
      }),
    ).toBeFocused();
    await page
      .getByRole("button", {
        name: /Open project photograph 1 of \d+/i,
      })
      .click();
    await expect(page.getByRole("dialog", { name: /Photo 1 of \d+/i })).toBeVisible();
    await page.locator(".gallery-photo-viewer").click({ position: { x: 8, y: 8 } });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: /Open project photograph 1 of \d+/i,
      }),
    ).toBeFocused();
    await page
      .getByRole("button", {
        name: /Show 12 more approved photos \(12 of \d+\)/i,
      })
      .click();
    await expect(page.locator(".approved-photo-grid img")).toHaveCount(24);
    await expect(
      page.getByRole("button", {
        name: /Show 12 more approved photos \(24 of \d+\)/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/without unverified project specifications, outcomes, or performance claims/i),
    ).toBeVisible();
    assertHealthy();
  });

  test("offers a live call and private request from a service page", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/services/solar");
    await expect(
      page.getByRole("link", { name: /Prepare a solar request/i }),
    ).toHaveAttribute("href", /request\?service=solar/);
    await expect(
      page.locator(".service-detail-copy").getByRole("link", {
        name: /Call \(876\) 568-2616/,
      }),
    ).toHaveAttribute("href", "tel:+18765682616");
    await expect(page.getByText(/What happens next/i)).toBeVisible();
    assertHealthy();
  });

  test("explains missing request fields before the form can continue", async ({
    page,
  }) => {
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/request");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByText(/Fix 3 items before continuing/i),
    ).toBeVisible();
    await expect(page.getByText("Choose a primary service.")).toBeVisible();
    await expect(page.locator(".mobile-action-bar")).toHaveCount(0);
    assertHealthy();
  });

  test("keeps mobile navigation usable within the viewport", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-390", "mobile layout check");
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/");
    await page.getByRole("button", { name: "Open navigation" }).click();

    const menu = page.getByRole("dialog", { name: "Site navigation" });
    await expect(menu).toBeVisible();
    await expect(page.locator(".mobile-action-bar")).toBeHidden();
    const geometry = await menu.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        viewportHeight: window.innerHeight,
      };
    });
    expect(geometry.clientHeight).toBeGreaterThan(geometry.viewportHeight * 0.7);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    expect(geometry.scrollHeight).toBeGreaterThanOrEqual(geometry.clientHeight);

    const finalLink = menu.getByRole("link", { name: "Project Pack" }).last();
    await finalLink.scrollIntoViewIfNeeded();
    await expect(finalLink).toBeVisible();
    assertHealthy();
  });

  test("keeps mobile request actions clear of the parish field", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-390", "mobile layout check");
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/request");
    await page.locator("form.request-form").scrollIntoViewIfNeeded();

    const geometry = await page.evaluate(() => {
      const parish = document.querySelector('[data-request-field="parish"]');
      const actions = document.querySelector(".form-actions");
      const parishRect = parish?.getBoundingClientRect();
      const actionsRect = actions?.getBoundingClientRect();
      if (!parishRect || !actionsRect) return null;
      return {
        actionPosition: getComputedStyle(actions).position,
        actionsTop: actionsRect.top,
        overlap: Math.max(
          0,
          Math.min(parishRect.bottom, actionsRect.bottom) -
            Math.max(parishRect.top, actionsRect.top),
        ),
        parishBottom: parishRect.bottom,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry.actionPosition).toBe("static");
    expect(geometry.overlap).toBe(0);
    expect(geometry.parishBottom).toBeLessThanOrEqual(geometry.actionsTop);
    await page.locator(".form-actions").scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
    assertHealthy();
  });

  test("labels shared request links as preparation", async ({ page }) => {
    const assertHealthy = watchPageHealth(page);
    await openStablePage(page, "/");
    await expect(
      page.locator('a[href*="request"]', { hasText: "Request service" }),
    ).toHaveCount(0);
    await expect(
      page.locator('.site-header a[href*="request"]', {
        hasText: "Prepare a request",
      }),
    ).toHaveAttribute("href", /request/);
    await expect(
      page.locator('.site-footer a[href*="request"]', {
        hasText: "Prepare a request",
      }),
    ).toHaveCount(2);
    assertHealthy();
  });
});
