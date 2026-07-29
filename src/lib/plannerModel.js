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
export const MIN_BILL_HISTORY_MONTHS = 3;
export const MAX_BILL_HISTORY_MONTHS = 12;

const scenarioIds = Object.freeze(["plan-a", "plan-b", "plan-c"]);
const scenarioLabels = Object.freeze({
  "plan-a": "Plan A",
  "plan-b": "Plan B",
  "plan-c": "Plan C",
});
const loadItemById = new Map(
  essentialLoadItems.map((item) => [item.id, item]),
);
const loadItemIndexById = new Map(
  essentialLoadItems.map((item, index) => [item.id, index]),
);
const numberFormatters = new Map();
const MAX_RESUME_STATE_LENGTH = 12000;

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

const defaultBillHistory = () =>
  Array.from({ length: MIN_BILL_HISTORY_MONTHS }, () => "");

const normalizeBillHistory = (history) => {
  if (!Array.isArray(history)) return defaultBillHistory();
  const values = history
    .slice(0, MAX_BILL_HISTORY_MONTHS)
    .map((value) => {
      if (value === "" || value === null || value === undefined) return "";
      const parsed = Number(value);
      if (
        !Number.isFinite(parsed) ||
        parsed < PLANNER_LIMITS.monthlyKwh.min ||
        parsed > PLANNER_LIMITS.monthlyKwh.max
      ) {
        return "";
      }
      return parsed;
    });
  while (values.length < MIN_BILL_HISTORY_MONTHS) values.push("");
  return values;
};

export function calculateBillHistoryStats(
  history,
  panelWatts = PLANNER_DEFAULTS.panelWatts,
) {
  const values = (Array.isArray(history) ? history : [])
    .slice(0, MAX_BILL_HISTORY_MONTHS)
    .map(Number)
    .filter(
      (value) =>
        Number.isFinite(value) &&
        value >= PLANNER_LIMITS.monthlyKwh.min &&
        value <= PLANNER_LIMITS.monthlyKwh.max,
    );
  const count = values.length;
  if (count < MIN_BILL_HISTORY_MONTHS) {
    return {
      ready: false,
      count,
      requiredCount: MIN_BILL_HISTORY_MONTHS,
    };
  }

  const minKwh = Math.min(...values);
  const maxKwh = Math.max(...values);
  const averageKwh =
    values.reduce((total, value) => total + value, 0) / count;
  const resultFor = (monthlyKwh) =>
    calculatePlannerResult({
      ...PLANNER_DEFAULTS,
      monthlyKwh,
      panelWatts,
    });

  return {
    ready: true,
    count,
    minKwh,
    averageKwh,
    maxKwh,
    solarRange: {
      min: resultFor(minKwh),
      average: resultFor(averageKwh),
      max: resultFor(maxKwh),
    },
  };
}

export function createLoadEntries(
  loadPlan,
  outageHours = PLANNER_DEFAULTS.outageHours,
) {
  const normalizedOutageHours = boundedPlannerInteger(
    outageHours,
    PLANNER_DEFAULTS.outageHours,
    PLANNER_LIMITS.outageHours.min,
    PLANNER_LIMITS.outageHours.max,
  );
  const entries = Object.fromEntries(
    essentialLoadItems.map((item) => [
      item.id,
      {
        selected: false,
        quantity: 1,
        watts: item.defaultWatts,
        hours: normalizedOutageHours,
        startHour: 0,
      },
    ]),
  );

  if (loadPlan?.source !== "builder" || !Array.isArray(loadPlan.items)) {
    return entries;
  }

  loadPlan.items.forEach((item) => {
    const catalogItem = loadItemById.get(item?.id);
    if (!catalogItem) return;
    const startHour = boundedPlannerInteger(
      item.startHour,
      0,
      0,
      Math.max(0, normalizedOutageHours - 1),
    );
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
      hours: boundedPlannerInteger(
        item.hours,
        normalizedOutageHours - startHour,
        1,
        normalizedOutageHours - startHour,
      ),
      startHour,
    };
  });

  return entries;
}

export function selectedLoadItemsFromEntries(
  entries = {},
  outageHours = PLANNER_DEFAULTS.outageHours,
) {
  const normalizedOutageHours = boundedPlannerInteger(
    outageHours,
    PLANNER_DEFAULTS.outageHours,
    PLANNER_LIMITS.outageHours.min,
    PLANNER_LIMITS.outageHours.max,
  );
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
    const startHour = boundedPlannerInteger(
      entry.startHour,
      0,
      0,
      Math.max(0, normalizedOutageHours - 1),
    );
    const requestedHours = boundedPlannerInteger(
      entry.hours,
      normalizedOutageHours,
      1,
      normalizedOutageHours,
    );
    const hours = Math.min(
      requestedHours,
      normalizedOutageHours - startHour,
    );
    const subtotalWatts = quantity * watts;

    return [
      {
        id: item.id,
        label: item.label,
        quantity,
        watts,
        subtotalWatts,
        hours,
        startHour,
        energyKwh: (subtotalWatts * hours) / 1000,
      },
    ];
  });
}

export function buildOutageRoutine(
  selectedItems = [],
  outageHours = PLANNER_DEFAULTS.outageHours,
) {
  const hours = boundedPlannerInteger(
    outageHours,
    PLANNER_DEFAULTS.outageHours,
    PLANNER_LIMITS.outageHours.min,
    PLANNER_LIMITS.outageHours.max,
  );
  const slots = Array.from({ length: hours }, (_, hour) => {
    const activeItems = selectedItems.filter(
      (item) =>
        item.startHour <= hour && hour < item.startHour + item.hours,
    );
    return {
      hour,
      activeItems,
      runningWatts: activeItems.reduce(
        (total, item) => total + item.subtotalWatts,
        0,
      ),
    };
  });
  const segments = slots.reduce((groups, slot) => {
    const signature = slot.activeItems.map((item) => item.id).join("|");
    const previous = groups.at(-1);
    if (
      previous &&
      previous.signature === signature &&
      previous.runningWatts === slot.runningWatts
    ) {
      previous.endHour = slot.hour + 1;
      return groups;
    }
    groups.push({
      signature,
      startHour: slot.hour,
      endHour: slot.hour + 1,
      runningWatts: slot.runningWatts,
      activeItems: slot.activeItems,
    });
    return groups;
  }, []);

  return {
    hours,
    slots,
    segments,
    activeHours: slots.filter((slot) => slot.runningWatts > 0).length,
    peakWatts: slots.reduce(
      (peak, slot) => Math.max(peak, slot.runningWatts),
      0,
    ),
    energyKwh:
      slots.reduce((total, slot) => total + slot.runningWatts, 0) / 1000,
    allAtOnceWatts: selectedItems.reduce(
      (total, item) => total + item.subtotalWatts,
      0,
    ),
  };
}

function normalizedLoadPlan(plan, essentialKw, outageHours) {
  const hasSchedule = plan?.loadPlan?.scheduleVersion === 1;
  const seenIds = new Set();
  const items = Array.isArray(plan?.loadPlan?.items)
    ? plan.loadPlan.items.flatMap((item) => {
        const catalogItem = loadItemById.get(item?.id);
        if (!catalogItem || seenIds.has(catalogItem.id)) return [];
        seenIds.add(catalogItem.id);

        const normalizedItem = {
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
        };
        if (hasSchedule) {
          normalizedItem.hours = boundedPlannerInteger(
            item.hours,
            outageHours,
            1,
            outageHours,
          );
          normalizedItem.startHour = boundedPlannerInteger(
            item.startHour,
            0,
            0,
            Math.max(0, outageHours - 1),
          );
          normalizedItem.hours = Math.min(
            normalizedItem.hours,
            outageHours - normalizedItem.startHour,
          );
        }
        return [normalizedItem];
      })
    : [];
  const allAtOnceWatts = items.reduce(
    (total, item) => total + item.quantity * item.watts,
    0,
  );
  const scheduledItems = items.map((item) => ({
    ...item,
    label: loadItemById.get(item.id)?.label || item.id,
    subtotalWatts: item.quantity * item.watts,
    hours: hasSchedule ? item.hours : outageHours,
    startHour: hasSchedule ? item.startHour : 0,
  }));
  const routine = buildOutageRoutine(scheduledItems, outageHours);
  const totalWatts = hasSchedule ? routine.peakWatts : allAtOnceWatts;
  const expectedAppliedKw = Math.max(
    PLANNER_LIMITS.essentialKw.min,
    Math.ceil((totalWatts / 1000) * 10) / 10,
  );
  const builderIsConsistent =
    plan?.loadPlan?.source === "builder" &&
    items.length > 0 &&
    totalWatts <= PLANNER_LIMITS.essentialKw.max * 1000 &&
    Math.abs(expectedAppliedKw - essentialKw) < 0.051;

  if (builderIsConsistent) {
    return {
      version: 1,
      source: "builder",
      items,
      totalWatts,
      appliedKw: essentialKw,
      ...(hasSchedule
        ? {
            scheduleVersion: 1,
            allAtOnceWatts,
            scheduledEnergyKwh: routine.energyKwh,
          }
        : {}),
    };
  }

  return {
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
    loadPlan: normalizedLoadPlan(
      plan,
      inputs.essentialKw,
      boundedPlannerInteger(
        inputs.outageHours,
        PLANNER_DEFAULTS.outageHours,
        PLANNER_LIMITS.outageHours.min,
        PLANNER_LIMITS.outageHours.max,
      ),
    ),
  };
}

function scenarioCandidate(scenario) {
  const outageHours = boundedPlannerInteger(
    scenario?.inputs?.outageHours,
    PLANNER_DEFAULTS.outageHours,
    PLANNER_LIMITS.outageHours.min,
    PLANNER_LIMITS.outageHours.max,
  );
  const selectedItems = selectedLoadItemsFromEntries(
    scenario?.loadEntries,
    outageHours,
  );
  return {
    ...(scenario?.inputs || PLANNER_DEFAULTS),
    loadPlan: {
      version: 1,
      source: scenario?.loadPlanSource,
      scheduleVersion: 1,
      items: selectedItems.map(
        ({ id, quantity, watts, hours, startHour }) => ({
          id,
          quantity,
          watts,
          hours,
          startHour,
        }),
      ),
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

function createScenario(id, inputs, loadPlan, billHistory) {
  const normalizedPayload = normalizePlannerPayload({
    ...inputs,
    loadPlan,
  });
  return {
    id,
    label: scenarioLabels[id],
    inputs: normalizePlannerInputs(normalizedPayload || inputs),
    loadEntries: createLoadEntries(
      normalizedPayload?.loadPlan,
      normalizedPayload?.outageHours,
    ),
    loadPlanSource: normalizedPayload?.loadPlan.source || "manual",
    billHistory: normalizeBillHistory(billHistory),
  };
}

export function createInitialPlannerScenarioState(inputs = PLANNER_DEFAULTS) {
  return {
    version: 1,
    activeId: scenarioIds[0],
    scenarios: [createScenario(scenarioIds[0], inputs)],
  };
}

function plannerResumeCandidate(state) {
  const scenarios = Array.isArray(state?.scenarios)
    ? state.scenarios
        .filter((scenario, index, source) => {
          const id = scenario?.id;
          return (
            scenarioIds.includes(id) &&
            source.findIndex((candidate) => candidate?.id === id) === index
          );
        })
        .slice(0, MAX_PLANNER_SCENARIOS)
    : [];
  if (!scenarios.length) return null;

  return {
    v: 1,
    a: Math.max(
      0,
      scenarios.findIndex((scenario) => scenario.id === state.activeId),
    ),
    s: scenarios.map((scenario) => {
      const inputs = normalizePlannerInputs(scenario.inputs);
      const items = selectedLoadItemsFromEntries(
        scenario.loadEntries,
        inputs.outageHours,
      );
      return [
        inputs.monthlyKwh,
        inputs.essentialKw,
        inputs.outageHours,
        inputs.panelWatts,
        normalizeBillHistory(scenario.billHistory).map((value) =>
          value === "" ? null : Number(value),
        ),
        scenario.loadPlanSource === "builder" ? 1 : 0,
        items.map((item) => [
          loadItemIndexById.get(item.id),
          item.quantity,
          item.watts,
          item.hours,
          item.startHour,
        ]),
      ];
    }),
  };
}

export function plannerSearchParamsForState(state) {
  const active = activePlannerScenario(state);
  const inputs = normalizePlannerInputs(active?.inputs);
  const parameters = new URLSearchParams({
    monthly: String(inputs.monthlyKwh),
    essential: String(inputs.essentialKw),
    hours: String(inputs.outageHours),
    panel: String(inputs.panelWatts),
  });
  const candidate = plannerResumeCandidate(state);
  if (candidate) parameters.set("resume", JSON.stringify(candidate));
  return parameters;
}

function plannerStateFromResumeValue(value) {
  if (!value || value.length > MAX_RESUME_STATE_LENGTH) return null;
  try {
    const parsed = JSON.parse(value);
    if (
      parsed?.v !== 1 ||
      !Array.isArray(parsed.s) ||
      parsed.s.length < 1 ||
      parsed.s.length > MAX_PLANNER_SCENARIOS
    ) {
      return null;
    }

    const scenarios = parsed.s.map((encoded, index) => {
      if (!Array.isArray(encoded) || encoded.length < 7) {
        throw new Error("Invalid planner resume scenario");
      }
      const id = scenarioIds[index];
      const inputs = normalizePlannerInputs({
        monthlyKwh: encoded[0],
        essentialKw: encoded[1],
        outageHours: encoded[2],
        panelWatts: encoded[3],
      });
      const loadItems = Array.isArray(encoded[6])
        ? encoded[6].slice(0, essentialLoadItems.length).flatMap((item) => {
            if (!Array.isArray(item)) return [];
            const catalogItem = essentialLoadItems[Number(item[0])];
            if (!catalogItem) return [];
            return [
              {
                id: catalogItem.id,
                quantity: item[1],
                watts: item[2],
                hours: item[3],
                startHour: item[4],
              },
            ];
          })
        : [];
      const desiredSource = encoded[5] === 1 ? "builder" : "manual";
      const scenario = createScenario(
        id,
        inputs,
        {
          version: 1,
          source: desiredSource,
          scheduleVersion: 1,
          items: loadItems,
        },
        encoded[4],
      );
      return {
        ...scenario,
        inputs,
        loadEntries: createLoadEntries(
          {
            source: "builder",
            scheduleVersion: 1,
            items: loadItems,
          },
          inputs.outageHours,
        ),
        loadPlanSource:
          desiredSource === "builder"
            ? scenario.loadPlanSource
            : "manual",
      };
    });
    const activeIndex = boundedPlannerInteger(
      parsed.a,
      0,
      0,
      scenarios.length - 1,
    );
    return {
      version: 1,
      activeId: scenarios[activeIndex].id,
      scenarios,
    };
  } catch {
    return null;
  }
}

export function plannerScenarioStateFromSearch(search = "") {
  const parameters = new URLSearchParams(search);
  return (
    plannerStateFromResumeValue(parameters.get("resume")) ||
    createInitialPlannerScenarioState(plannerInputsFromSearch(search))
  );
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
            billHistory: [...active.billHistory],
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
      return updateScenario(state, state.activeId, (scenario) => {
        const inputs = normalizePlannerInputs({
          ...scenario.inputs,
          [action.field]: action.value,
        });
        const scheduleHours = boundedPlannerInteger(
          inputs.outageHours,
          PLANNER_DEFAULTS.outageHours,
          PLANNER_LIMITS.outageHours.min,
          PLANNER_LIMITS.outageHours.max,
        );
        const loadEntries =
          action.field === "outageHours"
            ? Object.fromEntries(
                Object.entries(scenario.loadEntries).map(([id, entry]) => {
                  const startHour = boundedPlannerInteger(
                    entry.startHour,
                    0,
                    0,
                    Math.max(0, scheduleHours - 1),
                  );
                  return [
                    id,
                    {
                      ...entry,
                      hours: boundedPlannerInteger(
                        entry.hours,
                        scheduleHours - startHour,
                        1,
                        scheduleHours - startHour,
                      ),
                      startHour,
                    },
                  ];
                }),
              )
            : scenario.loadEntries;
        return {
          ...scenario,
          inputs,
          loadEntries,
          loadPlanSource:
            action.field === "essentialKw"
              ? "manual"
              : scenario.loadPlanSource,
        };
      });

    case "SET_BILL_ENTRY":
      return updateScenario(state, state.activeId, (scenario) => {
        if (
          !Number.isInteger(action.index) ||
          action.index < 0 ||
          action.index >= scenario.billHistory.length
        ) {
          return scenario;
        }
        const billHistory = [...scenario.billHistory];
        billHistory[action.index] =
          action.value === "" ? "" : action.value;
        return { ...scenario, billHistory };
      });

    case "ADD_BILL_ENTRY":
      return updateScenario(state, state.activeId, (scenario) =>
        scenario.billHistory.length >= MAX_BILL_HISTORY_MONTHS
          ? scenario
          : {
              ...scenario,
              billHistory: [...scenario.billHistory, ""],
            },
      );

    case "REMOVE_BILL_ENTRY":
      return updateScenario(state, state.activeId, (scenario) => {
        if (
          scenario.billHistory.length <= MIN_BILL_HISTORY_MONTHS ||
          !Number.isInteger(action.index) ||
          action.index < 0 ||
          action.index >= scenario.billHistory.length
        ) {
          return scenario;
        }
        return {
          ...scenario,
          billHistory: scenario.billHistory.filter(
            (_, index) => index !== action.index,
          ),
        };
      });

    case "APPLY_BILL_AVERAGE":
      return updateScenario(state, state.activeId, (scenario) => {
        const stats = calculateBillHistoryStats(
          scenario.billHistory,
          scenario.inputs.panelWatts,
        );
        if (!stats.ready) return scenario;
        return {
          ...scenario,
          inputs: normalizePlannerInputs({
            ...scenario.inputs,
            monthlyKwh: Math.round(stats.averageKwh),
          }),
        };
      });

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
