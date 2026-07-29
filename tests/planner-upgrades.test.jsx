import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { PlannerPage } from "../src/pages/PlannerPage.jsx";
import {
  buildOutageRoutine,
  calculateBillHistoryStats,
  createInitialPlannerScenarioState,
  plannerScenarioReducer,
  plannerScenarioStateFromSearch,
  plannerSearchParamsForState,
  selectedLoadItemsFromEntries,
} from "../src/lib/plannerModel.js";
import {
  appSearchFromLocation,
  createAppShareUrl,
} from "../src/lib/appUrl.js";

describe("planner upgrade model", () => {
  it("turns 3–12 bill totals into an average and a low-to-high solar range", () => {
    const stats = calculateBillHistoryStats([300, 450, 600], 450);

    expect(stats).toMatchObject({
      ready: true,
      count: 3,
      minKwh: 300,
      averageKwh: 450,
      maxKwh: 600,
    });
    expect(stats.solarRange.min.startingSolarKw).toBeCloseTo(2.7778);
    expect(stats.solarRange.average.startingSolarKw).toBeCloseTo(4.1667);
    expect(stats.solarRange.max.startingSolarKw).toBeCloseTo(5.5556);
    expect(calculateBillHistoryStats([300, "", 600], 450)).toEqual({
      ready: false,
      count: 2,
      requiredCount: 3,
    });
  });

  it("models appliance hours and staggered starts without overstating peak load", () => {
    const entries = {
      refrigeration: {
        selected: true,
        quantity: 1,
        watts: 200,
        hours: 4,
        startHour: 0,
      },
      internet: {
        selected: true,
        quantity: 1,
        watts: 30,
        hours: 2,
        startHour: 4,
      },
    };
    const items = selectedLoadItemsFromEntries(entries, 6);
    const routine = buildOutageRoutine(items, 6);

    expect(routine.allAtOnceWatts).toBe(230);
    expect(routine.peakWatts).toBe(200);
    expect(routine.energyKwh).toBeCloseTo(0.86);
    expect(routine.segments).toHaveLength(2);
    expect(routine.segments[0]).toMatchObject({
      startHour: 0,
      endHour: 4,
      runningWatts: 200,
    });
    expect(routine.segments[1]).toMatchObject({
      startHour: 4,
      endHour: 6,
      runningWatts: 30,
    });
  });

  it("round-trips only bounded non-contact planner data in a resume query", () => {
    let state = createInitialPlannerScenarioState();
    [300, 450, 600].forEach((value, index) => {
      state = plannerScenarioReducer(state, {
        type: "SET_BILL_ENTRY",
        index,
        value,
      });
    });
    state = plannerScenarioReducer(state, {
      type: "PATCH_LOAD_ENTRY",
      id: "refrigeration",
      patch: {
        selected: true,
        quantity: 1,
        watts: 200,
        hours: 4,
        startHour: 0,
      },
    });
    state = plannerScenarioReducer(state, {
      type: "APPLY_SELECTED_LOAD",
      essentialKw: 0.2,
    });
    state = plannerScenarioReducer(state, {
      type: "CLONE_ACTIVE",
      id: "plan-b",
    });
    state = plannerScenarioReducer(state, {
      type: "SET_INPUT",
      field: "outageHours",
      value: 10,
    });

    const parameters = plannerSearchParamsForState(state);
    const resumed = plannerScenarioStateFromSearch(`?${parameters}`);

    expect(resumed.activeId).toBe("plan-b");
    expect(resumed.scenarios).toHaveLength(2);
    expect(resumed.scenarios[0].billHistory).toEqual([300, 450, 600]);
    expect(resumed.scenarios[0].loadEntries.refrigeration).toMatchObject({
      selected: true,
      hours: 4,
      startHour: 0,
    });
    expect(resumed.scenarios[1].inputs.outageHours).toBe(10);
    expect(parameters.toString()).not.toMatch(
      /name|email|phone|address|account/i,
    );
  });

  it("reads and creates GitHub Pages hash-routed planner links", () => {
    let state = createInitialPlannerScenarioState();
    state = plannerScenarioReducer(state, {
      type: "SET_INPUT",
      field: "monthlyKwh",
      value: 720,
    });
    const parameters = plannerSearchParamsForState(state);
    const location = {
      href: `https://example.github.io/matken/?campaign=solar#/planner?${parameters}`,
      origin: "https://example.github.io",
      pathname: "/matken/",
      search: "?campaign=solar",
      hash: `#/planner?${parameters}`,
    };

    const appSearch = appSearchFromLocation(location);
    expect(plannerScenarioStateFromSearch(appSearch).scenarios[0].inputs)
      .toMatchObject({ monthlyKwh: 720 });
    expect(
      createAppShareUrl(
        "/planner?monthly=720&essential=1.2",
        location,
      ),
    ).toBe(
      "https://example.github.io/matken/#/planner?monthly=720&essential=1.2",
    );
  });
});

describe("planner upgrade experience", () => {
  it("applies bill history, shows an outage timeline, and creates a resumable link", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    window.history.replaceState({}, "", "/planner");

    render(
      <BrowserRouter>
        <PlannerPage />
      </BrowserRouter>,
    );

    await user.click(
      screen.getByText("Compare several monthly bills"),
    );
    [300, 450, 600].forEach((value, index) => {
      fireEvent.change(
        screen.getByRole("spinbutton", {
          name: new RegExp(`Month ${index + 1}`),
        }),
        { target: { value: String(value) } },
      );
    });
    expect(
      screen.getByText("300–600 kWh"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Use 450 kWh average" }),
    );
    expect(
      screen.getByText(/450 kWh average applied to Plan A/i),
    ).toBeInTheDocument();

    await user.click(screen.getByText("Build the load from appliances"));
    await user.click(
      screen.getByRole("checkbox", { name: /Refrigerator or freezer/i }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "Hours needed for Refrigerator or freezer",
      }),
      { target: { value: "4" } },
    );
    await user.click(
      screen.getByRole("checkbox", { name: /Internet equipment/i }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "Hours needed for Internet equipment",
      }),
      { target: { value: "2" } },
    );
    await user.selectOptions(
      screen.getByRole("combobox", {
        name: "Start time for Internet equipment",
      }),
      "4",
    );

    expect(
      screen.getByRole("heading", {
        name: "See when the selected loads overlap.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", {
        name: "Illustrative outage routine by time block",
      }),
    ).toHaveTextContent(/Hour 0–4.*200 W.*Hour 4–6.*30 W/s);

    await user.click(screen.getByRole("button", { name: "Use this load" }));
    await user.click(screen.getByRole("button", { name: "Copy plan link" }));

    const parameters = new URLSearchParams(window.location.search);
    expect(parameters.has("resume")).toBe(true);
    const resumed = plannerScenarioStateFromSearch(window.location.search);
    expect(resumed.scenarios[0].billHistory).toEqual([300, 450, 600]);
    expect(resumed.scenarios[0].loadEntries.internet).toMatchObject({
      selected: true,
      hours: 2,
      startHour: 4,
    });
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(window.location.href).not.toMatch(/name|email|phone|address/i);
  });
});
