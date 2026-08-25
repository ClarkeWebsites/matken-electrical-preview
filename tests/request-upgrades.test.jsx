import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../src/App.jsx";
import {
  guidedResponseSummary,
  hasGuidedSafetyConcern,
  LOCAL_PHOTO_LIMIT,
  moveLocalPhoto,
  normalizeGuidedResponses,
  toggleGuidedResponse,
  validateLocalPhotoSelection,
} from "../src/lib/requestExperience.js";

function renderAt(path) {
  window.history.replaceState({}, "", path);
  return render(<App />);
}

function imageFile(name, { size = 64, lastModified = 1 } = {}) {
  const file = new File(["photo"], name, {
    type: "image/jpeg",
    lastModified,
  });
  Object.defineProperty(file, "size", {
    configurable: true,
    value: size,
  });
  return file;
}

describe("request experience model", () => {
  it("normalizes only service-owned guided answers and keeps safety explicit", () => {
    let responses = {};
    responses = toggleGuidedResponse(
      "electrical",
      responses,
      "affected-scope",
      "one-area",
    );
    responses = toggleGuidedResponse(
      "electrical",
      responses,
      "safe-observation",
      "no-power",
    );
    responses = toggleGuidedResponse(
      "electrical",
      responses,
      "safe-observation",
      "urgent-hazard",
    );

    const normalized = normalizeGuidedResponses("electrical", {
      ...responses,
      unknown: ["invented"],
      "affected-scope": ["one-area", "whole-property", "invalid"],
    });
    expect(normalized).toEqual({
      "affected-scope": ["one-area"],
      "safe-observation": ["no-power", "urgent-hazard"],
    });
    expect(hasGuidedSafetyConcern("electrical", normalized)).toBe(true);
    expect(guidedResponseSummary("electrical", normalized)).toEqual([
      {
        id: "affected-scope",
        label: "How much of the property appears affected?",
        answers: ["One room or area"],
      },
      {
        id: "safe-observation",
        label: "What have you safely observed?",
        answers: [
          "No power in the affected area",
          "Smoke, unusual heat, burning smell, shock risk, or exposed parts",
        ],
      },
    ]);
  });

  it("accepts bounded image files and explains every rejection", () => {
    const existing = imageFile("existing.jpg", { lastModified: 10 });
    const duplicate = imageFile("existing.jpg", { lastModified: 10 });
    const valid = imageFile("panel.jpg", { lastModified: 11 });
    const tooLarge = imageFile("large.jpg", {
      size: 9 * 1024 * 1024,
      lastModified: 12,
    });
    const wrongType = new File(["notes"], "notes.txt", {
      type: "text/plain",
    });

    const result = validateLocalPhotoSelection(
      [duplicate, valid, tooLarge, wrongType],
      [existing],
    );
    expect(result.accepted).toEqual([valid]);
    expect(result.rejected).toEqual([
      "existing.jpg: already selected.",
      "large.jpg: larger than the 8 MB local-preview limit.",
      "notes.txt: choose an image file.",
    ]);

    const full = Array.from({ length: LOCAL_PHOTO_LIMIT }, (_, index) =>
      imageFile(`photo-${index}.jpg`, { lastModified: index + 20 }),
    );
    expect(
      validateLocalPhotoSelection(
        [imageFile("extra.jpg", { lastModified: 99 })],
        full,
      ).rejected,
    ).toEqual([
      `extra.jpg: only ${LOCAL_PHOTO_LIMIT} local reference photos can be prepared.`,
    ]);
  });

  it("reorders local photos immutably and rejects an out-of-range move", () => {
    const photos = [
      { id: "first" },
      { id: "second" },
      { id: "third" },
    ];
    expect(moveLocalPhoto(photos, "second", -1).map((item) => item.id)).toEqual([
      "second",
      "first",
      "third",
    ]);
    expect(moveLocalPhoto(photos, "first", -1)).toBe(photos);
    expect(photos.map((item) => item.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });
});

describe("request upgrades", () => {
  it("organizes guided context, reviews edits, and keeps local photos out of the request", async () => {
    const user = userEvent.setup();
    renderAt("/request");

    await user.click(
      await screen.findByRole("button", { name: /^Electrical/i }),
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
      screen.getByRole("radio", { name: "One room or area" }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /Smoke, unusual heat, burning smell/i,
      }),
    );
    expect(
      screen.getByText(/Do not wait on this form for smoke, fire/i),
    ).toBeInTheDocument();

    const localPhotoInput = screen.getByLabelText(/Add local photo previews/i);
    const panel = imageFile("panel.jpg", { lastModified: 100 });
    const room = imageFile("room.jpg", { lastModified: 101 });
    const rejectedText = new File(["notes"], "notes.txt", {
      type: "text/plain",
    });
    fireEvent.change(localPhotoInput, {
      target: { files: [panel, room, rejectedText] },
    });

    expect(screen.getByText("notes.txt: choose an image file.")).toBeInTheDocument();
    expect(screen.getByText(/2 local photo previews added/i)).toBeInTheDocument();
    expect(
      screen.getByText(/never uploaded, sent to Matken, or included/i),
    ).toBeInTheDocument();

    const photoList = screen.getByRole("list", {
      name: "Local photo preview order",
    });
    expect(within(photoList).getAllByRole("listitem")[0]).toHaveTextContent(
      "panel.jpg",
    );
    await user.click(
      within(photoList).getByRole("button", {
        name: "Move room.jpg earlier",
      }),
    );
    expect(within(photoList).getAllByRole("listitem")[0]).toHaveTextContent(
      "room.jpg",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Planning and comparing options",
      }),
    );
    await user.type(
      screen.getByRole("textbox", { name: /^Project details/ }),
      "One room has no reliable power and we need a safe follow-up conversation.",
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
    await user.click(screen.getByRole("button", { name: "Review request" }));

    expect(
      screen.getByText(/Check every detail before the final action/i),
    ).toHaveFocus();
    expect(screen.getByText("Customer-observed context")).toBeInTheDocument();
    expect(screen.getByText(/One room or area/)).toBeInTheDocument();
    expect(
      screen.getByText(/2 local photo previews/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Preview mode: summary preparation only/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Edit details and preparation section",
      }),
    );
    expect(
      screen.getByText(/Add enough context for a useful follow-up/i),
    ).toHaveFocus();
    await user.click(
      screen.getByRole("button", { name: "Return to review" }),
    );
    expect(
      screen.getByText(/Check every detail before the final action/i),
    ).toHaveFocus();

    await user.click(
      screen.getByRole("button", {
        name: "Edit project section",
      }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Parish" }),
      "",
    );
    await user.click(screen.getByRole("button", { name: "Cancel edit" }));
    await user.click(
      screen.getByRole("button", { name: "Prepare request summary" }),
    );
    expect(screen.getByText("Choose a parish.")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /^Parish/ }),
    ).toHaveFocus();
    await user.selectOptions(
      screen.getByRole("combobox", { name: /^Parish/ }),
      "Saint James",
    );
    await user.click(
      screen.getByRole("button", { name: "Return to review" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Prepare request summary" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Your request is organized and ready to share.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Choose a deliberate handoff.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/website did not transmit the request/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Open Project Pack if you want one planning handoff/i),
    ).toBeInTheDocument();
    expect(document.querySelector(".summary-panel pre")).toHaveTextContent(
      "Customer-observed project context (not a diagnosis):",
    );
    expect(document.querySelector(".summary-panel pre")).toHaveTextContent(
      "One room or area",
    );
    expect(document.querySelector(".summary-panel pre")).not.toHaveTextContent(
      "panel.jpg",
    );
    expect(
      screen.getByText(/2 local photo previews stayed on this device/i),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(window.location.pathname).toBe("/request"),
    );
  });
});
