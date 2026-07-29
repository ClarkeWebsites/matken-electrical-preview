const freezeOptions = (options) =>
  Object.freeze(options.map((option) => Object.freeze(option)));

const freezeGroups = (groups) =>
  Object.freeze(
    groups.map((group) =>
      Object.freeze({
        ...group,
        options: freezeOptions(group.options),
      }),
    ),
  );

const freezeGuidance = (guidance) =>
  Object.freeze({
    ...guidance,
    groups: freezeGroups(guidance.groups),
    photoPrompts: Object.freeze(
      guidance.photoPrompts.map((prompt) => Object.freeze(prompt)),
    ),
  });

export const requestGuidanceByService = Object.freeze({
  solar: freezeGuidance({
    title: "Shape the solar and backup conversation",
    intro:
      "Optional. Choose what best describes the project today. These answers organize follow-up; they do not size equipment or recommend a system.",
    groups: [
      {
        id: "energy-priority",
        label: "What should the first conversation prioritize?",
        help: "Choose the closest starting point.",
        multiple: false,
        options: [
          { id: "daytime-use", label: "Daytime electricity use" },
          { id: "essential-backup", label: "Backup for essential loads" },
          { id: "solar-and-backup", label: "Solar and backup together" },
          { id: "existing-system", label: "An existing solar or backup system" },
          { id: "not-sure", label: "Not sure yet" },
        ],
      },
      {
        id: "current-power-setup",
        label: "What power setup is already at the property?",
        help: "Choose one. Matken can confirm details during follow-up.",
        multiple: false,
        options: [
          { id: "grid-only", label: "Grid electricity only" },
          { id: "generator-or-inverter", label: "Generator or inverter backup" },
          { id: "solar-or-battery", label: "Solar panels or battery storage" },
          { id: "mixed-setup", label: "More than one existing source" },
          { id: "not-sure", label: "Not sure" },
        ],
      },
    ],
    photoPrompts: [
      {
        title: "Show the wider site",
        copy: "Photograph the roof or proposed ground area from a safe, accessible position.",
      },
      {
        title: "Show existing equipment",
        copy: "Include the meter, panel, inverter, generator, or battery only when safely visible.",
      },
      {
        title: "Capture readable labels",
        copy: "A clear equipment nameplate can help without opening covers or moving equipment.",
      },
    ],
  }),
  electrical: freezeGuidance({
    title: "Describe what you can safely observe",
    intro:
      "Optional. These prompts organize the affected area and observed condition. They do not provide a remote diagnosis or safety clearance.",
    groups: [
      {
        id: "affected-scope",
        label: "How much of the property appears affected?",
        help: "Choose the closest description.",
        multiple: false,
        options: [
          { id: "one-area", label: "One room or area" },
          { id: "several-areas", label: "Several rooms or areas" },
          { id: "one-equipment", label: "One appliance or piece of equipment" },
          { id: "whole-property", label: "Most or all of the property" },
          { id: "new-work", label: "New installation or planned upgrade" },
          { id: "not-sure", label: "Not sure" },
        ],
      },
      {
        id: "safe-observation",
        label: "What have you safely observed?",
        help:
          "Choose any that apply. Do not touch exposed parts, remove covers, or re-energize equipment for this form.",
        multiple: true,
        options: [
          { id: "no-power", label: "No power in the affected area" },
          { id: "intermittent", label: "Intermittent power or flickering" },
          { id: "breaker-operation", label: "A breaker switches off repeatedly" },
          { id: "equipment-change", label: "A new or changed electrical load" },
          {
            id: "urgent-hazard",
            label: "Smoke, unusual heat, burning smell, shock risk, or exposed parts",
          },
          { id: "other-observation", label: "Another observed condition" },
        ],
      },
    ],
    photoPrompts: [
      {
        title: "Start with context",
        copy: "Take one wider photo showing the affected room, area, or equipment location.",
      },
      {
        title: "Add a safe detail",
        copy: "Take a closer photo only from a safe distance and without touching electrical parts.",
      },
      {
        title: "Leave covers closed",
        copy: "Photograph labels only when already visible. Never remove a panel or equipment cover.",
      },
    ],
  }),
  construction: freezeGuidance({
    title: "Place the build in its current stage",
    intro:
      "Optional. These answers help organize coordination. They do not confirm scope, approvals, scheduling, or trade availability.",
    groups: [
      {
        id: "project-stage",
        label: "What stage is the project in?",
        help: "Choose the closest current stage.",
        multiple: false,
        options: [
          { id: "concept", label: "Early idea or concept" },
          { id: "drawings", label: "Drawings, approvals, or pricing" },
          { id: "active-build", label: "Active build or renovation" },
          { id: "finishing", label: "Finishing or handover stage" },
          { id: "not-sure", label: "Not sure" },
        ],
      },
      {
        id: "coordination",
        label: "Who is coordinating the work today?",
        help: "This can change later; choose the current arrangement.",
        multiple: false,
        options: [
          { id: "owner-led", label: "Owner or customer" },
          { id: "builder-led", label: "Builder or general contractor" },
          { id: "designer-led", label: "Architect, engineer, or designer" },
          { id: "shared", label: "Shared between several people" },
          { id: "not-chosen", label: "Not chosen yet" },
        ],
      },
    ],
    photoPrompts: [
      {
        title: "Show the whole work area",
        copy: "A wider photo helps explain access, current stage, and nearby finished spaces.",
      },
      {
        title: "Show the project stage",
        copy: "Capture framing, rough-in, finishes, or existing conditions without entering an unsafe area.",
      },
      {
        title: "Keep documents separate",
        copy: "Do not photograph private approvals, IDs, signatures, or account details for this local preview.",
      },
    ],
  }),
});

export const LOCAL_PHOTO_LIMIT = 4;
export const LOCAL_PHOTO_MAX_BYTES = 8 * 1024 * 1024;

const imageExtensionPattern = /\.(?:avif|gif|heic|heif|jpe?g|png|webp)$/i;

const fileSignature = (file) =>
  `${String(file?.name || "").toLowerCase()}::${Number(file?.size) || 0}::${
    Number(file?.lastModified) || 0
  }`;

const isImageFile = (file) =>
  String(file?.type || "").startsWith("image/") ||
  imageExtensionPattern.test(String(file?.name || ""));

export function guidanceForService(service) {
  return requestGuidanceByService[service] || null;
}

export function toggleGuidedResponse(
  service,
  responses,
  groupId,
  optionId,
) {
  const guidance = guidanceForService(service);
  const group = guidance?.groups.find((item) => item.id === groupId);
  if (!group?.options.some((option) => option.id === optionId)) {
    return responses;
  }

  const current = Array.isArray(responses?.[groupId])
    ? responses[groupId]
    : [];
  const nextValues = group.multiple
    ? current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId]
    : [optionId];

  return {
    ...responses,
    [groupId]: nextValues,
  };
}

export function normalizeGuidedResponses(service, responses) {
  const guidance = guidanceForService(service);
  if (!guidance || !responses || typeof responses !== "object") return {};

  return guidance.groups.reduce((normalized, group) => {
    const allowed = new Set(group.options.map((option) => option.id));
    const values = Array.isArray(responses[group.id])
      ? responses[group.id].filter(
          (value, index, all) =>
            allowed.has(value) && all.indexOf(value) === index,
        )
      : [];
    const bounded = group.multiple ? values : values.slice(0, 1);
    if (bounded.length) normalized[group.id] = bounded;
    return normalized;
  }, {});
}

export function guidedResponseSummary(service, responses) {
  const guidance = guidanceForService(service);
  const normalized = normalizeGuidedResponses(service, responses);
  if (!guidance) return [];

  return guidance.groups.flatMap((group) => {
    const selected = normalized[group.id] || [];
    if (!selected.length) return [];
    const labels = selected.flatMap((selectedId) => {
      const option = group.options.find((item) => item.id === selectedId);
      return option ? [option.label] : [];
    });
    return labels.length
      ? [{ id: group.id, label: group.label, answers: labels }]
      : [];
  });
}

export function hasGuidedSafetyConcern(service, responses) {
  if (service !== "electrical") return false;
  return normalizeGuidedResponses(service, responses)[
    "safe-observation"
  ]?.includes("urgent-hazard");
}

export function validateLocalPhotoSelection(
  selectedFiles,
  existingFiles = [],
) {
  const accepted = [];
  const rejected = [];
  const seen = new Set(existingFiles.map(fileSignature));
  let remaining = Math.max(0, LOCAL_PHOTO_LIMIT - existingFiles.length);

  for (const file of Array.from(selectedFiles || [])) {
    const name = String(file?.name || "Unnamed file");
    const signature = fileSignature(file);

    if (!isImageFile(file)) {
      rejected.push(`${name}: choose an image file.`);
      continue;
    }
    if (!Number.isFinite(file?.size) || file.size <= 0) {
      rejected.push(`${name}: the file is empty or unavailable.`);
      continue;
    }
    if (file.size > LOCAL_PHOTO_MAX_BYTES) {
      rejected.push(`${name}: larger than the 8 MB local-preview limit.`);
      continue;
    }
    if (seen.has(signature)) {
      rejected.push(`${name}: already selected.`);
      continue;
    }
    if (remaining === 0) {
      rejected.push(
        `${name}: only ${LOCAL_PHOTO_LIMIT} local reference photos can be prepared.`,
      );
      continue;
    }

    accepted.push(file);
    seen.add(signature);
    remaining -= 1;
  }

  return { accepted, rejected };
}

export function moveLocalPhoto(items, id, direction) {
  const index = items.findIndex((item) => item.id === id);
  const targetIndex = index + direction;
  if (
    index < 0 ||
    ![-1, 1].includes(direction) ||
    targetIndex < 0 ||
    targetIndex >= items.length
  ) {
    return items;
  }

  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export function formatLocalPhotoSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
