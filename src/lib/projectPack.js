import {
  essentialLoadItems,
  readinessChecklistByService,
  services,
} from "../data/site.js";
import {
  normalizeProjectBlueprint,
  projectBlueprintGoals,
  serializeProjectBlueprint,
} from "./projectBlueprintModel.js";
import { normalizePlannerPayload } from "./plannerModel.js";

export const PROJECT_PACK_STORAGE_KEY = "matken-project-pack-planning-v1";

const loadItemById = new Map(
  essentialLoadItems.map((item) => [item.id, item]),
);

const normalizeReadiness = (input) => {
  if (!input || typeof input !== "object") return null;
  const service = services.find((item) => item.slug === input.service);
  if (!service) return null;

  const options = readinessChecklistByService[service.slug] || [];
  const allowedIds = new Set(options.map((item) => item.id));
  const availableContextIds = Array.isArray(input.availableContextIds)
    ? [...new Set(input.availableContextIds)].filter((id) =>
        allowedIds.has(id),
      )
    : [];

  return {
    service: service.slug,
    availableContextIds,
  };
};

export function normalizeProjectPackPlanning(input) {
  const source = input && typeof input === "object" ? input : {};
  const blueprint = normalizeProjectBlueprint(source.blueprint);
  const planner = normalizePlannerPayload(source.planner);
  const readiness = normalizeReadiness(source.readiness);

  return {
    version: 1,
    blueprint,
    planner,
    readiness,
  };
}

export function readProjectPackPlanning(
  storage = globalThis.sessionStorage,
) {
  try {
    const parsed = JSON.parse(
      storage?.getItem(PROJECT_PACK_STORAGE_KEY) || "null",
    );
    if (parsed?.version !== 1) {
      return normalizeProjectPackPlanning(null);
    }
    return normalizeProjectPackPlanning(parsed);
  } catch {
    return normalizeProjectPackPlanning(null);
  }
}

export function mergeProjectPackPlanning(
  patch,
  storage = globalThis.sessionStorage,
) {
  const current = readProjectPackPlanning(storage);
  const source = patch && typeof patch === "object" ? patch : {};
  const merged = normalizeProjectPackPlanning({
    blueprint:
      source.blueprint !== undefined ? source.blueprint : current.blueprint,
    planner:
      source.planner !== undefined ? source.planner : current.planner,
    readiness:
      source.readiness !== undefined ? source.readiness : current.readiness,
  });

  try {
    storage?.setItem(PROJECT_PACK_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Session storage can be unavailable in strict privacy modes. The caller
    // still receives the normalized in-memory pack.
  }
  return merged;
}

export function clearProjectPackPlanning(
  storage = globalThis.sessionStorage,
) {
  try {
    storage?.removeItem(PROJECT_PACK_STORAGE_KEY);
  } catch {
    // Nothing else is required when storage is unavailable.
  }
}

const safeRequestSummary = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 20_000);
};

const safeReference = (value) => {
  const reference = String(value || "").trim();
  return /^[a-z0-9_-]{6,64}$/i.test(reference) ? reference : "";
};

let requestTransferCounter = 0;
const requestTransfers = new Map();

export function stageProjectPackRequestTransfer({
  requestSummary,
  requestReference,
} = {}) {
  requestTransferCounter = (requestTransferCounter + 1) % 1_000_000;
  const key = `mp-${Date.now().toString(36)}-${requestTransferCounter.toString(36)}`;
  requestTransfers.clear();
  requestTransfers.set(
    key,
    Object.freeze({
      requestSummary: safeRequestSummary(requestSummary),
      requestReference: safeReference(requestReference),
    }),
  );
  return key;
}

export function readProjectPackRequestTransfer(key) {
  if (typeof key !== "string" || !/^mp-[a-z0-9]+-[a-z0-9]+$/i.test(key)) {
    return { requestSummary: "", requestReference: "" };
  }
  return (
    requestTransfers.get(key) || {
      requestSummary: "",
      requestReference: "",
    }
  );
}

export function clearProjectPackRequestTransfer(key) {
  if (typeof key === "string") requestTransfers.delete(key);
}

export function createProjectPack({
  planning,
  requestSummary,
  requestReference,
} = {}) {
  return {
    version: 1,
    planning: normalizeProjectPackPlanning(planning),
    requestSummary: safeRequestSummary(requestSummary),
    requestReference: safeReference(requestReference),
  };
}

const plannerLines = (planner) => {
  if (!planner) return [];
  const lines = [
    "SOLAR & BACKUP PLANNING RANGE",
    `Monthly electricity use: ${planner.monthlyKwh} kWh`,
    `Essential running load: ${planner.essentialKw} kW`,
    `Backup target: ${planner.outageHours} hours`,
    `Planning panel size: ${planner.panelWatts} W`,
    `Starting solar range: ${planner.result.startingSolarKw.toFixed(1)} kW`,
    `Approximate module count: ${planner.result.panelCount}`,
    `Nominal battery range: ${planner.result.nominalBatteryKwh.toFixed(1)} kWh`,
  ];

  if (planner.loadPlan.source === "builder" && planner.loadPlan.items.length) {
    lines.push("", "Illustrated outage routine:");
    planner.loadPlan.items.forEach((item) => {
      const catalogItem = loadItemById.get(item.id);
      if (!catalogItem) return;
      lines.push(
        `- ${item.quantity} × ${catalogItem.label} at ${item.watts} W, starting after ${item.startHour || 0} h for ${item.hours || planner.outageHours} h`,
      );
    });
  }

  lines.push(
    "",
    "Educational estimate only. It is not a design, quote, equipment recommendation, or performance guarantee.",
  );
  return lines;
};

const readinessLines = (readiness) => {
  if (!readiness) return [];
  const service = services.find((item) => item.slug === readiness.service);
  const options = readinessChecklistByService[readiness.service] || [];
  const selected = options.filter((item) =>
    readiness.availableContextIds.includes(item.id),
  );
  const remaining = options.filter(
    (item) => !readiness.availableContextIds.includes(item.id),
  );
  return [
    "PROJECT READINESS",
    `Service path: ${service?.label || readiness.service}`,
    "",
    "Already available:",
    ...(selected.length
      ? selected.map((item) => `- ${item.label}`)
      : ["- Nothing selected yet"]),
    "",
    "Still useful to gather:",
    ...(remaining.length
      ? remaining.map((item) => `- ${item.label}`)
      : ["- The current preparation list is complete"]),
  ];
};

export function buildProjectPackText(packInput) {
  const pack = createProjectPack(packInput);
  const sections = [];
  if (pack.planning.blueprint) {
    sections.push(serializeProjectBlueprint(pack.planning.blueprint));
  }
  if (pack.planning.planner) {
    sections.push(plannerLines(pack.planning.planner).join("\n"));
  }
  if (pack.planning.readiness) {
    sections.push(readinessLines(pack.planning.readiness).join("\n"));
  }
  if (pack.requestSummary) {
    sections.push(
      [
        "PROJECT REQUEST SUMMARY",
        pack.requestReference
          ? `Reference: ${pack.requestReference}`
          : "Prepared in this browser",
        "",
        pack.requestSummary,
      ].join("\n"),
    );
  }

  return [
    "MATKEN PROJECT PACK",
    "Electrical · Solar · Construction",
    "",
    ...(sections.length
      ? sections.flatMap((section, index) => [
          ...(index ? ["", "────────────────────────────────────", ""] : []),
          section,
        ])
      : ["No project details have been added yet."]),
    "",
    "IMPORTANT BOUNDARY",
    "This customer-prepared pack organizes an initial conversation. It is not a quote, contract, appointment, diagnosis, design, safety clearance, approval, schedule, or final work scope.",
  ].join("\n");
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export function buildProjectPackHtml(packInput) {
  const pack = createProjectPack(packInput);
  const text = buildProjectPackText(pack);
  return `<!doctype html>
<html lang="en-JM">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Matken Project Pack${pack.requestReference ? ` ${escapeHtml(pack.requestReference)}` : ""}</title>
  <style>
    :root{font-family:Arial,sans-serif;color:#0a1c34;background:#eef2f6}
    *{box-sizing:border-box}
    body{margin:0;padding:40px 20px}
    main{max-width:860px;margin:auto;background:#fff;box-shadow:0 18px 45px rgba(6,24,49,.12)}
    header{display:flex;align-items:center;gap:22px;padding:34px 42px;border-bottom:6px solid #cf2630;background:#061831;color:#fff}
    .mark{width:66px;height:66px;flex:none}
    h1{margin:0;font-size:31px;letter-spacing:-1px}
    header p{margin:5px 0 0;color:rgba(255,255,255,.72);font-size:12px;letter-spacing:2px;text-transform:uppercase}
    pre{padding:42px;margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.65 Arial,sans-serif}
    footer{padding:20px 42px;background:#f5f7f8;color:#5b687a;font-size:11px;line-height:1.5}
    @media print{body{padding:0;background:#fff}main{max-width:none;box-shadow:none}}
  </style>
</head>
<body>
  <main>
    <header>
      <svg class="mark" viewBox="0 0 96 96" aria-hidden="true">
        <path d="M15 82V16L48 50L81 16V82" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="square" stroke-linejoin="bevel"/>
        <rect x="41.5" y="43.5" width="13" height="13" rx="1.5" fill="#CF2630"/>
      </svg>
      <div><h1>MATKEN PROJECT PACK</h1><p>Electrical · Solar · Construction</p></div>
    </header>
    <pre>${escapeHtml(text)}</pre>
    <footer>Prepared locally from customer-entered planning information. Review details with Matken before relying on them for project decisions.</footer>
  </main>
</body>
</html>`;
}

export function projectPackDisplayData(planningInput) {
  const planning = normalizeProjectPackPlanning(planningInput);
  const blueprintGoal = planning.blueprint
    ? projectBlueprintGoals.find(
        (item) => item.id === planning.blueprint.goalId,
      )
    : null;
  const blueprintService = planning.blueprint
    ? services.find((item) => item.slug === planning.blueprint.service)
    : null;
  const readinessOptions = planning.readiness
    ? readinessChecklistByService[planning.readiness.service] || []
    : [];
  return {
    planning,
    blueprintGoal,
    blueprintService,
    readinessSelected: readinessOptions.filter((item) =>
      planning.readiness?.availableContextIds.includes(item.id),
    ),
    readinessRemaining: readinessOptions.filter(
      (item) => !planning.readiness?.availableContextIds.includes(item.id),
    ),
  };
}
