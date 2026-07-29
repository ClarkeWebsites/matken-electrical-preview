import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  FileArrowUp,
  Info,
  MapTrifold,
  Phone,
  Printer,
  ShareNetwork,
  Sun,
} from "@phosphor-icons/react";
import { Link, useLocation, useSearchParams } from "react-router";
import {
  normalizeProjectBlueprint,
  projectBlueprintGoals,
  requestPropertyTypes,
  requestTimings,
} from "../lib/projectBlueprintModel.js";
import {
  business,
  essentialLoadItems,
  parishes,
  readinessChecklistByService,
  services,
} from "../data/site.js";
import {
  providerConfig,
  submitRequest,
} from "../lib/providerConfig.js";
import { normalizePlannerPayload } from "../lib/plannerModel.js";

const emptyErrors = {};
const essentialLoadById = new Map(
  essentialLoadItems.map((item) => [item.id, item]),
);

function initialRequestValues(searchParams, blueprint = null) {
  const requestedService = services.find(
    (item) => item.slug === searchParams.get("service"),
  );
  const selectedService = blueprint
    ? services.find((item) => item.slug === blueprint.service)
    : requestedService;
  const requestedPath = searchParams.get("path") || "";

  return {
    service: selectedService?.slug || "",
    propertyType: blueprint?.propertyType || "",
    parish: "",
    pathway:
      blueprint?.pathway ||
      (selectedService?.pathways.includes(requestedPath)
        ? requestedPath
        : ""),
    urgency: blueprint?.urgency || "",
    details: "",
    name: "",
    phone: "",
    email: "",
    contactPreference: "Phone call",
    availableContextIds: blueprint?.availableContextIds || [],
    serviceConsent: false,
    marketingConsent: false,
  };
}

function requestSummary(values, reference, plannerData) {
  const service =
    services.find((item) => item.slug === values.service)?.label ||
    values.service;
  const readinessOptions = readinessChecklistByService[values.service] || [];
  const selectedReadiness = readinessOptions.filter((item) =>
    values.availableContextIds.includes(item.id),
  );
  const lines = [
    `MATKEN PROJECT REQUEST — ${reference}`,
    "",
    `Primary service: ${service}`,
    `Property type: ${values.propertyType}`,
    `Parish: ${values.parish}`,
    `Project timing: ${values.urgency}`,
    `Suggested project category: ${values.pathway || "Not specified"}`,
  ];

  if (selectedReadiness.length) {
    lines.push(
      "",
      "Customer-provided preparation available:",
      ...selectedReadiness.map((item) => `- ${item.label}`),
    );
  }

  lines.push(
    "",
    "Project details:",
    values.details,
    "",
    `Name: ${values.name}`,
    `Phone: ${values.phone.trim() || "Not provided"}`,
    `Email: ${values.email || "Not provided"}`,
    `Preferred contact: ${values.contactPreference}`,
  );

  if (plannerData?.result) {
    lines.push(
      "",
      "Educational planner inputs:",
      `Monthly use: ${plannerData.monthlyKwh} kWh`,
      `Essential load: ${plannerData.essentialKw} kW`,
      `Backup target: ${plannerData.outageHours} hours`,
      `Starting solar range: ${plannerData.result.startingSolarKw.toFixed(1)} kW`,
      `Nominal battery range: ${plannerData.result.nominalBatteryKwh.toFixed(1)} kWh`,
    );
    if (
      plannerData.loadPlan?.source === "builder" &&
      plannerData.loadPlan.items.length
    ) {
      lines.push(
        "",
        "Selected essential loads:",
        ...plannerData.loadPlan.items.map((item) => {
          const catalogItem = essentialLoadById.get(item.id);
          return `- ${item.quantity} × ${catalogItem.label} at ${item.watts} W`;
        }),
        `Calculated running-load total: ${plannerData.loadPlan.totalWatts.toLocaleString("en-JM")} W`,
        `Applied planner load: ${plannerData.loadPlan.appliedKw.toFixed(1)} kW`,
      );
    }
    lines.push(
      "Planner and appliance values are educational and are not a design or quote.",
    );
  }

  lines.push(
    "",
    "Submitting a request does not confirm an appointment, scope, price, or availability.",
  );
  return lines.join("\n");
}

function StepIndicator({ step }) {
  const labels = ["Project", "Details", "Contact"];
  return (
    <ol className="step-indicator" aria-label="Request progress">
      {labels.map((label, index) => {
        const number = index + 1;
        const state =
          number < step ? "complete" : number === step ? "current" : "";
        return (
          <li className={state} key={label} aria-current={number === step ? "step" : undefined}>
            <span>{number < step ? <Check size={15} weight="bold" /> : number}</span>
            <strong>{label}</strong>
          </li>
        );
      })}
    </ol>
  );
}

export function RequestPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialBlueprint = useMemo(
    () => normalizeProjectBlueprint(location.state?.blueprint),
    [location.state?.blueprint],
  );
  const [appliedBlueprint, setAppliedBlueprint] = useState(
    () => initialBlueprint,
  );
  const [plannerData, setPlannerData] = useState(
    () => normalizePlannerPayload(location.state?.plan),
  );
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState(emptyErrors);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [summaryActionError, setSummaryActionError] = useState("");
  const [files, setFiles] = useState([]);
  const [values, setValues] = useState(() =>
    initialRequestValues(searchParams, initialBlueprint),
  );
  const stepLegendRef = useRef(null);
  const previousStepRef = useRef(step);
  const requestFormRef = useRef(null);

  const selectedService = services.find(
    (service) => service.slug === values.service,
  );
  const readinessOptions =
    readinessChecklistByService[values.service] || [];
  const appliedBlueprintGoal = projectBlueprintGoals.find(
    (goal) => goal.id === appliedBlueprint?.goalId,
  );

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    stepLegendRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const firstErrorKey = Object.keys(errors).find((key) => errors[key]);
    if (!firstErrorKey) return;

    const field = requestFormRef.current?.querySelector(
      `[data-request-field="${firstErrorKey}"]`,
    );
    const focusTarget = field?.matches(
      "button, input, select, textarea, [tabindex]",
    )
      ? field
      : field?.querySelector("button, input, select, textarea, [tabindex]");
    focusTarget?.focus();
  }, [errors]);

  const summary = useMemo(
    () =>
      result
        ? requestSummary(values, result.reference, plannerData)
        : "",
    [plannerData, result, values],
  );

  const update = (field, value) => {
    const changedCarriedBlueprintField =
      appliedBlueprint &&
      ["service", "propertyType", "pathway", "urgency"].includes(field) &&
      value !== values[field];

    if (changedCarriedBlueprintField) {
      setAppliedBlueprint(null);
    }
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "service" && value !== current.service
        ? { pathway: "", availableContextIds: [] }
        : {}),
      ...(changedCarriedBlueprintField && field === "propertyType"
        ? { pathway: "" }
        : {}),
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const selectContactPreference = (contactPreference) => {
    setValues((current) => ({ ...current, contactPreference }));
    setErrors((current) => ({
      ...current,
      phone: undefined,
      email: undefined,
    }));
  };

  const toggleAvailableContext = (id) => {
    if (!readinessOptions.some((item) => item.id === id)) return;
    setAppliedBlueprint(null);
    setValues((current) => ({
      ...current,
      availableContextIds: current.availableContextIds.includes(id)
        ? current.availableContextIds.filter((item) => item !== id)
        : [...current.availableContextIds, id],
    }));
  };

  const validateStep = (currentStep) => {
    const nextErrors = {};

    if (currentStep === 1) {
      if (!values.service) nextErrors.service = "Choose a primary service.";
      if (!values.propertyType)
        nextErrors.propertyType = "Choose a property type.";
      if (!values.parish) nextErrors.parish = "Choose a parish.";
    }

    if (currentStep === 2) {
      if (!values.urgency) nextErrors.urgency = "Choose a project timing.";
      if (values.details.trim().length < 30) {
        nextErrors.details =
          "Add at least 30 characters so the request has useful context.";
      }
    }

    if (currentStep === 3) {
      const phone = values.phone.trim();
      const phoneDigits = phone.replace(/\D/g, "");
      const email = values.email.trim();
      const phoneRequired = values.contactPreference !== "Email";
      const emailRequired = values.contactPreference === "Email";

      if (values.name.trim().length < 2)
        nextErrors.name = "Enter your name.";
      if (
        (phoneRequired && !phone) ||
        (phone &&
          (!/^[+()\d\s.-]{7,24}$/.test(phone) ||
            phoneDigits.length < 7 ||
            phoneDigits.length > 15))
      ) {
        nextErrors.phone = "Enter a valid phone number.";
      }
      if (emailRequired && !email) {
        nextErrors.email = "Enter an email address for email follow-up.";
      } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        nextErrors.email = "Enter a valid email address or leave it blank.";
      }
      if (!values.serviceConsent) {
        nextErrors.serviceConsent =
          "Confirm that Matken may contact you about this request.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(3, current + 1));
  };

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    const accepted = selected
      .filter((file) => file.type.startsWith("image/"))
      .filter((file) => file.size <= 8 * 1024 * 1024)
      .slice(0, 4);
    setFiles(accepted);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateStep(3)) return;
    setSubmitting(true);
    setErrors(emptyErrors);

    try {
      const availableContextIds = readinessOptions
        .filter((item) => values.availableContextIds.includes(item.id))
        .map((item) => item.id);
      const response = await submitRequest({
        service: values.service,
        propertyType: values.propertyType,
        parish: values.parish,
        pathway: values.pathway,
        urgency: values.urgency,
        details: values.details,
        name: values.name,
        phone: values.phone,
        email: values.email,
        contactPreference: values.contactPreference,
        availableContextIds,
        serviceConsent: values.serviceConsent,
        marketingConsent: values.marketingConsent,
        planner: plannerData || null,
        submittedAt: new Date().toISOString(),
      });
      setResult(response);
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "The request could not be delivered. Please call Matken.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setSummaryActionError("");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setSummaryActionError(
        "The summary could not be copied automatically. Select the text above to copy it.",
      );
    }
  };

  const shareSummary = async () => {
    if (!navigator.share) {
      await copySummary();
      return;
    }
    try {
      await navigator.share({
        title: `Matken project request ${result.reference}`,
        text: summary,
      });
      setSummaryActionError("");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSummaryActionError(
        "The share sheet could not be opened. Copy or print the summary instead.",
      );
    }
  };

  if (result) {
    return (
      <section className="section request-result-section">
        <div className="shell request-result">
          <div className="request-result-mark">
            <Check size={38} weight="bold" aria-hidden="true" />
          </div>
          <span className="section-index">
            {result.mode === "submitted"
              ? "Request received"
              : "Request summary prepared"}
          </span>
          <h1>
            {result.mode === "submitted"
              ? "Your request is ready for review."
              : "Your request is organized and ready to share."}
          </h1>
          <p className="request-result-message">{result.message}</p>
          <div className="reference-box">
            <span>Reference</span>
            <strong>{result.reference}</strong>
          </div>
          {result.mode === "prepared" ? (
            <div className="preview-warning">
              <Info size={22} weight="fill" aria-hidden="true" />
              <p>
                The request transport is not connected in this prototype.
                Nothing was emailed, uploaded, stored, or sent to Matken. Call
                the verified number or copy the summary below.
              </p>
            </div>
          ) : null}
          <div className="summary-panel">
            <pre>{summary}</pre>
          </div>
          <div className="result-actions">
            <button className="button button-primary" type="button" onClick={copySummary}>
              <Clipboard size={18} aria-hidden="true" />
              {copied ? "Copied" : "Copy summary"}
            </button>
            <button className="button button-outline" type="button" onClick={shareSummary}>
              <ShareNetwork size={18} aria-hidden="true" />
              Share
            </button>
            <button className="button button-outline" type="button" onClick={() => window.print()}>
              <Printer size={18} aria-hidden="true" />
              Print
            </button>
            <a className="button button-dark" href={`tel:${business.phoneHref}`}>
              <Phone size={18} weight="fill" aria-hidden="true" />
              Call Matken
            </a>
          </div>
          {summaryActionError ? (
            <p className="field-error" role="alert">
              {summaryActionError}
            </p>
          ) : null}
          <button
            className="reset-link"
            type="button"
            onClick={() => {
              setResult(null);
              setStep(1);
              setValues(initialRequestValues(searchParams));
              setFiles([]);
              setPlannerData(null);
              setAppliedBlueprint(null);
              setErrors(emptyErrors);
              setCopied(false);
              setSummaryActionError("");
            }}
          >
            Prepare another request
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-hero request-page-hero">
        <div className="shell page-hero-grid">
          <div>
            <span className="section-index">Request service</span>
            <h1>Give the project a useful starting point.</h1>
          </div>
          <p>
            Organize the property, timing, need, and contact details. A request
            starts a conversation—it does not confirm an appointment, quote,
            scope, or availability.
          </p>
        </div>
      </section>

      <section className="section request-workspace">
        <div className="shell request-layout">
          <div className="request-sidebar">
            <StepIndicator step={step} />
            <div className="request-sidebar-note">
              <Info size={22} weight="fill" aria-hidden="true" />
              <div>
                <strong>
                  {providerConfig.requestMode === "connected"
                    ? "Secure delivery connected"
                    : "Prototype delivery mode"}
                </strong>
                <p>
                  {providerConfig.requestMode === "connected"
                    ? "The configured same-origin request endpoint will receive this form."
                    : "The form prepares a summary on this device. It does not transmit or store personal details."}
                </p>
              </div>
            </div>
            <a className="sidebar-call" href={`tel:${business.phoneHref}`}>
              <Phone size={20} weight="fill" aria-hidden="true" />
              <span>
                Prefer to call?
                <strong>{business.phoneDisplay}</strong>
              </span>
            </a>
          </div>

          <form
            className="request-form"
            ref={requestFormRef}
            onSubmit={handleSubmit}
            noValidate
          >
            {step === 1 ? (
              <fieldset>
                <legend ref={stepLegendRef} tabIndex="-1">
                  <span>Step 1 of 3</span>
                  Tell us what kind of project this is.
                </legend>

                <div className="field-group">
                  <p className="field-label" id="primary-service-label">
                    Primary service
                  </p>
                  <div
                    className="choice-grid choice-grid-three"
                    role="group"
                    data-request-field="service"
                    aria-labelledby="primary-service-label"
                    aria-invalid={Boolean(errors.service)}
                    aria-describedby={
                      errors.service ? "primary-service-error" : undefined
                    }
                  >
                    {services.map((service) => (
                      <button
                        type="button"
                        key={service.slug}
                        aria-pressed={values.service === service.slug}
                        className={
                          values.service === service.slug ? "selected" : ""
                        }
                        onClick={() => update("service", service.slug)}
                      >
                        <strong>{service.label}</strong>
                        <span>{service.summary}</span>
                        {values.service === service.slug ? (
                          <Check size={17} weight="bold" aria-hidden="true" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                  {errors.service ? (
                    <p
                      className="field-error"
                      id="primary-service-error"
                      role="alert"
                    >
                      {errors.service}
                    </p>
                  ) : null}
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>Property type</span>
                    <select
                      data-request-field="propertyType"
                      value={values.propertyType}
                      onChange={(event) =>
                        update("propertyType", event.target.value)
                      }
                      aria-invalid={Boolean(errors.propertyType)}
                      aria-describedby={
                        errors.propertyType
                          ? "property-type-error"
                          : undefined
                      }
                    >
                      <option value="">Choose one</option>
                      {requestPropertyTypes.map((propertyType) => (
                        <option key={propertyType}>{propertyType}</option>
                      ))}
                    </select>
                    {errors.propertyType ? (
                      <small
                        className="field-error"
                        id="property-type-error"
                      >
                        {errors.propertyType}
                      </small>
                    ) : null}
                  </label>

                  <label className="field">
                    <span>Parish</span>
                    <select
                      data-request-field="parish"
                      value={values.parish}
                      onChange={(event) => update("parish", event.target.value)}
                      aria-invalid={Boolean(errors.parish)}
                      aria-describedby={
                        errors.parish ? "parish-error" : undefined
                      }
                    >
                      <option value="">Choose one</option>
                      {parishes.map((parish) => (
                        <option key={parish}>{parish}</option>
                      ))}
                    </select>
                    {errors.parish ? (
                      <small className="field-error" id="parish-error">
                        {errors.parish}
                      </small>
                    ) : null}
                  </label>
                </div>

                {appliedBlueprint ? (
                  <div className="carried-blueprint">
                    <span className="carried-blueprint-icon">
                      <MapTrifold
                        size={24}
                        weight="duotone"
                        aria-hidden="true"
                      />
                    </span>
                    <div>
                      <strong>Your private Project Blueprint was applied</strong>
                      <p>
                        {appliedBlueprintGoal?.label} ·{" "}
                        {appliedBlueprint.propertyType} ·{" "}
                        {appliedBlueprint.urgency}
                      </p>
                      <small>
                        Review or change every item and choose the parish.
                        This website has not sent these Blueprint project
                        answers to Matken.
                      </small>
                    </div>
                  </div>
                ) : null}

                {plannerData ? (
                  <div className="carried-plan">
                    <span className="carried-plan-icon">
                      <Sun size={23} weight="duotone" aria-hidden="true" />
                    </span>
                    <div>
                      <strong>Planner result attached to this request</strong>
                      <p>
                        {plannerData.result.startingSolarKw.toFixed(1)} kW
                        starting solar range ·{" "}
                        {plannerData.result.nominalBatteryKwh.toFixed(1)} kWh
                        nominal battery range
                      </p>
                      {plannerData.loadPlan?.source === "builder" ? (
                        <small>
                          Includes {plannerData.loadPlan.items.length} selected{" "}
                          {plannerData.loadPlan.items.length === 1
                            ? "essential load"
                            : "essential loads"}{" "}
                          totaling{" "}
                          {plannerData.loadPlan.totalWatts.toLocaleString(
                            "en-JM",
                          )}{" "}
                          W.
                        </small>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </fieldset>
            ) : null}

            {step === 2 ? (
              <fieldset>
                <legend ref={stepLegendRef} tabIndex="-1">
                  <span>Step 2 of 3</span>
                  Add enough context for a useful follow-up.
                </legend>

                {selectedService ? (
                  <label className="field">
                    <span>Suggested project category</span>
                    <select
                      value={values.pathway}
                      onChange={(event) =>
                        update("pathway", event.target.value)
                      }
                    >
                      <option value="">Choose one or leave open</option>
                      {selectedService.pathways.map((pathway) => (
                        <option key={pathway}>{pathway}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {readinessOptions.length ? (
                  <fieldset
                    className="readiness-checklist"
                    aria-describedby="readiness-checklist-help"
                  >
                    <legend>What do you already have available?</legend>
                    <p id="readiness-checklist-help">
                      Optional. Select what you can safely share during
                      follow-up. Do not open electrical equipment or enter an
                      unsafe area to collect anything.
                    </p>
                    <div className="readiness-grid">
                      {readinessOptions.map((item) => (
                        <label key={item.id}>
                          <input
                            type="checkbox"
                            checked={values.availableContextIds.includes(
                              item.id,
                            )}
                            onChange={() => toggleAvailableContext(item.id)}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                    <small>
                      {
                        readinessOptions.filter((item) =>
                          values.availableContextIds.includes(item.id),
                        ).length
                      }{" "}
                      selected · These are customer-provided preparation
                      notes, not verified documents.
                    </small>
                  </fieldset>
                ) : null}

                <div className="field-group">
                  <p className="field-label" id="project-timing-label">
                    Project timing
                  </p>
                  <div
                    className="choice-grid timing-grid"
                    role="group"
                    data-request-field="urgency"
                    aria-labelledby="project-timing-label"
                    aria-invalid={Boolean(errors.urgency)}
                    aria-describedby={
                      errors.urgency ? "project-timing-error" : undefined
                    }
                  >
                    {requestTimings.map((timing) => (
                      <button
                        type="button"
                        key={timing}
                        aria-pressed={values.urgency === timing}
                        className={values.urgency === timing ? "selected" : ""}
                        onClick={() => update("urgency", timing)}
                      >
                        {timing}
                        {values.urgency === timing ? (
                          <Check size={17} weight="bold" aria-hidden="true" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                  {errors.urgency ? (
                    <p
                      className="field-error"
                      id="project-timing-error"
                      role="alert"
                    >
                      {errors.urgency}
                    </p>
                  ) : null}
                </div>

                <label className="field">
                  <span>Project details</span>
                  <textarea
                    data-request-field="details"
                    rows="7"
                    value={values.details}
                    onChange={(event) => update("details", event.target.value)}
                    placeholder="What is happening now? What outcome do you need? Which equipment, spaces, or project stages are involved?"
                    aria-invalid={Boolean(errors.details)}
                    aria-describedby={
                      errors.details
                        ? "project-details-help project-details-error"
                        : "project-details-help"
                    }
                  />
                  <small id="project-details-help">
                    Include the current condition and desired outcome. Do not
                    include account numbers or payment information.
                  </small>
                  {errors.details ? (
                    <small
                      className="field-error"
                      id="project-details-error"
                    >
                      {errors.details}
                    </small>
                  ) : null}
                </label>

                {providerConfig.requestMode === "preview" ? (
                  <>
                    <label className="upload-field">
                      <FileArrowUp size={27} aria-hidden="true" />
                      <span>
                        <strong>Select local reference photos</strong>
                        Optional preview only · images are not uploaded, sent,
                        or included in the prepared summary
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFiles}
                      />
                    </label>
                    {files.length ? (
                      <ul className="file-list">
                        {files.map((file) => (
                          <li key={`${file.name}-${file.size}`}>{file.name}</li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <div className="preview-warning">
                    <Info size={22} weight="fill" aria-hidden="true" />
                    <p>
                      Photo upload remains disabled until Matken approves and
                      tests private file storage. Send only the text request
                      here, then share images through the approved follow-up
                      channel.
                    </p>
                  </div>
                )}

                {values.urgency === "Urgent safety concern" ? (
                  <div className="safety-notice" role="alert">
                    <Info size={22} weight="fill" aria-hidden="true" />
                    <p>
                      A website form is not an emergency service. If there is
                      smoke, fire, shock risk, exposed energized equipment, or
                      immediate danger, move away and contact the appropriate
                      emergency or utility service.
                    </p>
                  </div>
                ) : null}
              </fieldset>
            ) : null}

            {step === 3 ? (
              <fieldset>
                <legend ref={stepLegendRef} tabIndex="-1">
                  <span>Step 3 of 3</span>
                  How should Matken follow up?
                </legend>

                <div className="field-group">
                  <p className="field-label" id="contact-preference-label">
                    Preferred contact
                  </p>
                  <div
                    className="choice-grid timing-grid"
                    role="group"
                    aria-labelledby="contact-preference-label"
                  >
                    {["Phone call", "Text message", "Email"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        aria-pressed={values.contactPreference === method}
                        className={
                          values.contactPreference === method ? "selected" : ""
                        }
                        onClick={() => selectContactPreference(method)}
                      >
                        {method}
                        {values.contactPreference === method ? (
                          <Check size={17} weight="bold" aria-hidden="true" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>Name</span>
                    <input
                      data-request-field="name"
                      value={values.name}
                      onChange={(event) => update("name", event.target.value)}
                      autoComplete="name"
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "name-error" : undefined}
                    />
                    {errors.name ? (
                      <small className="field-error" id="name-error">
                        {errors.name}
                      </small>
                    ) : null}
                  </label>
                  <label className="field">
                    <span>
                      Phone
                      {values.contactPreference === "Email"
                        ? " (optional)"
                        : ""}
                    </span>
                    <input
                      data-request-field="phone"
                      type="tel"
                      value={values.phone}
                      onChange={(event) => update("phone", event.target.value)}
                      autoComplete="tel"
                      inputMode="tel"
                      required={values.contactPreference !== "Email"}
                      aria-required={values.contactPreference !== "Email"}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={
                        errors.phone ? "phone-error" : undefined
                      }
                    />
                    {errors.phone ? (
                      <small className="field-error" id="phone-error">
                        {errors.phone}
                      </small>
                    ) : null}
                  </label>
                  <label className="field field-span">
                    <span>
                      Email
                      {values.contactPreference === "Email"
                        ? ""
                        : " (optional)"}
                    </span>
                    <input
                      data-request-field="email"
                      type="email"
                      value={values.email}
                      onChange={(event) => update("email", event.target.value)}
                      autoComplete="email"
                      required={values.contactPreference === "Email"}
                      aria-required={values.contactPreference === "Email"}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={
                        errors.email ? "email-error" : undefined
                      }
                    />
                    {errors.email ? (
                      <small className="field-error" id="email-error">
                        {errors.email}
                      </small>
                    ) : null}
                  </label>
                </div>

                <label className="check-field">
                  <input
                    data-request-field="serviceConsent"
                    type="checkbox"
                    checked={values.serviceConsent}
                    onChange={(event) =>
                      update("serviceConsent", event.target.checked)
                    }
                    aria-describedby={
                      errors.serviceConsent
                        ? "service-consent-error"
                        : undefined
                    }
                    aria-invalid={Boolean(errors.serviceConsent)}
                  />
                  <span>
                    Matken may contact me about this service request. I
                    understand that submitting does not confirm an appointment,
                    scope, quote, or availability.
                  </span>
                </label>
                {errors.serviceConsent ? (
                  <p
                    className="field-error"
                    id="service-consent-error"
                    role="alert"
                  >
                    {errors.serviceConsent}
                  </p>
                ) : null}

                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={values.marketingConsent}
                    onChange={(event) =>
                      update("marketingConsent", event.target.checked)
                    }
                  />
                  <span>
                    I separately agree to receive occasional service or
                    educational updates. Optional.
                  </span>
                </label>

                {errors.submit ? (
                  <div
                    className="form-submit-error"
                    data-request-field="submit"
                    role="alert"
                    tabIndex="-1"
                  >
                    {errors.submit}
                  </div>
                ) : null}
              </fieldset>
            ) : null}

            <div className="form-actions">
              {step > 1 ? (
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => setStep((current) => current - 1)}
                >
                  <ArrowLeft size={18} weight="bold" aria-hidden="true" />
                  Back
                </button>
              ) : (
                <Link className="button button-outline" to="/services">
                  <ArrowLeft size={18} weight="bold" aria-hidden="true" />
                  Review services
                </Link>
              )}
              {step < 3 ? (
                <button
                  className="button button-primary"
                  type="button"
                  onClick={nextStep}
                >
                  Continue
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Preparing request…"
                    : providerConfig.requestMode === "connected"
                      ? "Send request securely"
                      : "Prepare request summary"}
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
