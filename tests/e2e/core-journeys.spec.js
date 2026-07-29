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

    await page.getByRole("button", { name: "Search this website" }).click();
    await page
      .getByRole("searchbox", { name: "Search this website" })
      .fill("battery backup");
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
});
