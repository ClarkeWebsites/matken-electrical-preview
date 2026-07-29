import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { ApprovedProjectStories } from "../src/components/ApprovedProjectStories.jsx";
import {
  isApprovedProjectStory,
  projectStoryValidationErrors,
} from "../src/data/projectStories.js";
import {
  buildProjectPackHtml,
  buildProjectPackText,
  clearProjectPackRequestTransfer,
  createProjectPack,
  mergeProjectPackPlanning,
  PROJECT_PACK_STORAGE_KEY,
  readProjectPackRequestTransfer,
  stageProjectPackRequestTransfer,
} from "../src/lib/projectPack.js";

const blueprint = {
  version: 1,
  source: "homepage-blueprint",
  goalId: "solar",
  service: "solar",
  pathway: "Solar project consultation",
  propertyType: "Home",
  urgency: "Within a few months",
  availableContextIds: ["recent-usage"],
  name: "Must be stripped",
  email: "private@example.com",
};

const planner = {
  version: 1,
  monthlyKwh: 510,
  essentialKw: 1.4,
  outageHours: 8,
  panelWatts: 450,
  contact: "Must be stripped",
  loadPlan: {
    source: "builder",
    items: [
      {
        id: "refrigeration",
        quantity: 1,
        watts: 200,
        hours: 8,
        startHour: 0,
      },
    ],
  },
};

const approvedStory = {
  id: "approved-story",
  title: "Approved Matken project story",
  serviceSlug: "solar",
  summary:
    "An approved summary with enough factual detail for publication.",
  challenge:
    "An approved description of the customer need documented by Matken.",
  coordination:
    "An approved description of how Matken coordinated the project and its participants.",
  workCompleted:
    "An approved description of the specific work Matken completed for the project.",
  outcome:
    "An approved description of the completed outcome documented by Matken.",
  locationLabel: "Jamaica",
  image: {
    src: "/assets/approved-project.jpg",
    alt: "Approved Matken project installation",
    rightsStatus: "approved",
    approvalReference: "IMG-100",
  },
  approval: {
    status: "approved",
    approvedBy: "Matken owner",
    approvedAt: "2026-07-29",
    claimEvidence: "Owner-approved project record MATKEN-100",
  },
};

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("Matken Project Pack privacy boundary", () => {
  it("stores only normalized non-contact planning data", () => {
    const storage = memoryStorage();
    const planning = mergeProjectPackPlanning(
      {
        blueprint,
        planner,
        readiness: {
          service: "solar",
          availableContextIds: ["recent-usage", "unknown-id"],
        },
        name: "Injected",
        phone: "(876) 555-0101",
      },
      storage,
    );

    expect(planning.blueprint).not.toHaveProperty("name");
    expect(planning.blueprint).not.toHaveProperty("email");
    expect(planning.planner).not.toHaveProperty("contact");
    expect(planning.readiness.availableContextIds).toEqual([
      "recent-usage",
    ]);

    const stored = storage.getItem(PROJECT_PACK_STORAGE_KEY);
    expect(stored).not.toMatch(
      /Must be stripped|private@example|555-0101|Injected/,
    );
  });

  it("includes an intentional request summary in output without scripting it", () => {
    const pack = createProjectPack({
      planning: { blueprint, planner },
      requestReference: "MKN-PACK-101",
      requestSummary:
        "Name: A Customer\nProject details: <script>alert('x')</script>",
    });
    const text = buildProjectPackText(pack);
    const html = buildProjectPackHtml(pack);

    expect(text).toMatch(/MATKEN PROJECT PACK/);
    expect(text).toMatch(/PROJECT BLUEPRINT/);
    expect(text).toMatch(/SOLAR & BACKUP PLANNING RANGE/);
    expect(text).toMatch(/Name: A Customer/);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("hands contact-bearing summaries across routes only in ephemeral memory", () => {
    const key = stageProjectPackRequestTransfer({
      requestReference: "MKN-PACK-102",
      requestSummary: "Name: Private Customer\nPhone: (876) 555-0101",
    });

    expect(key).not.toMatch(/Private|Customer|555/);
    expect(readProjectPackRequestTransfer(key)).toEqual({
      requestReference: "MKN-PACK-102",
      requestSummary: "Name: Private Customer\nPhone: (876) 555-0101",
    });

    clearProjectPackRequestTransfer(key);
    expect(readProjectPackRequestTransfer(key)).toEqual({
      requestSummary: "",
      requestReference: "",
    });
  });
});

describe("approval-gated project story system", () => {
  it("publishes only complete owner-approved facts and image rights", () => {
    expect(projectStoryValidationErrors(approvedStory)).toEqual([]);
    expect(isApprovedProjectStory(approvedStory)).toBe(true);
    expect(
      isApprovedProjectStory({
        ...approvedStory,
        approval: { ...approvedStory.approval, status: "pending" },
      }),
    ).toBe(false);
    expect(
      isApprovedProjectStory({
        ...approvedStory,
        image: { ...approvedStory.image, rightsStatus: "unknown" },
      }),
    ).toBe(false);
    expect(
      isApprovedProjectStory({
        ...approvedStory,
        coordination: "",
      }),
    ).toBe(false);
    expect(
      isApprovedProjectStory({
        ...approvedStory,
        workCompleted: "",
      }),
    ).toBe(false);
  });

  it("renders nothing while the approval registry is empty", () => {
    const { container } = render(<ApprovedProjectStories />);
    expect(container).toBeEmptyDOMElement();
  });

  it("rejects caller-supplied stories that have not cleared every gate", () => {
    const { container } = render(
      <ApprovedProjectStories
        stories={[
          {
            ...approvedStory,
            approval: { ...approvedStory.approval, status: "pending" },
          },
        ]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("can render a fully approved reusable story record", () => {
    render(
      <MemoryRouter>
        <ApprovedProjectStories stories={[approvedStory]} />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", {
        name: "Approved Matken project story",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Approved project record")).toBeInTheDocument();
    expect(screen.getByText("Project coordination")).toBeInTheDocument();
    expect(screen.getByText("Work completed")).toBeInTheDocument();
  });
});
