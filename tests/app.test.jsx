import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/App.jsx";
import {
  consultationQuestionsFor,
  normalizeProjectBlueprint,
  serializeProjectBlueprint,
} from "../src/lib/projectBlueprintModel.js";
import {
  calculatePlannerResult,
  createInitialPlannerScenarioState,
  normalizePlannerPayload,
  plannerScenarioReducer,
} from "../src/lib/plannerModel.js";

function renderAt(path, routerState) {
  window.history.replaceState(
    routerState
      ? { usr: routerState, key: "test-route", idx: 0 }
      : {},
    "",
    path,
  );
  return render(<App />);
}

async function reachRequestContactStep(user) {
  await user.click(
    await screen.findByRole("button", { name: /Solar & storage/i }),
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Property type" }),
    "Home",
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Parish" }),
    "Saint James",
  );
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(
    screen.getByText(/Add enough context for a useful follow-up/i),
  ).toHaveFocus();

  await user.click(
    screen.getByRole("button", {
      name: "Planning and comparing options",
    }),
  );
  await user.type(
    screen.getByRole("textbox", { name: /^Project details/ }),
    "We want to plan essential backup power and rooftop solar for our home.",
  );
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByText(/How should Matken follow up/i)).toHaveFocus();
}

describe("Matken planner model", () => {
  it("keeps calculations canonical and cloned plans isolated", () => {
    const result = calculatePlannerResult({
      monthlyKwh: 450,
      essentialKw: 1.2,
      outageHours: 6,
      panelWatts: 450,
    });
    expect(result.dailyKwh).toBe(15);
    expect(result.startingSolarKw).toBeCloseTo(4.1667);
    expect(result.usableBackupKwh).toBeCloseTo(7.2);
    expect(result.nominalBatteryKwh).toBeCloseTo(10);
    expect(result.panelCount).toBe(10);

    let state = createInitialPlannerScenarioState();
    state = plannerScenarioReducer(state, {
      type: "CLONE_ACTIVE",
      id: "plan-b",
    });
    state = plannerScenarioReducer(state, {
      type: "SET_INPUT",
      field: "outageHours",
      value: 12,
    });
    expect(state.scenarios[0].inputs.outageHours).toBe(6);
    expect(state.scenarios[1].inputs.outageHours).toBe(12);

    state = plannerScenarioReducer(state, {
      type: "CLONE_ACTIVE",
      id: "plan-c",
    });
    expect(
      plannerScenarioReducer(state, {
        type: "REMOVE_SCENARIO",
        id: "plan-a",
      }),
    ).toBe(state);
    const rejectedFourthPlan = plannerScenarioReducer(state, {
      type: "CLONE_ACTIVE",
      id: "plan-d",
    });
    expect(rejectedFourthPlan).toBe(state);
    expect(state.scenarios).toHaveLength(3);
  });

  it("sanitizes transferred load details and recomputes derived results", () => {
    const normalized = normalizePlannerPayload({
      monthlyKwh: 450,
      essentialKw: 0.4,
      outageHours: 6,
      panelWatts: 450,
      result: { nominalBatteryKwh: 9999 },
      loadPlan: {
        source: "builder",
        items: [
          { id: "refrigeration", quantity: 2, watts: 200 },
          { id: "refrigeration", quantity: 3, watts: 5000 },
          { id: "unknown-load", quantity: 99, watts: 99999 },
        ],
      },
    });

    expect(normalized.loadPlan.source).toBe("builder");
    expect(normalized.loadPlan.items).toEqual([
      { id: "refrigeration", quantity: 2, watts: 200 },
    ]);
    expect(normalized.loadPlan.totalWatts).toBe(400);
    expect(normalized.result.nominalBatteryKwh).toBeCloseTo(3.3333);
    expect(normalized.result.nominalBatteryKwh).not.toBe(9999);
  });
});

describe("Matken Project Blueprint model", () => {
  it("accepts only a canonical non-contact project handoff", () => {
    const blueprint = normalizeProjectBlueprint({
      version: 1,
      source: "homepage-blueprint",
      goalId: "electrical",
      service: "electrical",
      pathway: "Commercial electrical request",
      propertyType: "Business or office",
      urgency: "Within a few weeks",
      availableContextIds: [
        "affected-area",
        "affected-area",
        "unknown-preparation",
      ],
      name: "Injected Customer",
      phone: "(876) 555-0101",
      email: "injected@example.com",
      serviceConsent: true,
    });

    expect(blueprint).toEqual({
      version: 1,
      source: "homepage-blueprint",
      goalId: "electrical",
      service: "electrical",
      pathway: "Commercial electrical request",
      propertyType: "Business or office",
      urgency: "Within a few weeks",
      availableContextIds: ["affected-area"],
    });
    expect(blueprint).not.toHaveProperty("name");
    expect(blueprint).not.toHaveProperty("phone");
    expect(blueprint).not.toHaveProperty("email");

    const text = serializeProjectBlueprint(blueprint);
    expect(text).toMatch(/MATKEN PROJECT BLUEPRINT/);
    expect(text).toMatch(/Commercial electrical request/);
    expect(text).toMatch(
      /did not automatically send its project answers or preparation selections to Matken/i,
    );
    expect(text).not.toMatch(/Injected Customer|555-0101|injected@example/);
    expect(text).toMatch(/Useful questions for the consultation/i);
    expect(text).toMatch(/Which rooms, circuits, or equipment are affected/i);
    expect(consultationQuestionsFor(blueprint)).toEqual([
      "Is this a new installation, upgrade, or fault?",
      "Is power currently available at the property?",
      "Which rooms, circuits, or equipment are affected?",
      "Is there an urgent safety concern?",
    ]);
    expect(consultationQuestionsFor(null)).toEqual([]);
  });

  it("fails closed when service, pathway, property, or timing drift", () => {
    const base = {
      version: 1,
      source: "homepage-blueprint",
      goalId: "backup",
      service: "solar",
      pathway: "Battery-backup planning",
      propertyType: "Home",
      urgency: "Planning and comparing options",
      availableContextIds: [],
    };

    expect(
      normalizeProjectBlueprint({ ...base, service: "electrical" }),
    ).toBeNull();
    expect(
      normalizeProjectBlueprint({
        ...base,
        pathway: "Solar project consultation",
      }),
    ).toBeNull();
    expect(
      normalizeProjectBlueprint({ ...base, propertyType: "Moon base" }),
    ).toBeNull();
    expect(
      normalizeProjectBlueprint({
        ...base,
        propertyType: "Retail or hospitality",
      }),
    ).toBeNull();
    expect(
      normalizeProjectBlueprint({ ...base, urgency: "Immediately" }),
    ).toBeNull();
  });
});

describe("Matken customer journeys", () => {
  it("shows the optional private Project Pack pieces before any planning is added", async () => {
    window.sessionStorage.clear();
    renderAt("/project-pack");

    expect(
      await screen.findByRole("heading", {
        name: "Bring the whole project conversation into one pack.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("0 of 4 optional pieces added"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Optional")).toHaveLength(4);
    expect(
      screen.getByText(/not a required checklist or a submitted request/i),
    ).toBeInTheDocument();
  });

  it("returns from Project Pack to the private Blueprint entry without starting it", async () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    try {
      renderAt("/", { projectPackMode: true });

      expect(
        await screen.findByRole("button", { name: "Start my blueprint" }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" }),
      );
      expect(
        screen.queryByRole("radio", {
          name: "Resolve or upgrade electrical systems",
        }),
      ).not.toBeInTheDocument();
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("labels the Blueprint return action when updating a private Project Pack", async () => {
    const user = userEvent.setup();
    renderAt("/", { projectPackMode: true, startBlueprint: true });

    await user.click(
      await screen.findByRole("radio", { name: "Plan solar for a property" }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "Home" }));
    await user.click(screen.getByRole("radio", { name: "A few months" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Create my blueprint" }));

    expect(
      await screen.findByRole("link", { name: "Update Project Pack" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /This private Blueprint can update your existing Project Pack/i,
      ),
    ).toHaveAttribute("role", "status");
  });

  it("shows a concise conversation snapshot when a Project Pack has planning details", async () => {
    window.sessionStorage.clear();
    renderAt("/project-pack", {
      blueprint: {
        version: 1,
        source: "homepage-blueprint",
        goalId: "solar",
        service: "solar",
        pathway: "Solar project consultation",
        propertyType: "Home",
        urgency: "Within a few months",
        availableContextIds: ["recent-usage"],
      },
      planner: {
        monthlyKwh: 450,
        essentialKw: 1.2,
        outageHours: 6,
        panelWatts: 450,
      },
      readiness: {
        service: "solar",
        availableContextIds: ["recent-usage"],
      },
    });

    expect(
      await screen.findByRole("heading", {
        name: "The details you chose to organize.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Your private Project Pack was updated with the details you chose/i,
      ),
    ).toHaveAttribute("role", "status");
    expect(screen.getAllByText("Plan solar for a property")).toHaveLength(2);
    expect(screen.getByText("1 of 4 useful items selected")).toBeInTheDocument();
    expect(
      screen.getByText(/does not confirm a quote, appointment, scope/i),
    ).toBeInTheDocument();
  });

  it("asks before clearing private Project Pack details from this tab", async () => {
    const user = userEvent.setup();
    window.sessionStorage.clear();
    renderAt("/project-pack", {
      blueprint: {
        version: 1,
        source: "homepage-blueprint",
        goalId: "solar",
        service: "solar",
        pathway: "Solar project consultation",
        propertyType: "Home",
        urgency: "Within a few months",
        availableContextIds: [],
      },
    });

    await user.click(await screen.findByRole("button", { name: "Clear this pack" }));
    expect(
      screen
        .getByText(/Clear the planning details held in this tab/i)
        .closest(".project-pack-clear-confirmation"),
    ).toHaveAttribute("role", "alert");
    expect(
      screen.queryByText(/Project Pack was updated with the details you chose/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Plan solar for a property" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear this pack now" }));
    expect(
      await screen.findByText(/Project Pack cleared from this tab/i),
    ).toHaveAttribute("role", "status");
    expect(
      screen.getByText("Waiting for details"),
    ).toBeInTheDocument();
  });

  it("carries non-contact Blueprint and planning details from Project Pack into a request", async () => {
    const user = userEvent.setup();
    window.sessionStorage.clear();
    renderAt("/project-pack", {
      blueprint: {
        version: 1,
        source: "homepage-blueprint",
        goalId: "solar",
        service: "solar",
        pathway: "Solar project consultation",
        propertyType: "Home",
        urgency: "Within a few months",
        availableContextIds: ["recent-usage"],
      },
      planner: {
        monthlyKwh: 450,
        essentialKw: 1.2,
        outageHours: 6,
        panelWatts: 450,
      },
      readiness: {
        service: "solar",
        availableContextIds: ["recent-usage"],
      },
    });

    await user.click(
      await screen.findByRole("link", {
        name: /Add readiness and a final summary/i,
      }),
    );

    expect(
      await screen.findByText(/Your private Project Blueprint was applied/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Solar & storage/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("combobox", { name: "Property type" }),
    ).toHaveValue("Home");
    expect(
      screen.getByText(/Planner result attached to this request/i),
    ).toBeInTheDocument();
    expect(window.history.state.usr).not.toHaveProperty("requestSummary");
    expect(window.history.state.usr).not.toHaveProperty("requestReference");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Parish" }),
      "Saint James",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByRole("checkbox", {
        name: "Recent electricity bills or monthly kWh totals",
      }),
    ).toBeChecked();
    expect(
      screen.getByText(
        /1 optional readiness selection was carried from your private Project Pack/i,
      ),
    ).toHaveAttribute("role", "status");
  });

  it("renders the home route with verified service paths", async () => {
    const user = userEvent.setup();
    renderAt("/#/");

    expect(
      await screen.findByRole("heading", {
        name: "Power, projects, and next steps—made clearer.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { name: "Solar & storage" }),
    ).not.toHaveLength(0);
    expect(
      screen.getAllByRole("heading", { name: "Electrical" }),
    ).not.toHaveLength(0);
    expect(
      screen.getAllByRole("heading", { name: "Construction" }),
    ).not.toHaveLength(0);

    const quickActions = screen.getByLabelText("Quick actions");
    const blueprintShortcut = within(quickActions).getByRole("link", {
      name: /Build my Project Blueprint/i,
    });
    expect(blueprintShortcut).toHaveAttribute("href", "#project-blueprint");
    expect(
      within(quickActions).queryByRole("link", {
        name: /Pay an invoice/i,
      }),
    ).not.toBeInTheDocument();

    const heroActions = document.querySelector(".hero-actions");
    expect(
      within(heroActions).getByRole("link", { name: /Prepare a request/i }),
    ).toHaveAttribute("href", "/request");
    expect(
      within(heroActions).getByRole("link", {
        name: /Call \(876\) 568-2616/,
      }),
    ).toHaveAttribute("href", "tel:+18765682616");
    expect(
      screen.getAllByText(/The verified public number is live/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /Does filling in the request form send my details to Matken/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /A closer look at approved project photography/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("img", {
        name: /Approved Matken project photograph/i,
      }),
    ).toHaveLength(12);
    expect(
      screen.getAllByRole("img", {
        name: /Approved Matken project photograph/i,
      })[0],
    ).toHaveAttribute("src", "/assets/projects/img-20260824-wa0000.webp");
    const openingPhoto = screen.getByRole("button", {
      name: /Open Approved Matken project photograph 004/i,
    });
    await user.click(openingPhoto);
    expect(
      screen.getByRole("dialog", { name: /Photo 1 of 129/i }),
    ).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByRole("dialog", { name: /Photo 2 of 129/i }),
    ).toBeInTheDocument();
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Previous photo" }),
    ).toHaveFocus();
    await user.tab({ shift: true });
    expect(
      screen.getByRole("button", { name: "Close photo viewer" }),
    ).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(openingPhoto).toHaveFocus();
    await user.click(
      screen.getByRole("button", { name: /View all 129 approved photos/i }),
    );
    expect(
      screen.getAllByRole("img", {
        name: /Approved Matken project photograph/i,
      }),
    ).toHaveLength(129);
    expect(
      screen.getByText(/Is the phone number on this website live/i),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.getElementById("matken-business-jsonld")?.textContent)
        .toMatch(/\+18765682616/),
    );
    expect(
      document.getElementById("matken-business-jsonld")?.textContent,
    ).not.toMatch(/streetAddress|openingHours|email/i);

    await user.click(blueprintShortcut);
    expect(window.location.hash).toBe("#/");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Start my blueprint" }),
      ).toHaveFocus(),
    );
  });

  it("builds a private safety-aware Project Blueprint and applies it to a request", async () => {
    const user = userEvent.setup();
    renderAt("/");

    const start = await screen.findByRole("button", {
      name: "Start my blueprint",
    });
    expect(
      screen.queryByRole("radio", {
        name: "Resolve or upgrade electrical systems",
      }),
    ).not.toBeInTheDocument();

    await user.click(start);
    const electricalGoal = await screen.findByRole("radio", {
      name: "Resolve or upgrade electrical systems",
    });
    expect(electricalGoal).not.toBeChecked();
    await waitFor(() =>
      expect(
        screen.getByText("What outcome are you working toward?"),
      ).toHaveFocus(),
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByText(/Choose the outcome you are working toward/i),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText("What outcome are you working toward?"),
      ).toHaveFocus(),
    );

    await user.click(electricalGoal);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(screen.getByText("Shape the starting path.")).toHaveFocus(),
    );

    await user.click(screen.getByRole("radio", { name: "Business" }));
    await user.click(
      screen.getByRole("radio", { name: "Safety concern" }),
    );
    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent(/This website is not an emergency service/i);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const affectedArea = screen.getByRole("checkbox", {
      name: "Affected rooms, circuits, or equipment identified",
    });
    await user.click(affectedArea);
    await user.click(
      screen.getByRole("button", { name: "Create my blueprint" }),
    );

    const resultHeading = screen.getByRole("heading", {
      name: "Your Matken Project Blueprint",
    });
    await waitFor(() => expect(resultHeading).toHaveFocus());
    expect(
      screen.getByText(/Planning category:/).closest("p"),
    ).toHaveTextContent("Commercial electrical request");
    expect(
      screen.getByText("Useful questions for the consultation"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Which rooms, circuits, or equipment are affected?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Do not wait on a website request/i),
    ).toBeInTheDocument();

    const resultArticle = screen.getByRole("article", {
      name: "Your Matken Project Blueprint",
    });
    const copyButton = within(resultArticle).getByRole("button", {
      name: "Copy Project Blueprint",
    });
    const shareButton = within(resultArticle).getByRole("button", {
      name: "Share Project Blueprint",
    });
    expect(
      within(resultArticle).getByRole("button", {
        name: "Print or save Project Blueprint",
      }),
    ).toBeInTheDocument();

    await user.click(copyButton);
    const actionStatus = within(resultArticle).getByRole("status");
    expect(actionStatus).toHaveTextContent(
      /Project Blueprint copied without contact details/i,
    );
    expect(actionStatus).not.toHaveClass("visually-hidden");
    expect(actionStatus.closest(".blueprint-result-actions")).not.toBeNull();

    const clipboardWrite = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockRejectedValueOnce(new Error("Clipboard unavailable"));
    await user.click(copyButton);
    expect(actionStatus).toHaveTextContent(
      /could not be copied automatically/i,
    );
    clipboardWrite.mockRestore();

    const originalShare = navigator.share;
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    await user.click(shareButton);
    expect(actionStatus).toHaveTextContent(
      /Project Blueprint copied without contact details/i,
    );

    const share = vi.fn();
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    share.mockRejectedValueOnce(
      new DOMException("Share cancelled", "AbortError"),
    );
    await user.click(shareButton);
    expect(actionStatus).toHaveTextContent(/Sharing was cancelled/i);

    share.mockRejectedValueOnce(new Error("Share unavailable"));
    await user.click(shareButton);
    expect(actionStatus).toHaveTextContent(
      /share sheet could not be opened/i,
    );

    share.mockResolvedValueOnce(undefined);
    await user.click(shareButton);
    expect(actionStatus).toHaveTextContent(
      /device share sheet was opened/i,
    );
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: originalShare,
    });

    await user.click(
      screen.getByRole("link", {
        name: "Continue for non-emergency follow-up",
      }),
    );

    expect(
      await screen.findByText(/Your private Project Blueprint was applied/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Electrical/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("combobox", { name: "Property type" }),
    ).toHaveValue("Business or office");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Parish" }),
      "Saint James",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByRole("combobox", { name: "Suggested project category" }),
    ).toHaveValue("Commercial electrical request");
    expect(
      screen.getByRole("button", { name: "Urgent safety concern" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("checkbox", {
        name: "Affected rooms, circuits, or equipment identified",
      }),
    ).toBeChecked();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /A website form is not an emergency service/i,
    );

    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Property type" }),
      "Home",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByRole("combobox", { name: "Suggested project category" }),
    ).toHaveValue("");
    expect(
      screen.queryByText(/Your private Project Blueprint was applied/i),
    ).not.toBeInTheDocument();
  });

  it("ignores a malformed Project Blueprint router handoff", async () => {
    renderAt("/request", {
      blueprint: {
        version: 1,
        source: "homepage-blueprint",
        goalId: "electrical",
        service: "solar",
        pathway: "Battery-backup planning",
        propertyType: "Business or office",
        urgency: "Within a few weeks",
        availableContextIds: ["affected-area"],
        name: "Injected Customer",
      },
    });

    await screen.findByRole("button", { name: /^Electrical/i });
    expect(
      screen.queryByText(/Your private Project Blueprint was applied/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Electrical/i }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("combobox", { name: "Property type" }),
    ).toHaveValue("");
  });

  it("keeps the closed mobile menu out of the focus order and closes it with Escape", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await screen.findByRole("button", { name: "Open navigation" });
    expect(
      screen.queryByRole("navigation", { name: "Mobile navigation" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeInTheDocument();
    expect(document.body).toHaveClass("menu-open");
    expect(document.querySelector("main")).toHaveAttribute("inert");

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("navigation", { name: "Mobile navigation" }),
    ).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass("menu-open");
    expect(document.querySelector("main")).not.toHaveAttribute("inert");
  });

  it("searches private site content and restores focus when the dialog closes", async () => {
    const user = userEvent.setup();
    renderAt("/");

    const searchButton = await screen.findByRole("button", {
      name: "Search this website",
    });
    await user.click(searchButton);

    const dialog = await screen.findByRole("dialog", {
      name: "Search Matken",
    });
    const searchInput = await screen.findByRole("searchbox", {
      name: "Search this website",
    });
    expect(dialog).toBeInTheDocument();
    expect(document.body).toHaveClass("search-dialog-open");
    expect(document.querySelector("main")).toHaveAttribute("inert");
    expect(document.querySelector("header")).toHaveAttribute("inert");
    await waitFor(() => expect(searchInput).toHaveFocus());

    await user.type(searchInput, "battery backup");
    expect(
      await screen.findByRole("link", { name: /Solar & storage/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Build an outage priority list before choosing a battery/i,
      }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Search Matken" }),
    ).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass("search-dialog-open");
    expect(document.querySelector("main")).not.toHaveAttribute("inert");
    await waitFor(() => expect(searchButton).toHaveFocus());

    await user.keyboard("/");
    expect(
      screen.getByRole("dialog", { name: "Search Matken" }),
    ).toBeInTheDocument();
  });

  it("opens a matching route from local search without sending the query", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.click(
      await screen.findByRole("button", { name: "Search this website" }),
    );
    await user.type(
      await screen.findByRole("searchbox", { name: "Search this website" }),
      "invoice payment",
    );
    await user.click(
      await screen.findByRole("link", { name: /Invoice payment access/i }),
    );

    await waitFor(() =>
      expect(window.location.pathname).toBe("/pay-invoice"),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Pay through a private link—not a public invoice page.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Search Matken" }),
    ).not.toBeInTheDocument();
  });

  it("routes a resource reader to the matching educational planning tool", async () => {
    const user = userEvent.setup();
    renderAt("/resources/outage-priority-list");

    await user.click(
      await screen.findByRole("link", {
        name: "Build an outage planning range",
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Plan A inputs",
      }),
    ).toBeInTheDocument();
  });

  it("labels the Planner return action when updating a private Project Pack", async () => {
    renderAt("/planner", { projectPackMode: true });

    expect(
      await screen.findByRole("link", { name: "Update Project Pack" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /This educational range can update your existing private Project Pack/i,
      ),
    ).toHaveAttribute("role", "status");
  });

  it("builds an essential load and carries its canonical details into the request summary", async () => {
    const user = userEvent.setup();
    renderAt("/planner");

    const monthlyUsage = await screen.findByRole("slider", {
      name: /Monthly electricity use/i,
    });
    fireEvent.change(monthlyUsage, { target: { value: "900" } });

    expect(screen.getByText("900 kWh")).toBeInTheDocument();
    expect(
      screen.getByText(/Starting solar-array range/i),
    ).toBeInTheDocument();

    await user.click(screen.getByText("Build the load from appliances"));
    await user.click(
      screen.getByRole("checkbox", { name: /Refrigerator or freezer/i }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "Quantity for Refrigerator or freezer",
      }),
      { target: { value: "2" } },
    );
    await user.click(
      screen.getByRole("checkbox", { name: /Internet equipment/i }),
    );

    expect(screen.getByText(/430 W · 0.43 kW/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use this load" }));
    expect(
      screen.getByRole("slider", { name: /Essential simultaneous load/i }),
    ).toHaveValue("0.5");
    expect(
      screen.getByText(/updated to 0.5 kW from 2 selected loads/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Applied essential-load breakdown"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("link", { name: /Use Plan A in a request/i }),
    );

    const carriedPlan = (
      await screen.findByText(/Planner result attached to this request/i)
    ).closest(".carried-plan");
    expect(carriedPlan).toHaveTextContent(
      /Includes 2 selected essential loads totaling 430 W/i,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Property type" }),
      "Home",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Parish" }),
      "Saint James",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(
      screen.getByRole("checkbox", {
        name: "Recent electricity bills or monthly kWh totals",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Planning and comparing options",
      }),
    );
    await user.type(
      screen.getByRole("textbox", { name: /^Project details/ }),
      "We want to plan essential backup power and rooftop solar for our home.",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "A Customer");
    await user.type(
      screen.getByRole("textbox", { name: "Phone" }),
      "(876) 555-0101",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /Matken may contact me about this service request/i,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: /Review request/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /Prepare request summary/i }),
    );

    const summary = await waitFor(() => {
      const summaryPanel = document.querySelector(".summary-panel pre");
      expect(summaryPanel).toBeInTheDocument();
      return summaryPanel;
    });
    expect(summary).toHaveTextContent(
      /Customer-provided preparation available:.*Recent electricity bills or monthly kWh totals/s,
    );
    expect(summary).toHaveTextContent(
      /Selected essential loads:.*2 × Refrigerator or freezer at 200 W.*1 × Internet equipment at 30 W/s,
    );
    expect(summary).toHaveTextContent(/Calculated running-load total: 430 W/);
    expect(summary).toHaveTextContent(
      /Planner and appliance values are educational and are not a design or quote/i,
    );
  });

  it("compares Plan A and Plan B, then carries the chosen plan into a request", async () => {
    const user = userEvent.setup();
    renderAt("/planner");

    await screen.findByRole("slider", {
      name: /Target backup duration/i,
    });
    await user.click(
      screen.getByRole("button", {
        name: "Compare another plan from Plan A",
      }),
    );

    const planB = screen.getByRole("radio", { name: /Plan B/i });
    expect(planB).toBeChecked();
    await waitFor(() => expect(planB).toHaveFocus());

    fireEvent.change(
      screen.getByRole("slider", {
        name: /Target backup duration/i,
      }),
      { target: { value: "12" } },
    );

    const comparison = screen.getByRole("table", {
      name: /Educational comparison of Matken resilience planning inputs/i,
    });
    expect(within(comparison).getByText("10.0 kWh")).toBeInTheDocument();
    expect(within(comparison).getByText("20.0 kWh")).toBeInTheDocument();
    expect(
      within(comparison).getByText("+10.0 kWh vs Plan A"),
    ).toBeInTheDocument();

    await user.click(
      within(comparison).getByRole("link", {
        name: "Use Plan B in request",
      }),
    );

    const carriedPlan = (
      await screen.findByText(/Planner result attached to this request/i)
    ).closest(".carried-plan");
    expect(carriedPlan).toHaveTextContent(/20.0 kWh nominal battery range/i);
    expect(window.location.pathname).toBe("/request");
  });

  it("rejects an appliance load above the planner range without changing the authoritative slider", async () => {
    const user = userEvent.setup();
    renderAt("/planner");

    const essentialLoad = await screen.findByRole("slider", {
      name: /Essential simultaneous load/i,
    });
    await user.click(screen.getByText("Build the load from appliances"));
    await user.click(
      screen.getByRole("checkbox", { name: /Other essential equipment/i }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "Quantity for Other essential equipment",
      }),
      { target: { value: "3" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "Watts for Other essential equipment",
      }),
      { target: { value: "5000" } },
    );
    await user.click(screen.getByRole("button", { name: "Use this load" }));

    expect(essentialLoad).toHaveValue("1.2");
    expect(
      screen.getByText(/above the 10 kW planning range/i),
    ).toBeInTheDocument();
  });

  it("drops the appliance breakdown after a manual essential-load override", async () => {
    const user = userEvent.setup();
    renderAt("/planner");

    await screen.findByRole("slider", {
      name: /Essential simultaneous load/i,
    });
    await user.click(screen.getByText("Build the load from appliances"));
    await user.click(
      screen.getByRole("checkbox", { name: /Internet equipment/i }),
    );
    await user.click(screen.getByRole("button", { name: "Use this load" }));
    expect(
      screen.getByText(/planner minimum of 0.2 kW was applied/i),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("slider", {
        name: /Essential simultaneous load/i,
      }),
      { target: { value: "1.7" } },
    );

    expect(
      screen.getByText(/Manual load selected.*apply the appliance list again/i),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("link", { name: /Use Plan A in a request/i }),
    );

    const carriedPlan = (
      await screen.findByText(/Planner result attached to this request/i)
    ).closest(".carried-plan");
    expect(carriedPlan).not.toHaveTextContent(/Includes .*selected essential/i);
  });

  it("clears service-specific preparation choices when the service changes", async () => {
    const user = userEvent.setup();
    renderAt("/request");

    await user.click(
      await screen.findByRole("button", { name: /Solar & storage/i }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Property type" }),
      "Home",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Parish" }),
      "Saint James",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByRole("group", {
        name: "What do you already have available?",
      }),
    ).toHaveAccessibleDescription(/Do not open electrical equipment/i);
    const solarPreparation = screen.getByRole("checkbox", {
      name: "Recent electricity bills or monthly kWh totals",
    });
    await user.click(solarPreparation);
    expect(solarPreparation).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(
      screen.getByRole("button", { name: /^Electrical/i }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.queryByRole("checkbox", {
        name: "Recent electricity bills or monthly kWh totals",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "Affected rooms, circuits, or equipment identified",
      }),
    ).not.toBeChecked();
  });

  it("sanitizes malformed carried planner state and recomputes its displayed result", async () => {
    renderAt("/request?service=solar", {
      plan: {
        monthlyKwh: "not-a-number",
        essentialKw: 0.2,
        outageHours: 6,
        panelWatts: 999,
        result: {
          startingSolarKw: 9999,
          nominalBatteryKwh: 9999,
        },
        loadPlan: {
          source: "builder",
          items: [
            { id: "unknown-load", quantity: 99, watts: 99999 },
            { id: "refrigeration", quantity: 3, watts: 5000 },
          ],
        },
      },
    });

    const carriedPlan = (
      await screen.findByText(/Planner result attached to this request/i)
    ).closest(".carried-plan");
    expect(carriedPlan).toHaveTextContent(/4.2 kW starting solar range/i);
    expect(carriedPlan).not.toHaveTextContent(/9999/);
    expect(carriedPlan).not.toHaveTextContent(/Includes .*selected essential/i);
  });

  it("validates and prepares a request without claiming transmission", async () => {
    const user = userEvent.setup();
    renderAt("/request");

    await reachRequestContactStep(user);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "A Customer");
    await user.type(
      screen.getByRole("textbox", { name: "Phone" }),
      "(876) 555-0101",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /Matken may contact me about this service request/i,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: /Review request/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /Prepare request summary/i }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Your request is organized and ready to share.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/has not been transmitted/i)).toBeInTheDocument();
    expect(screen.getByText(/Nothing was emailed, uploaded, stored, or sent/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Prepare another request" }),
    );
    expect(
      screen.getByRole("button", { name: /Solar & storage/i }),
    ).toHaveAttribute("aria-pressed", "false");

    await reachRequestContactStep(user);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveValue("");
  });

  it("requires a meaningful phone number and email for email follow-up", async () => {
    const user = userEvent.setup();
    renderAt("/request");
    await reachRequestContactStep(user);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "A Customer");
    await user.type(screen.getByRole("textbox", { name: "Phone" }), "-------");
    await user.click(screen.getByRole("button", { name: "Email" }));
    await user.click(
      screen.getByRole("checkbox", {
        name: /Matken may contact me about this service request/i,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: /Review request/i }),
    );

    expect(screen.getByText("Enter a valid phone number.")).toBeInTheDocument();
    expect(
      screen.getByText("Enter an email address for email follow-up."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /^Phone/i }),
    ).toHaveFocus();
  });

  it("requires only the selected contact route and labels the backup route optional", async () => {
    const user = userEvent.setup();
    renderAt("/request");
    await reachRequestContactStep(user);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "A Customer");
    await user.click(screen.getByRole("button", { name: "Email" }));

    const phone = screen.getByRole("textbox", { name: "Phone (optional)" });
    const email = screen.getByRole("textbox", { name: "Email" });
    expect(phone).not.toBeRequired();
    expect(phone).toHaveAttribute("aria-required", "false");
    expect(email).toBeRequired();
    expect(email).toHaveAttribute("aria-required", "true");

    await user.type(email, "customer@example.com");
    await user.click(
      screen.getByRole("checkbox", {
        name: /Matken may contact me about this service request/i,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: /Review request/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /Prepare request summary/i }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Your request is organized and ready to share.",
      }),
    ).toBeInTheDocument();
    expect(document.querySelector(".summary-panel pre")).toHaveTextContent(
      "Phone: Not provided",
    );
    expect(document.querySelector(".summary-panel pre")).toHaveTextContent(
      "Email: customer@example.com",
    );
  });

  it("keeps invoice lookup unavailable and generic until a provider is connected", async () => {
    const user = userEvent.setup();
    renderAt("/pay-invoice");

    expect(
      await screen.findByText(
        /Preview only\. This page does not look up invoices/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen
        .getByText(/Preview only\. This page does not look up invoices/i)
        .closest("[role='status']"),
    ).toBeTruthy();

    await user.type(
      await screen.findByRole("textbox", { name: "Invoice reference" }),
      "MKN-INV-1001",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Billing email" }),
      "customer@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: "Request secure access" }),
    );

    expect(
      await screen.findByText(/No lookup was performed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/payment provider selection pending/i),
    ).toBeInTheDocument();
  });

  it("moves focus to the main content and announces client-side navigation", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.click(
      await screen.findByRole("link", { name: "Explore services" }),
    );
    await screen.findByRole("heading", {
      name: "Start with the project—not a list of buzzwords.",
    });

    await waitFor(() =>
      expect(document.querySelector("main")).toHaveFocus(),
    );
    expect(screen.getByRole("status")).toHaveTextContent(/loaded/i);
    expect(document.title).toBe("Services | Matken Electrical");
  });

  it("copies service preparation questions without creating a request", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderAt("/services/solar");

    await user.click(
      await screen.findByRole("button", {
        name: "Copy preparation questions",
      }),
    );

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("MATKEN SOLAR & STORAGE — PREPARATION QUESTIONS"),
    );
    expect(
      screen.getByText(/Preparation questions copied\. No details were sent to Matken/i),
    ).toHaveAttribute("role", "status");
  });

  it("opens the private Blueprint directly from a service page", async () => {
    const user = userEvent.setup();
    renderAt("/services/electrical");

    await user.click(
      await screen.findByRole("link", {
        name: "Build a private project blueprint",
      }),
    );

    expect(
      await screen.findByRole("radio", {
        name: "Resolve or upgrade electrical systems",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("What outcome are you working toward?"),
    ).toBeInTheDocument();
  });

  it("keeps live-call and private-tool copy on planning and legal routes", async () => {
    renderAt("/planner");
    expect(
      (await screen.findAllByText(/The verified public number is live/i)).length,
    ).toBeGreaterThan(0);
    expect(document.title).toBe("Solar & Backup Planner | Matken Electrical");

    cleanup();
    renderAt("/about");
    expect(
      (await screen.findAllByText(/The verified public number is live/i)).length,
    ).toBeGreaterThan(0);

    cleanup();
    renderAt("/pay-invoice");
    expect(
      (await screen.findAllByText(/The verified public number is live/i)).length,
    ).toBeGreaterThan(0);
  });

  it("offers a live call and a private request on service pages", async () => {
    renderAt("/services/electrical");

    expect(
      await screen.findByRole("link", {
        name: /Prepare an electrical request/i,
      }),
    ).toHaveAttribute("href", "/request?service=electrical");
    expect(
      within(document.querySelector(".service-detail-copy")).getByRole("link", {
        name: /Call \(876\) 568-2616/,
      }),
    ).toHaveAttribute("href", "tel:+18765682616");
    expect(
      screen.getByText(/What happens next/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/The verified public number is live/i).length,
    ).toBeGreaterThan(0);
  });

  it("creates a shareable planner URL without contact details", async () => {
    const user = userEvent.setup();
    renderAt("/planner");

    const monthlyUsage = await screen.findByRole("slider", {
      name: /Monthly electricity use/i,
    });
    fireEvent.change(monthlyUsage, { target: { value: "780" } });
    await user.click(screen.getByText("Build the load from appliances"));
    await user.click(
      screen.getByRole("checkbox", { name: /Refrigerator or freezer/i }),
    );
    await user.click(screen.getByRole("button", { name: "Use this load" }));
    await user.click(screen.getByRole("button", { name: "Copy plan link" }));

    const parameters = new URLSearchParams(window.location.search);
    expect(parameters.get("monthly")).toBe("780");
    expect(parameters.get("essential")).toBe("0.2");
    expect(parameters.get("hours")).toBe("6");
    expect(parameters.get("panel")).toBe("450");
    expect(window.location.href).not.toMatch(/name|email|phone/i);
    expect(window.location.href).not.toMatch(/refrigeration|watts|loadPlan/i);
    expect(await screen.findByText(/Plan link/)).toBeInTheDocument();
  });

  it("recovers from an unknown route with live call and planning paths", async () => {
    renderAt("/this-page-does-not-exist");

    const notFound = await screen.findByRole("heading", {
      name: "That page is not part of this project.",
    });
    const recovery = notFound.closest(".not-found");
    expect(
      within(recovery).getByRole("link", { name: /Call \(876\) 568-2616/ }),
    ).toHaveAttribute("href", "tel:+18765682616");
    expect(
      within(recovery).getByRole("link", { name: /Prepare a request/i }),
    ).toHaveAttribute("href", "/request");
    expect(
      within(recovery).getByRole("link", { name: /Open solar planner/i }),
    ).toHaveAttribute("href", "/planner");
    expect(
      within(recovery).getByText(/The verified public number is live/i),
    ).toBeInTheDocument();
    expect(document.title).toBe("Page not found | Matken Electrical");
  });
});
