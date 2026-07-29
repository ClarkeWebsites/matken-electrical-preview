import { useMemo, useReducer, useRef, useState } from "react";
import {
  ArrowRight,
  BatteryCharging,
  Calculator,
  ChartLineUp,
  Copy,
  Info,
  LinkSimple,
  Lightning,
  Printer,
  Sun,
  Trash,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router";
import { essentialLoadItems } from "../data/site.js";
import {
  activePlannerScenario,
  boundedPlannerInteger,
  createInitialPlannerScenarioState,
  formatPlannerValue,
  MAX_PLANNER_SCENARIOS,
  nextPlannerScenarioId,
  PANEL_WATT_OPTIONS,
  plannerInputsFromSearch,
  plannerPayloadForScenario,
  plannerScenarioReducer,
  plannerTransferForScenario,
  selectedLoadItemsFromEntries,
} from "../lib/plannerModel.js";

const signedDifference = (value, baseline, unit) => {
  const difference = value - baseline;
  if (Math.abs(difference) < 0.051) return "Same as Plan A";
  const sign = difference > 0 ? "+" : "−";
  return `${sign}${formatPlannerValue(Math.abs(difference))} ${unit} vs Plan A`;
};

export function PlannerPage() {
  const navigate = useNavigate();
  const [comparisonState, dispatch] = useReducer(
    plannerScenarioReducer,
    undefined,
    () =>
      createInitialPlannerScenarioState(
        plannerInputsFromSearch(
          typeof window === "undefined" ? "" : window.location.search,
        ),
      ),
  );
  const [loadStatus, setLoadStatus] = useState("");
  const [linkStatus, setLinkStatus] = useState("");
  const [scenarioStatus, setScenarioStatus] = useState("");
  const controlsHeadingRef = useRef(null);
  const activeScenario = activePlannerScenario(comparisonState);
  const { monthlyKwh, essentialKw, outageHours, panelWatts } =
    activeScenario.inputs;
  const activePayload = useMemo(
    () => plannerPayloadForScenario(activeScenario),
    [activeScenario],
  );
  const activeTransfer = useMemo(
    () => plannerTransferForScenario(activeScenario),
    [activeScenario],
  );
  const result = activePayload.result;
  const loadEntries = activeScenario.loadEntries;
  const loadPlanSource = activeScenario.loadPlanSource;

  const selectedLoadItems = useMemo(
    () => selectedLoadItemsFromEntries(loadEntries),
    [loadEntries],
  );
  const selectedLoadWatts = selectedLoadItems.reduce(
    (total, item) => total + item.subtotalWatts,
    0,
  );
  const selectedLoadKw = selectedLoadWatts / 1000;
  const comparisonPlans = useMemo(
    () =>
      comparisonState.scenarios.map((scenario) => ({
        scenario,
        payload: plannerPayloadForScenario(scenario),
        transfer: plannerTransferForScenario(scenario),
      })),
    [comparisonState.scenarios],
  );
  const baselinePlan = comparisonPlans[0];

  const updateLoadEntry = (id, patch) => {
    dispatch({ type: "PATCH_LOAD_ENTRY", id, patch });
    setLoadStatus("");
    setLinkStatus("");
  };

  const applySelectedLoad = () => {
    if (!selectedLoadItems.length) {
      setLoadStatus("Select at least one essential load before applying.");
      return;
    }
    if (selectedLoadKw > 10) {
      setLoadStatus(
        "This running-load estimate is above the 10 kW planning range. Reduce the list or use a professional load review.",
      );
      return;
    }

    const appliedKw = Math.max(0.2, Math.ceil(selectedLoadKw * 10) / 10);
    const minimumNote =
      selectedLoadKw < 0.2
        ? " The planner minimum of 0.2 kW was applied."
        : "";
    dispatch({ type: "APPLY_SELECTED_LOAD", essentialKw: appliedKw });
    setLoadStatus(
      `Essential load updated to ${formatPlannerValue(appliedKw)} kW from ${selectedLoadItems.length} selected ${selectedLoadItems.length === 1 ? "load" : "loads"}.${minimumNote}`,
    );
    setScenarioStatus(
      `${activeScenario.label} now uses the selected running-load total.`,
    );
  };

  const setPlannerInput = (field, value) => {
    dispatch({ type: "SET_INPUT", field, value });
    setLinkStatus("");
  };

  const setActiveScenario = (id, focusControls = false) => {
    const selected = comparisonState.scenarios.find(
      (scenario) => scenario.id === id,
    );
    if (!selected) return;
    dispatch({ type: "SET_ACTIVE", id });
    setLoadStatus("");
    setLinkStatus("");
    setScenarioStatus(`${selected.label} is now active.`);

    if (focusControls) {
      window.requestAnimationFrame(() => {
        controlsHeadingRef.current?.focus();
      });
    }
  };

  const cloneActiveScenario = () => {
    const nextId = nextPlannerScenarioId(comparisonState);
    if (!nextId) {
      setScenarioStatus("The comparison already contains three plans.");
      return;
    }

    const nextLabel = `Plan ${nextId.slice(-1).toUpperCase()}`;
    dispatch({ type: "CLONE_ACTIVE", id: nextId });
    setLoadStatus("");
    setLinkStatus("");
    setScenarioStatus(
      `${nextLabel} was copied from ${activeScenario.label}. Change one priority to compare the trade-off.`,
    );
    window.requestAnimationFrame(() => {
      document.getElementById(`planner-${nextId}`)?.focus();
    });
  };

  const removeScenario = (id) => {
    if (id === "plan-a" || comparisonState.scenarios.length === 1) return;
    const removed = comparisonState.scenarios.find(
      (scenario) => scenario.id === id,
    );
    const remaining = comparisonState.scenarios.filter(
      (scenario) => scenario.id !== id,
    );
    const nextActiveId =
      comparisonState.activeId === id
        ? remaining[0].id
        : comparisonState.activeId;

    dispatch({ type: "REMOVE_SCENARIO", id });
    setLoadStatus("");
    setLinkStatus("");
    setScenarioStatus(
      `${removed?.label || "Plan"} removed. ${
        remaining.find((scenario) => scenario.id === nextActiveId)?.label
      } is active.`,
    );
    window.requestAnimationFrame(() => {
      document.getElementById(`planner-${nextActiveId}`)?.focus();
    });
  };

  const copyPlanLink = async () => {
    const parameters = new URLSearchParams({
      monthly: String(monthlyKwh),
      essential: String(essentialKw),
      hours: String(outageHours),
      panel: String(panelWatts),
    });
    const relativeUrl = `/planner?${parameters}`;
    const shareUrl = new URL(relativeUrl, window.location.origin).href;

    navigate(relativeUrl, { replace: true });

    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkStatus(
        `Plan link copied for ${activeScenario.label}. It contains planning totals only—not comparisons, appliance, or contact details.`,
      );
    } catch {
      setLinkStatus(
        "Plan link added to the address bar. Copy it there to share these inputs.",
      );
    }
  };

  return (
    <>
      <section className="page-hero planner-page-hero">
        <div className="shell page-hero-grid">
          <div>
            <span className="section-index">Educational planning tool</span>
            <h1>Turn energy goals into a better first conversation.</h1>
          </div>
          <p>
            Estimate a starting solar range and essential-load battery range.
            The result is not a quote, system design, engineering
            recommendation, or guarantee.
          </p>
        </div>
      </section>

      <section className="section planner-workspace">
        <div className="shell">
          <div className="planner-plan-switcher">
            <div className="planner-plan-switcher-copy">
              <span>Compare resilience plans</span>
              <h2>Change one priority. See the trade-off.</h2>
              <p id="planner-comparison-note">
                Clone the active plan, then change backup time, essential load,
                monthly use, or panel size. Comparisons stay in this visit and
                are not sent anywhere.
              </p>
            </div>
            <fieldset aria-describedby="planner-comparison-note">
              <legend>Plan being edited</legend>
              <div className="planner-plan-options">
                {comparisonState.scenarios.map((scenario) => (
                  <label
                    key={scenario.id}
                    className={
                      comparisonState.activeId === scenario.id
                        ? "active"
                        : ""
                    }
                  >
                    <input
                      id={`planner-${scenario.id}`}
                      type="radio"
                      name="planner-scenario"
                      value={scenario.id}
                      checked={comparisonState.activeId === scenario.id}
                      onChange={() => setActiveScenario(scenario.id)}
                    />
                    <span>
                      <strong>{scenario.label}</strong>
                      <small>
                        {scenario.inputs.outageHours} h ·{" "}
                        {formatPlannerValue(scenario.inputs.essentialKw)} kW
                        essential
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              className="button button-dark"
              type="button"
              disabled={
                comparisonState.scenarios.length >= MAX_PLANNER_SCENARIOS
              }
              onClick={cloneActiveScenario}
            >
              <Copy size={18} weight="bold" aria-hidden="true" />
              {comparisonState.scenarios.length >= MAX_PLANNER_SCENARIOS
                ? "Three-plan limit reached"
                : `Compare another plan from ${activeScenario.label}`}
            </button>
          </div>
          {scenarioStatus ? (
            <p className="planner-scenario-status" role="status">
              {scenarioStatus}
            </p>
          ) : null}

          <div className="planner-workspace-grid">
            <form
              className="planner-controls"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="planner-control-heading">
                <span>01</span>
                <div>
                  <h2 ref={controlsHeadingRef} tabIndex="-1">
                    {activeScenario.label} inputs
                  </h2>
                  <p>Use rounded values when exact figures are unavailable.</p>
                </div>
              </div>

            <label className="control-group">
              <span>
                Monthly electricity use
                <strong>{monthlyKwh} kWh</strong>
              </span>
              <input
                type="range"
                min="30"
                max="3000"
                step="10"
                value={monthlyKwh}
                aria-valuetext={`${monthlyKwh} kilowatt-hours per month`}
                onChange={(event) =>
                  setPlannerInput("monthlyKwh", Number(event.target.value))
                }
              />
              <small>
                Find monthly kWh on a recent bill. Do not enter the bill amount.
              </small>
            </label>

            <label className="control-group">
              <span>
                Essential simultaneous load
                <strong>{essentialKw} kW</strong>
              </span>
              <input
                type="range"
                min="0.2"
                max="10"
                step="0.1"
                value={essentialKw}
                aria-valuetext={`${formatPlannerValue(essentialKw)} kilowatts`}
                onChange={(event) => {
                  setPlannerInput(
                    "essentialKw",
                    Number(event.target.value),
                  );
                  setLoadStatus(
                    selectedLoadItems.length
                      ? "Manual load selected. Apply the appliance list again to attach its breakdown."
                      : "",
                  );
                }}
              />
              <small>
                Roughly how much must run at once during an outage—not the whole
                property load.
              </small>
            </label>

            <details className="essential-load-builder">
              <summary>
                <Calculator size={22} weight="duotone" aria-hidden="true" />
                <span>
                  <strong>Build the load from appliances</strong>
                  <small>Optional running-load helper</small>
                </span>
              </summary>
              <fieldset>
                <legend>Essential appliances and equipment</legend>
                <p className="load-builder-intro">
                  Select only what should run at the same time. Starting values
                  are editable planning assumptions—not equipment
                  specifications.
                </p>
                <div className="load-builder-list">
                  {essentialLoadItems.map((item) => {
                    const entry = loadEntries[item.id];
                    const quantityId = `load-${item.id}-quantity`;
                    const wattsId = `load-${item.id}-watts`;

                    return (
                      <div className="load-builder-row" key={item.id}>
                        <label className="load-builder-choice">
                          <input
                            type="checkbox"
                            checked={entry.selected}
                            onChange={(event) =>
                              updateLoadEntry(item.id, {
                                selected: event.target.checked,
                              })
                            }
                          />
                          <span>
                            <strong>{item.label}</strong>
                            <small>{item.help}</small>
                          </span>
                        </label>
                        <div className="load-builder-numbers">
                          <label htmlFor={quantityId}>
                            Quantity
                            <input
                              id={quantityId}
                              aria-label={`Quantity for ${item.label}`}
                              type="number"
                              min="1"
                              max={item.maxQuantity}
                              step="1"
                              inputMode="numeric"
                              disabled={!entry.selected}
                              value={entry.quantity}
                              onChange={(event) =>
                                updateLoadEntry(item.id, {
                                  quantity: event.target.value,
                                })
                              }
                              onBlur={() => {
                                const normalized = boundedPlannerInteger(
                                  entry.quantity,
                                  1,
                                  1,
                                  item.maxQuantity,
                                );
                                if (String(normalized) !== String(entry.quantity)) {
                                  updateLoadEntry(item.id, {
                                    quantity: normalized,
                                  });
                                }
                              }}
                            />
                          </label>
                          <label htmlFor={wattsId}>
                            Watts each
                            <input
                              id={wattsId}
                              aria-label={`Watts for ${item.label}`}
                              type="number"
                              min="1"
                              max="5000"
                              step="1"
                              inputMode="numeric"
                              disabled={!entry.selected}
                              value={entry.watts}
                              onChange={(event) =>
                                updateLoadEntry(item.id, {
                                  watts: event.target.value,
                                })
                              }
                              onBlur={() => {
                                const normalized = boundedPlannerInteger(
                                  entry.watts,
                                  item.defaultWatts,
                                  1,
                                  5000,
                                );
                                if (String(normalized) !== String(entry.watts)) {
                                  updateLoadEntry(item.id, {
                                    watts: normalized,
                                  });
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="load-builder-total">
                  <div>
                    <span>Selected running load</span>
                    <strong>
                      {selectedLoadWatts.toLocaleString("en-JM")} W ·{" "}
                      {formatPlannerValue(
                        selectedLoadKw,
                        selectedLoadKw < 1 ? 2 : 1,
                      )}{" "}
                      kW
                    </strong>
                  </div>
                  <button
                    className="button button-dark button-compact"
                    type="button"
                    disabled={!selectedLoadItems.length}
                    onClick={applySelectedLoad}
                  >
                    Use this load
                  </button>
                </div>
                <p className="load-builder-limit">
                  Running demand only. Motor or compressor start-up, duty
                  cycles, power factor, and load sequencing are not modeled.
                </p>
                {loadStatus ? (
                  <p
                    className={`load-builder-status${
                      loadPlanSource === "builder" ? " applied" : ""
                    }`}
                    role="status"
                  >
                    {loadStatus}
                  </p>
                ) : null}
              </fieldset>
            </details>

            <label className="control-group">
              <span>
                Target backup duration
                <strong>{outageHours} hours</strong>
              </span>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={outageHours}
                aria-valuetext={`${outageHours} hours`}
                onChange={(event) =>
                  setPlannerInput("outageHours", Number(event.target.value))
                }
              />
              <small>
                Longer backup time can change battery capacity, load
                management, and budget.
              </small>
            </label>

            <label className="control-group control-select">
              <span>Planning panel size</span>
              <select
                value={panelWatts}
                onChange={(event) =>
                  setPlannerInput("panelWatts", Number(event.target.value))
                }
              >
                {PANEL_WATT_OPTIONS.map((watts) => (
                  <option key={watts} value={watts}>
                    {watts} W
                  </option>
                ))}
              </select>
              <small>
                Final module choice depends on available products, layout,
                equipment, and design.
              </small>
            </label>
            </form>

            <aside
              className="planner-results"
              aria-labelledby="planner-result-title"
            >
            <div className="planner-result-heading">
              <span>02</span>
              <div>
                <h2 id="planner-result-title">
                  {activeScenario.label} range
                </h2>
                <p>Calculated instantly from the inputs.</p>
              </div>
            </div>

            <div className="result-primary">
              <Sun size={30} weight="duotone" aria-hidden="true" />
              <span>Starting solar-array range</span>
              <strong>{formatPlannerValue(result.startingSolarKw)} kW</strong>
              <small>
                Approximately {result.panelCount} × {panelWatts} W modules
                before site-specific adjustments.
              </small>
            </div>

            <div className="result-grid">
              <div>
                <ChartLineUp size={24} aria-hidden="true" />
                <span>Average daily use</span>
                <strong>{formatPlannerValue(result.dailyKwh)} kWh</strong>
              </div>
              <div>
                <Lightning size={24} aria-hidden="true" />
                <span>Essential energy</span>
                <strong>
                  {formatPlannerValue(result.usableBackupKwh)} kWh
                </strong>
              </div>
              <div>
                <BatteryCharging size={24} aria-hidden="true" />
                <span>Nominal battery range</span>
                <strong>
                  {formatPlannerValue(result.nominalBatteryKwh)} kWh
                </strong>
              </div>
            </div>

            <div className="estimate-note">
              <Info size={21} weight="fill" aria-hidden="true" />
              <p>
                This estimate assumes 4.5 planning sun-hours and general
                conversion/reserve allowances. Shading, roof geometry,
                equipment start-up demand, temperature, installation
                constraints, tariffs, and local requirements are not modeled.
              </p>
            </div>

            {loadPlanSource === "builder" && selectedLoadItems.length ? (
              <div className="result-load-breakdown">
                <span>Applied essential-load breakdown</span>
                <ul>
                  {selectedLoadItems.map((item) => (
                    <li key={item.id}>
                      <strong>
                        {item.quantity} × {item.label}
                      </strong>
                      <small>{item.watts.toLocaleString("en-JM")} W each</small>
                    </li>
                  ))}
                </ul>
                <p>
                  {selectedLoadWatts.toLocaleString("en-JM")} W calculated
                  running load · {formatPlannerValue(essentialKw)} kW applied
                </p>
              </div>
            ) : null}

            <div className="planner-result-actions">
              <Link
                className="button button-primary"
                to="/request?service=solar"
                state={{ plan: activeTransfer }}
              >
                Use {activeScenario.label} in a request
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
              <button
                className="button button-outline"
                type="button"
                onClick={() => window.print()}
              >
                <Printer size={18} aria-hidden="true" />
                Print planning brief
              </button>
              <button
                className="button button-outline"
                type="button"
                onClick={copyPlanLink}
              >
                <LinkSimple size={18} aria-hidden="true" />
                Copy plan link
              </button>
            </div>
            {linkStatus ? (
              <p className="planner-share-status" role="status">
                {linkStatus}
              </p>
            ) : null}
            </aside>
          </div>
        </div>
      </section>

      <section
        className="section planner-comparison-section"
        aria-labelledby="planner-comparison-title"
      >
        <div className="shell">
          <div className="section-heading heading-split">
            <div>
              <span className="section-index section-index-light">
                Matken planning lab
              </span>
              <h2 id="planner-comparison-title">
                Compare priorities side by side.
              </h2>
            </div>
            <p>
              These are educational starting ranges, not competing quotes or
              equipment recommendations. No plan is labeled “best”—the useful
              choice depends on the property and what matters during an outage.
            </p>
          </div>

          {comparisonPlans.length === 1 ? (
            <div className="planner-comparison-empty">
              <BatteryCharging
                size={34}
                weight="duotone"
                aria-hidden="true"
              />
              <div>
                <h3>Plan A is ready. Add Plan B to compare a trade-off.</h3>
                <p>
                  Start by copying the current plan, then change one input such
                  as backup hours or essential load.
                </p>
              </div>
              <button
                className="button button-sun"
                type="button"
                onClick={cloneActiveScenario}
              >
                <Copy size={18} weight="bold" aria-hidden="true" />
                Compare another plan
              </button>
            </div>
          ) : (
            <div
              className="planner-comparison-table-wrap"
              aria-label="Scrollable resilience plan comparison"
              tabIndex="0"
            >
              <table className="planner-comparison-table">
                <caption>
                  Educational comparison of Matken resilience planning inputs
                  and calculated ranges
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Planning factor</th>
                    {comparisonPlans.map(({ scenario }) => (
                      <th
                        key={scenario.id}
                        scope="col"
                        className={
                          scenario.id === comparisonState.activeId
                            ? "active"
                            : ""
                        }
                      >
                        <strong>{scenario.label}</strong>
                        <small>
                          {scenario.id === comparisonState.activeId
                            ? "Editing now"
                            : "Saved in this visit"}
                        </small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Monthly electricity use</th>
                    {comparisonPlans.map(({ scenario, payload }) => (
                      <td key={scenario.id}>
                        <strong>{payload.monthlyKwh} kWh</strong>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Essential simultaneous load</th>
                    {comparisonPlans.map(({ scenario, payload }) => (
                      <td key={scenario.id}>
                        <strong>
                          {formatPlannerValue(payload.essentialKw)} kW
                        </strong>
                        {scenario.id !== "plan-a" ? (
                          <small>
                            {signedDifference(
                              payload.essentialKw,
                              baselinePlan.payload.essentialKw,
                              "kW",
                            )}
                          </small>
                        ) : (
                          <small>Comparison baseline</small>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Target backup duration</th>
                    {comparisonPlans.map(({ scenario, payload }) => (
                      <td key={scenario.id}>
                        <strong>{payload.outageHours} hours</strong>
                        {scenario.id !== "plan-a" ? (
                          <small>
                            {signedDifference(
                              payload.outageHours,
                              baselinePlan.payload.outageHours,
                              "hours",
                            )}
                          </small>
                        ) : (
                          <small>Comparison baseline</small>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Starting solar-array range</th>
                    {comparisonPlans.map(({ scenario, payload }) => (
                      <td key={scenario.id}>
                        <strong>
                          {formatPlannerValue(
                            payload.result.startingSolarKw,
                          )}{" "}
                          kW
                        </strong>
                        <small>
                          Approx. {payload.result.panelCount} ×{" "}
                          {payload.panelWatts} W modules
                        </small>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Usable essential energy</th>
                    {comparisonPlans.map(({ scenario, payload }) => (
                      <td key={scenario.id}>
                        <strong>
                          {formatPlannerValue(
                            payload.result.usableBackupKwh,
                          )}{" "}
                          kWh
                        </strong>
                      </td>
                    ))}
                  </tr>
                  <tr className="planner-comparison-highlight">
                    <th scope="row">Nominal battery range</th>
                    {comparisonPlans.map(({ scenario, payload }) => (
                      <td key={scenario.id}>
                        <strong>
                          {formatPlannerValue(
                            payload.result.nominalBatteryKwh,
                          )}{" "}
                          kWh
                        </strong>
                        {scenario.id !== "plan-a" ? (
                          <small>
                            {signedDifference(
                              payload.result.nominalBatteryKwh,
                              baselinePlan.payload.result.nominalBatteryKwh,
                              "kWh",
                            )}
                          </small>
                        ) : (
                          <small>Comparison baseline</small>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="planner-comparison-actions">
                    <th scope="row">Next action</th>
                    {comparisonPlans.map(
                      ({ scenario, transfer }) => (
                        <td key={scenario.id}>
                          <button
                            type="button"
                            disabled={
                              scenario.id === comparisonState.activeId
                            }
                            onClick={() =>
                              setActiveScenario(scenario.id, true)
                            }
                          >
                            {scenario.id === comparisonState.activeId
                              ? "Editing this plan"
                              : `Edit ${scenario.label}`}
                          </button>
                          <Link
                            to="/request?service=solar"
                            state={{ plan: transfer }}
                          >
                            Use {scenario.label} in request
                            <ArrowRight
                              size={16}
                              weight="bold"
                              aria-hidden="true"
                            />
                          </Link>
                          <button
                            className="remove"
                            type="button"
                            disabled={scenario.id === "plan-a"}
                            onClick={() => removeScenario(scenario.id)}
                          >
                            <Trash size={15} aria-hidden="true" />
                            {scenario.id === "plan-a"
                              ? "Plan A is the comparison baseline"
                              : `Remove ${scenario.label}`}
                          </button>
                        </td>
                      ),
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="section planner-explainer">
        <div className="shell">
          <div className="section-heading heading-split">
            <div>
              <span className="section-index">What this tool can do</span>
              <h2>A better brief—not a system design.</h2>
            </div>
            <p>
              Use the estimate to organize questions and priorities. A real
              project still requires equipment, property, usage, electrical,
              installation, and budget review.
            </p>
          </div>
          <div className="planner-explainer-grid">
            <article>
              <span>Useful for</span>
              <h3>Comparing priorities</h3>
              <p>
                See how outage duration and selected essential load change the
                starting battery range.
              </p>
            </article>
            <article>
              <span>Not designed for</span>
              <h3>Purchasing equipment</h3>
              <p>
                Do not buy modules, batteries, inverters, or balance-of-system
                equipment from this estimate.
              </p>
            </article>
            <article>
              <span>Bring next</span>
              <h3>Real property details</h3>
              <p>
                Recent bills, equipment names, roof or ground photos, panel
                photos, and the loads that matter most.
              </p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
