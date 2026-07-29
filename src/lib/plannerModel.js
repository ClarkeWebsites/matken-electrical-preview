import { essentialLoadItems } from "../data/site.js";

export const PLANNER_DEFAULTS = Object.freeze({
  monthlyKwh: 450,
  essentialKw: 1.2,
  outageHours: 6,
  panelWatts: 450,
});

export const PLANNER_LIMITS = Object.freeze({
  monthlyKwh: Object.freeze({ min: 30, max: 3000 }),
  essentialKw: Object.freeze({ min: 0.2, max: 10 }),
  outageHours: Object.freeze({ min: 1, max: 24 }),
});

export const PANEL_WATT_OPTIONS = Object.freeze([400, 450, 500, 550]);
export const MAX_PLANNER_SCENARIOS = 3;

const scenarioIds = Object.freeze(["plan-a", "plan-b", "plan-c"]);
const scenarioLabels = Object.freeze({
  "plan-a": "Plan A",
  "plan-b": "Plan B",
  "plan-c": "Plan C",
});
const loadItemById = new Map(
  essentialLoadItems.map((item) => [item.id, item]),
);
const numberFormatters = new Map();

export const clampPlannerNumber = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

export const boundedPlannerInteger = (value, fallback, min, max) => {
  if (value === "") return fallback;
  return Math.round(clampPlannerNumber(value, fallback, min, max));
};

export function formatPlannerValue(value, digits = 1) {
  if (!numberFormatters.has(digits)) {
    numberFormatters.set(
      digits,
      new Intl.NumberFormat("en-JM", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }),
    );
  }
  return numberFormatters.get(digits).format(value);
}

export function normalizePlannerInputs(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const monthlyLimit = PLANNER_LIMITS.monthlyKwh;
  const essentialLimit = PLANNER_LIMITS.essentialKw;
  const outageLimit = PLANNER_LIMITS.outageHours;
  const requestedPanel = Number(source.panelWatts);

  return {
    monthlyKwh: clampPlannerNumber(
      source.monthlyKwh,
      PLANNER_DEFAULTS.monthlyKwh,
      monthlyLimit.min,
      monthlyLimit.max,
    ),
    essentialKw: clampPlannerNumber(
      source.essentialKw,
      PLANNER_DEFAULTS.essentialKw,
      essentialLimit.min,
      essentialLimit.max,
    ),
    outageHours: clampPlannerNumber(
      source.outageHours,
      PLANNER_DEFAULTS.outageHours,
      outageLimit.min,
      outageLimit.max,
    ),
    panelWatts: PANEL_WATT_OPTIONS.includes(requestedPanel)
      ? requestedPanel
      : PLANNER_DEFAULTS.panelWatts,
  };
}

export function plannerInputsFromSearch(search = "") {
  const parameters = new URLSearchParams(search);
  const parameterValue = (key) =>
    parameters.has(key) ? parameters.get(key) : undefined;

  return normalizePlannerInputs({
    monthlyKwh: parameterValue("monthly"),
    essentialKw: parameterValue("essential"),
    outageHours: parameterValue("hours"),
    panelWatts: parameterValue("panel"),
  });
}

export function calculatePlannerResult(input) {
  const normalized = normalizePlannerInputs(input);
  const dailyKwh = normalized.monthlyKwh / 30;
  const startingSolarKw = dailyKwh / (4.5 * 0.8);
  const usableBackupKwh =
    normalized.essentialKw * normalized.outageHours;
  const nominalBatteryKwh = usableBackupKwh / (0.9 * 0.8);
  const panelCount = Math.ceil(
    (startingSolarKw * 1000) / normalized.panelWatts,
  );

  return {
    dailyKwh,
    startingSolarKw,
    usableBackupKwh,
    nominalBatteryKwh,
    panelCount,
  };
}

export function createLoadEntries(loadPlan) {
  const entries = Object.fromEntries(
    essentialLoadItems.map((item) => [
      item.id,
      {
        selected: false,
        quantity: 1,
        watts: item.defaultWatts,
      },
    ]),
  );

  if (loadPlan?.source !== "builder" || !Array.isArray(loadPlan.items)) {
    return entries;
  }

  loadPlan.items.forEach((item) => {
    const catalogItem = loadItemById.get(item?.id);
    if (!catalogItem) return;
    entries[catalogItem.id] = {
      selected: true,
      quantity: boundedPlannerInteger(
        item.quantity,
        1,
        1,
        catalogItem.maxQuantity,
      ),
      watts: boundedPlannerInteger(
        item.watts,
        catalogItem.defaultWatts,
        1,
        5000,
      ),
    };
  });

  return entries;
}

export function selectedLoadItemsFromEntries(entries = {}) {
  return essentialLoadItems.flatMap((item) => {
    const entry = entries[item.id];
    if (!entry?.selected) return [];

    const quantity = boundedPlannerInteger(
      entry.quantity,
      1,
      1,
      item.maxQuantity,
    );
    const watts = boundedPlannerInteger(
      entry.watts,
      item.defaultWatts,
      1,
      5000,
    );

    return [
      {
        id: item.id,
        label: item.label,
        quantity,
        watts,
        subtotalWatts: quantity * watts,
      },
    ];
  });
}

function normalizedLoadPlan(plan, essentialKw) {
  const seenIds = new Set();
  const items = Array.isArray(plan?.loadPlan?.items)
    ? plan.loadPlan.items.flatMap((item) => {
        const catalogItem = loadItemById.get(item?.id);
        if (!catalogItem || seenIds.has(catalogItem.id)) return [];
        seenIds.add(catalogItem.id);

        return [
          {
            id: catalogItem.id,
            quantity: boundedPlannerInteger(
              item.quantity,
              1,
              1,
              catalogItem.maxQuantity,
            ),
            watts: boundedPlannerInteger(
              item.watts,
              catalogItem.defaultWatts,
              1,
              5000,
            ),
          },
        ];
      })
    : [];
  const totalWatts = items.reduce(
    (total, item) => total + item.quantity * item.watts,
    0,
  );
  const expectedAppliedKw = Math.max(
    PLANNER_LIMITS.essentialKw.min,
    Math.ceil((totalWatts / 1000) * 10) / 10,
  );
  const builderIsConsistent =
    plan?.loadPlan?.source === "builder" &&
    items.length > 0 &&
    totalWatts <= PLANNER_LIMITS.essentialKw.max * 1000 &&
    Math.abs(expectedAppliedKw - essentialKw) < 0.051;

  return builderIsConsistent
    ? {
        version: 1,
        source: "builder",
        items,
        totalWatts,
        appliedKw: essentialKw,
      }
    : {
        version: 1,
        source: "manual",
        items: [],
        totalWatts: null,
        appliedKw: essentialKw,
      };
}

export function normalizePlannerPayload(plan) {
  if (!plan || typeof plan !== "object") return null;

  const inputs = normalizePlannerInputs(plan);
  return {
    version: 1,
    ...inputs,
    result: calculatePlannerResult(inputs),
    loadPlan: normalizedLoadPlan(plan, inputs.essentialKw),
  };
}

function scenarioCandidate(scenario) {
  const selectedItems = selectedLoadItemsFromEntries(scenario?.loadEntries);
  return {
    ...(scenario?.inputs || PLANNER_DEFAULTS),
    loadPlan: {
      version: 1,
      source: scenario?.loadPlanSource,
      items: selectedItems.map(({ id, quantity, watts }) => ({
        id,
        quantity,
        watts,
      })),
    },
  };
}

export function plannerPayloadForScenario(scenario) {
  return normalizePlannerPayload(scenarioCandidate(scenario));
}

export function plannerTransferForScenario(scenario) {
  const payload = plannerPayloadForScenario(scenario);
  if (!payload) return null;

  return {
    version: payload.version,
    monthlyKwh: payload.monthlyKwh,
    essentialKw: payload.essentialKw,
    outageHours: payload.outageHours,
    panelWatts: payload.panelWatts,
    loadPlan: payload.loadPlan,
  };
}

function cloneLoadEntries(entries) {
  return Object.fromEntries(
    Object.entries(entries).map(([id, entry]) => [id, { ...entry }]),
  );
}

function createScenario(id, inputs, loadPlan) {
  const normalizedPayload = normalizePlannerPayload({
    ...inputs,
    loadPlan,
  });
  return {
    id,
    label: scenarioLabels[id],
    inputs: normalizePlannerInputs(normalizedPayload || inputs),
    loadEntries: createLoadEntries(normalizedPayload?.loadPlan),
    loadPlanSource: normalizedPayload?.loadPlan.source || "manual",
  };
}

export function createInitialPlannerScenarioState(inputs = PLANNER_DEFAULTS) {
  return {
    version: 1,
    activeId: scenarioIds[0],
    scenarios: [createScenario(scenarioIds[0], inputs)],
  };
}

export function activePlannerScenario(state) {
  return (
    state.scenarios.find((scenario) => scenario.id === state.activeId) ||
    state.scenarios[0]
  );
}

export function nextPlannerScenarioId(state) {
  return (
    scenarioIds.find(
      (id) => !state.scenarios.some((scenario) => scenario.id === id),
    ) || null
  );
}

function updateScenario(state, id, update) {
  return {
    ...state,
    scenarios: state.scenarios.map((scenario) =>
      scenario.id === id ? update(scenario) : scenario,
    ),
  };
}

export function plannerScenarioReducer(state, action) {
  switch (action.type) {
    case "SET_ACTIVE":
      return state.scenarios.some(
        (scenario) => scenario.id === action.id,
      )
        ? { ...state, activeId: action.id }
        : state;

    case "CLONE_ACTIVE": {
      const nextId = nextPlannerScenarioId(state);
      const active = activePlannerScenario(state);
      if (
        !nextId ||
        state.scenarios.length >= MAX_PLANNER_SCENARIOS ||
        action.id !== nextId
      ) {
        return state;
      }

      return {
        ...state,
        activeId: nextId,
        scenarios: [
          ...state.scenarios,
          {
            ...active,
            id: nextId,
            label: scenarioLabels[nextId],
            inputs: { ...active.inputs },
            loadEntries: cloneLoadEntries(active.loadEntries),
          },
        ],
      };
    }

    case "REMOVE_SCENARIO": {
      if (
        action.id === scenarioIds[0] ||
        state.scenarios.length === 1
      ) {
        return state;
      }
      const scenarios = state.scenarios.filter(
        (scenario) => scenario.id !== action.id,
      );
      if (scenarios.length === state.scenarios.length) return state;
      return {
        ...state,
        scenarios,
        activeId:
          state.activeId === action.id ? scenarios[0].id : state.activeId,
      };
    }

    case "SET_INPUT":
      return updateScenario(state, state.activeId, (scenario) => ({
        ...scenario,
        inputs: normalizePlannerInputs({
          ...scenario.inputs,
          [action.field]: action.value,
        }),
        loadPlanSource:
          action.field === "essentialKw"
            ? "manual"
            : scenario.loadPlanSource,
      }));

    case "PATCH_LOAD_ENTRY":
      if (!loadItemById.has(action.id)) return state;
      return updateScenario(state, state.activeId, (scenario) => ({
        ...scenario,
        loadPlanSource: "manual",
        loadEntries: {
          ...scenario.loadEntries,
          [action.id]: {
            ...scenario.loadEntries[action.id],
            ...action.patch,
          },
        },
      }));

    case "APPLY_SELECTED_LOAD":
      return updateScenario(state, state.activeId, (scenario) => ({
        ...scenario,
        inputs: normalizePlannerInputs({
          ...scenario.inputs,
          essentialKw: action.essentialKw,
        }),
        loadPlanSource: "builder",
      }));

    default:
      return state;
  }
}
