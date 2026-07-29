import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App.jsx";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("secure project-status tracker", () => {
  it("fails closed in prototype mode without performing a lookup", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/project-status");
    render(<App />);

    await user.type(
      await screen.findByRole("textbox", { name: "Project reference" }),
      "MKN-PROJ-101",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Project email" }),
      "customer@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: "Send one-time link" }),
    );

    expect(
      screen.getByText(
        /Project tracking is not connected in this prototype/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/No project lookup was performed/i)).toBeInTheDocument();
  });

  it("accepts only allowlisted authoritative provider states", async () => {
    vi.stubEnv("VITE_PROJECT_STATUS_ENDPOINT", "/api/project-status");
    const { lookupProjectStatus } = await import(
      "../src/lib/providerConfig.js?connected-status-test"
    );
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      headers: {
        get: () => "application/json",
      },
      json: async () => ({
        projectReference: "MKN-PROJ-101",
        status: "in_progress",
        updatedLabel: "today",
        nextStep: "Matken will confirm the next scheduled visit.",
      }),
    }));

    await expect(
      lookupProjectStatus(
        "abcdefghijklmnopqrstuvwxyz123456",
        { fetchImpl },
      ),
    ).resolves.toMatchObject({
      projectReference: "MKN-PROJ-101",
      status: { code: "in_progress", label: "In progress" },
    });

    fetchImpl.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        projectReference: "MKN-PROJ-101",
        status: "customer_will_probably_be_done_tomorrow",
      }),
    });
    await expect(
      lookupProjectStatus(
        "abcdefghijklmnopqrstuvwxyz123456",
        { fetchImpl },
      ),
    ).rejects.toThrow(/unavailable/i);
  });
});
