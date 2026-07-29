import {
  readinessChecklistByService,
  services,
} from "../data/site.js";

export const requestPropertyTypes = Object.freeze([
  "Home",
  "Apartment or multi-unit property",
  "Business or office",
  "Retail or hospitality",
  "Construction site",
  "Community or institutional property",
  "Other",
]);

export const requestTimings = Object.freeze([
  "Urgent safety concern",
  "Within a few weeks",
  "Within a few months",
  "Planning and comparing options",
]);

export const projectBlueprintGoals = Object.freeze([
  {
    id: "backup",
    label: "Keep essentials on during outages",
    service: "solar",
    pathway: "Battery-backup planning",
    copy:
      "Start with the loads that matter, the outage duration, and the property’s recent energy use.",
  },
  {
    id: "solar",
    label: "Plan solar for a property",
    service: "solar",
    pathway: "Solar project consultation",
    copy:
      "Organize recent electricity use, installation space, and the outcome the property needs from solar.",
  },
  {
    id: "electrical",
    label: "Resolve or upgrade electrical systems",
    service: "electrical",
    pathway: "Residential electrical request",
    pathwaysByProperty: {
      "Business or office": "Commercial electrical request",
      "Construction site": "New-build coordination",
    },
    copy:
      "Describe the affected space, what is happening now, and the change or outcome you need.",
  },
  {
    id: "new-build",
    label: "Coordinate a new build",
    service: "construction",
    pathway: "New-build project discussion",
    copy:
      "Bring the project stage, intended use, drawings if available, and the people coordinating other trades.",
  },
  {
    id: "renovation",
    label: "Plan a renovation",
    service: "construction",
    pathway: "Renovation planning",
    copy:
      "Clarify what is changing, the current site condition, timing, and where electrical or energy work overlaps.",
  },
]);

export const projectBlueprintProperties = Object.freeze([
  { id: "home", label: "Home", value: "Home" },
  {
    id: "multi-unit",
    label: "Multi-unit",
    value: "Apartment or multi-unit property",
  },
  {
    id: "business",
    label: "Business",
    value: "Business or office",
  },
  {
    id: "construction-site",
    label: "Active build",
    value: "Construction site",
  },
]);

const projectBlueprintPropertyValues = new Set(
  projectBlueprintProperties.map((property) => property.value),
);

export const projectBlueprintTimings = Object.freeze([
  {
    id: "planning",
    label: "Planning",
    value: "Planning and comparing options",
  },
  {
    id: "months",
    label: "A few months",
    value: "Within a few months",
  },
  {
    id: "weeks",
    label: "A few weeks",
    value: "Within a few weeks",
  },
  {
    id: "urgent",
    label: "Safety concern",
    value: "Urgent safety concern",
  },
]);

export function pathwayFor(goal, propertyType) {
  return goal?.pathwaysByProperty?.[propertyType] || goal?.pathway || "";
}

export function normalizeProjectBlueprint(input) {
  if (
    !input ||
    typeof input !== "object" ||
    input.version !== 1 ||
    input.source !== "homepage-blueprint"
  ) {
    return null;
  }

  const goal = projectBlueprintGoals.find(
    (item) => item.id === input.goalId,
  );
  if (!goal || !projectBlueprintPropertyValues.has(input.propertyType)) {
    return null;
  }
  if (!requestTimings.includes(input.urgency)) return null;

  const pathway = pathwayFor(goal, input.propertyType);
  if (input.service !== goal.service || input.pathway !== pathway) {
    return null;
  }

  const validReadinessIds = new Set(
    (readinessChecklistByService[goal.service] || []).map(
      (item) => item.id,
    ),
  );
  const availableContextIds = Array.isArray(input.availableContextIds)
    ? [...new Set(input.availableContextIds)].filter((id) =>
        validReadinessIds.has(id),
      )
    : [];

  return {
    version: 1,
    source: "homepage-blueprint",
    goalId: goal.id,
    service: goal.service,
    pathway,
    propertyType: input.propertyType,
    urgency: input.urgency,
    availableContextIds,
  };
}

export function serializeProjectBlueprint(blueprint) {
  const normalized = normalizeProjectBlueprint(blueprint);
  if (!normalized) return "";

  const goal = projectBlueprintGoals.find(
    (item) => item.id === normalized.goalId,
  );
  const service = services.find(
    (item) => item.slug === normalized.service,
  );
  const readinessOptions =
    readinessChecklistByService[normalized.service] || [];
  const selectedItems = readinessOptions.filter((item) =>
    normalized.availableContextIds.includes(item.id),
  );
  const usefulItems = readinessOptions.filter(
    (item) => !normalized.availableContextIds.includes(item.id),
  );

  return [
    "MATKEN PROJECT BLUEPRINT",
    "Prepared privately in this browser",
    "",
    `Outcome: ${goal.label}`,
    `Suggested starting service: ${service.label}`,
    `Suggested planning category: ${normalized.pathway}`,
    `Property context: ${normalized.propertyType}`,
    `Timing: ${normalized.urgency}`,
    "",
    "Preparation already available:",
    ...(selectedItems.length
      ? selectedItems.map((item) => `- ${item.label}`)
      : ["- Nothing selected yet"]),
    "",
    "Useful items still worth gathering:",
    ...(usefulItems.length
      ? usefulItems.map((item) => `- ${item.label}`)
      : ["- The current preparation list is complete"]),
    "",
    "This blueprint is a customer-prepared planning brief. It is not a quote, diagnosis, appointment, availability promise, system design, safety clearance, or final work scope.",
    "Creating this Blueprint did not automatically send its project answers or preparation selections to Matken.",
  ].join("\n");
}
