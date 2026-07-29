import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Buildings,
  Check,
  Copy,
  FileText,
  HardHat,
  House,
  Lightning,
  LockKey,
  MapTrifold,
  Plug,
  Printer,
  ShareNetwork,
  Sun,
  Warning,
  Wrench,
} from "@phosphor-icons/react";
import { Link } from "react-router";
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

const projectBlueprintProperties = Object.freeze([
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

const projectBlueprintTimings = Object.freeze([
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

const goalIcons = {
  backup: Lightning,
  solar: Sun,
  electrical: Plug,
  "new-build": HardHat,
  renovation: Wrench,
};

const propertyIcons = {
  home: House,
  "multi-unit": Buildings,
  business: Briefcase,
  "construction-site": HardHat,
};

function pathwayFor(goal, propertyType) {
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
    "Creating it did not send, upload, or store any information with Matken.",
  ].join("\n");
}

export function ProjectBlueprint() {
  const [step, setStep] = useState(1);
  const [goalId, setGoalId] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [urgency, setUrgency] = useState("");
  const [availableContextIds, setAvailableContextIds] = useState([]);
  const [blueprint, setBlueprint] = useState(null);
  const [error, setError] = useState("");
  const [actionStatus, setActionStatus] = useState(
    "Project Blueprint started. No information has been sent.",
  );
  const stepHeadingRef = useRef(null);
  const resultHeadingRef = useRef(null);

  const selectedGoal = projectBlueprintGoals.find(
    (goal) => goal.id === goalId,
  );
  const readinessOptions = selectedGoal
    ? readinessChecklistByService[selectedGoal.service] || []
    : [];
  const pathway =
    selectedGoal && propertyType
      ? pathwayFor(selectedGoal, propertyType)
      : "";

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => {
      if (blueprint) {
        resultHeadingRef.current?.focus();
      } else {
        stepHeadingRef.current?.focus();
      }
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [blueprint, step]);

  const chooseGoal = (nextGoalId) => {
    if (nextGoalId !== goalId) setAvailableContextIds([]);
    setGoalId(nextGoalId);
    setError("");
    setActionStatus("");
  };

  const toggleReadiness = (id) => {
    if (!readinessOptions.some((item) => item.id === id)) return;
    setAvailableContextIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    setActionStatus("");
  };

  const moveForward = () => {
    if (step === 1 && !selectedGoal) {
      setError("Choose the outcome you are working toward.");
      stepHeadingRef.current?.focus();
      return;
    }
    if (step === 2 && (!propertyType || !urgency)) {
      setError("Choose both a property context and project timing.");
      stepHeadingRef.current?.focus();
      return;
    }

    setError("");
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }

    const normalized = normalizeProjectBlueprint({
      version: 1,
      source: "homepage-blueprint",
      goalId: selectedGoal.id,
      service: selectedGoal.service,
      pathway,
      propertyType,
      urgency,
      availableContextIds,
    });
    if (!normalized) {
      setError("The starting map could not be prepared. Review the choices.");
      return;
    }

    setBlueprint(normalized);
    setActionStatus("Your private Matken Project Blueprint is ready.");
  };

  const copyBlueprint = async () => {
    try {
      await navigator.clipboard.writeText(
        serializeProjectBlueprint(blueprint),
      );
      setActionStatus("Project Blueprint copied without contact details.");
    } catch {
      setActionStatus(
        "The blueprint could not be copied automatically. Print it or use the request handoff instead.",
      );
    }
  };

  const shareBlueprint = async () => {
    if (!navigator.share) {
      await copyBlueprint();
      return;
    }
    try {
      await navigator.share({
        title: "Matken Project Blueprint",
        text: serializeProjectBlueprint(blueprint),
      });
      setActionStatus("The device share sheet was opened.");
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name === "AbortError"
      ) {
        return;
      }
      setActionStatus(
        "The share sheet could not be opened. Copy or print the blueprint instead.",
      );
    }
  };

  const resetBlueprint = () => {
    setGoalId("");
    setPropertyType("");
    setUrgency("");
    setAvailableContextIds([]);
    setBlueprint(null);
    setError("");
    setActionStatus("Project Blueprint cleared. Start with a new outcome.");
    setStep(1);
  };

  const resultGoal = blueprint
    ? projectBlueprintGoals.find((goal) => goal.id === blueprint.goalId)
    : null;
  const resultService = blueprint
    ? services.find((service) => service.slug === blueprint.service)
    : null;
  const resultReadiness = blueprint
    ? readinessChecklistByService[blueprint.service] || []
    : [];
  const selectedReadiness = blueprint
    ? resultReadiness.filter((item) =>
        blueprint.availableContextIds.includes(item.id),
      )
    : [];
  const usefulReadiness = blueprint
    ? resultReadiness.filter(
        (item) => !blueprint.availableContextIds.includes(item.id),
      )
    : [];

  return (
    <div className="blueprint-panel blueprint-panel-active">
      <div className="blueprint-intro">
        <div>
          <span className="section-index section-index-light">
            Private project planning
          </span>
          <h2>Build your Matken Project Blueprint.</h2>
        </div>
        <div>
          <p>
            Organize the outcome, property context, timing, and useful
            preparation before deciding whether to contact Matken.
          </p>
          <span className="blueprint-privacy-line">
            <LockKey size={17} weight="duotone" aria-hidden="true" />
            No contact details here. Project answers are not sent to Matken from
            this screen.
          </span>
        </div>
      </div>

      {!blueprint ? (
        <div className="blueprint-workspace">
          <ol
            className="blueprint-progress"
            aria-label="Project Blueprint progress"
          >
            {["Outcome", "Context", "Preparation"].map((label, index) => {
              const number = index + 1;
              const state =
                number < step ? "complete" : number === step ? "current" : "";
              return (
                <li
                  className={state}
                  key={label}
                  aria-current={number === step ? "step" : undefined}
                >
                  <span>
                    {number < step ? (
                      <Check size={15} weight="bold" aria-hidden="true" />
                    ) : (
                      number
                    )}
                  </span>
                  <strong>{label}</strong>
                </li>
              );
            })}
          </ol>

          <form
            className="blueprint-form"
            onSubmit={(event) => {
              event.preventDefault();
              moveForward();
            }}
          >
            {step === 1 ? (
              <fieldset className="blueprint-step">
                <legend ref={stepHeadingRef} tabIndex="-1">
                  <span>Step 1 of 3</span>
                  What outcome are you working toward?
                </legend>
                <p>
                  Choose the closest match. This does not establish a final
                  service scope.
                </p>
                <div className="blueprint-goal-options">
                  {projectBlueprintGoals.map((goal) => {
                    const Icon = goalIcons[goal.id];
                    const active = goal.id === goalId;
                    return (
                      <label className={active ? "active" : ""} key={goal.id}>
                        <input
                          type="radio"
                          name="blueprint-goal"
                          value={goal.id}
                          checked={active}
                          onChange={() => chooseGoal(goal.id)}
                        />
                        <span className="blueprint-option-icon">
                          <Icon size={21} weight="duotone" aria-hidden="true" />
                        </span>
                        <strong>{goal.label}</strong>
                        {active ? (
                          <Check size={17} weight="bold" aria-hidden="true" />
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            {step === 2 ? (
              <div className="blueprint-step">
                <h3 ref={stepHeadingRef} tabIndex="-1">
                  <span>Step 2 of 3</span>
                  Shape the starting path.
                </h3>
                <p>
                  Property context and timing make the handoff more specific
                  without becoming a quote or availability promise.
                </p>
                <fieldset className="blueprint-subfield">
                  <legend>Property context</legend>
                  <div className="blueprint-property-options">
                    {projectBlueprintProperties.map((property) => {
                      const Icon = propertyIcons[property.id];
                      const active = property.value === propertyType;
                      return (
                        <label
                          className={active ? "active" : ""}
                          key={property.id}
                        >
                          <input
                            type="radio"
                            name="blueprint-property"
                            value={property.value}
                            checked={active}
                            onChange={() => {
                              setPropertyType(property.value);
                              setError("");
                            }}
                          />
                          <Icon
                            size={20}
                            weight="duotone"
                            aria-hidden="true"
                          />
                          <span>{property.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <fieldset className="blueprint-subfield">
                  <legend>Project timing</legend>
                  <div className="blueprint-timing-options">
                    {projectBlueprintTimings.map((timing) => {
                      const active = timing.value === urgency;
                      return (
                        <label
                          className={active ? "active" : ""}
                          key={timing.id}
                        >
                          <input
                            type="radio"
                            name="blueprint-timing"
                            value={timing.value}
                            checked={active}
                            onChange={() => {
                              setUrgency(timing.value);
                              setError("");
                            }}
                          />
                          <span>{timing.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                {urgency === "Urgent safety concern" ? (
                  <div className="blueprint-safety" role="alert">
                    <Warning size={22} weight="fill" aria-hidden="true" />
                    <p>
                      This website is not an emergency service. For smoke,
                      fire, shock risk, exposed energized equipment, or
                      immediate danger, move away and contact the appropriate
                      emergency or utility service.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <fieldset className="blueprint-step">
                <legend ref={stepHeadingRef} tabIndex="-1">
                  <span>Step 3 of 3</span>
                  What do you already have available?
                </legend>
                <p>
                  Optional. Select only what you already have or can gather
                  safely. Do not open electrical equipment or enter an unsafe
                  area.
                </p>
                <div className="blueprint-readiness-options">
                  {readinessOptions.map((item) => (
                    <label key={item.id}>
                      <input
                        type="checkbox"
                        checked={availableContextIds.includes(item.id)}
                        onChange={() => toggleReadiness(item.id)}
                      />
                      <span>{item.label}</span>
                      {availableContextIds.includes(item.id) ? (
                        <Check size={17} weight="bold" aria-hidden="true" />
                      ) : null}
                    </label>
                  ))}
                </div>
                <small className="blueprint-selection-count">
                  {availableContextIds.length} selected · customer-provided
                  preparation, not verified documents
                </small>
              </fieldset>
            ) : null}

            {error ? (
              <p className="blueprint-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="blueprint-step-actions">
              {step > 1 ? (
                <button
                  className="blueprint-back"
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep((current) => Math.max(1, current - 1));
                  }}
                >
                  Back
                </button>
              ) : (
                <span />
              )}
              <button className="button button-sun" type="submit">
                {step === 3 ? "Create my blueprint" : "Continue"}
                <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <article
          className="blueprint-result-final"
          aria-labelledby="blueprint-result-title"
        >
          <div className="blueprint-result-heading">
            <div>
              <span>Prepared privately in this browser</span>
              <h3
                id="blueprint-result-title"
                ref={resultHeadingRef}
                tabIndex="-1"
              >
                Your Matken Project Blueprint
              </h3>
            </div>
            <MapTrifold size={38} weight="duotone" aria-hidden="true" />
          </div>

          <div className="blueprint-result-grid">
            <div className="blueprint-result-main">
              <span className="blueprint-result-label">
                Suggested starting category
              </span>
              <h4>Start with {resultService.label}</h4>
              <p className="blueprint-pathway">
                Planning category: <strong>{blueprint.pathway}</strong>
              </p>
              <p>{resultGoal.copy}</p>

              <dl className="blueprint-snapshot">
                <div>
                  <dt>Outcome</dt>
                  <dd>{resultGoal.label}</dd>
                </div>
                <div>
                  <dt>Property</dt>
                  <dd>{blueprint.propertyType}</dd>
                </div>
                <div>
                  <dt>Timing</dt>
                  <dd>{blueprint.urgency}</dd>
                </div>
              </dl>

              <div className="blueprint-coordination-note">
                <FileText size={21} weight="duotone" aria-hidden="true" />
                <p>
                  One brief can connect related electrical, solar, storage,
                  and construction details. Use the project description to
                  explain where the work overlaps.
                </p>
              </div>
            </div>

            <div className="blueprint-preparation">
              <div>
                <span>Bring what you have</span>
                {selectedReadiness.length ? (
                  <ul>
                    {selectedReadiness.map((item) => (
                      <li key={item.id}>
                        <Check size={15} weight="bold" aria-hidden="true" />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Nothing selected yet. That does not block a request.</p>
                )}
              </div>
              {usefulReadiness.length ? (
                <div>
                  <span>Still useful to gather</span>
                  <ul>
                    {usefulReadiness.map((item) => (
                      <li key={item.id}>{item.label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          {blueprint.urgency === "Urgent safety concern" ? (
            <div
              className="blueprint-safety blueprint-result-safety"
              role="alert"
            >
              <Warning size={22} weight="fill" aria-hidden="true" />
              <p>
                Do not wait on a website request for immediate danger. Move
                away and contact the appropriate emergency or utility
                service.
              </p>
            </div>
          ) : null}

          <div className="blueprint-boundary">
            <LockKey size={20} weight="duotone" aria-hidden="true" />
            <p>
              This blueprint is a planning brief. It is not a quote,
              diagnosis, appointment, availability promise, system design,
              safety clearance, or final work scope. Nothing has been sent to
              Matken.
            </p>
          </div>

          <div className="blueprint-result-actions">
            <Link
              className="button button-primary"
              to="/request"
              state={{ blueprint }}
            >
              {blueprint.urgency === "Urgent safety concern"
                ? "Continue for non-emergency follow-up"
                : "Use this blueprint in my request"}
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>
            <button type="button" onClick={copyBlueprint}>
              <Copy size={17} aria-hidden="true" />
              Copy
            </button>
            <button type="button" onClick={shareBlueprint}>
              <ShareNetwork size={17} aria-hidden="true" />
              Share
            </button>
            <button type="button" onClick={() => window.print()}>
              <Printer size={17} aria-hidden="true" />
              Print / save
            </button>
            <Link to={`/services/${blueprint.service}`}>
              Explore {resultService.shortLabel}
            </Link>
          </div>
          <button
            className="blueprint-reset"
            type="button"
            onClick={resetBlueprint}
          >
            Start over
          </button>
        </article>
      )}

      <p
        className="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {actionStatus}
      </p>
    </div>
  );
}
