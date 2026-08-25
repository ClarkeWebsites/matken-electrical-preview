import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Clipboard,
  FileArrowUp,
  FileText,
  ImageSquare,
  Info,
  MapTrifold,
  Phone,
  Printer,
  ShareNetwork,
  Sun,
  TrashSimple,
} from "@phosphor-icons/react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import {
  normalizeProjectBlueprint,
  projectBlueprintGoals,
  requestPropertyTypes,
  requestTimings,
} from "../lib/projectBlueprintModel.js";
import {
  business,
  essentialLoadItems,
  liveContactTruth,
  parishes,
  readinessChecklistByService,
  services,
} from "../data/site.js";
import {
  providerConfig,
  submitRequest,
} from "../lib/providerConfig.js";
import { normalizePlannerPayload } from "../lib/plannerModel.js";
import {
  formatLocalPhotoSize,
  guidanceForService,
  guidedResponseSummary,
  hasGuidedSafetyConcern,
  LOCAL_PHOTO_LIMIT,
  moveLocalPhoto,
  normalizeGuidedResponses,
  toggleGuidedResponse,
  validateLocalPhotoSelection,
} from "../lib/requestExperience.js";
import { stageProjectPackRequestTransfer } from "../lib/projectPack.js";
import "../request-upgrades.css";

const emptyErrors = {};
const REQUEST_DETAILS_MIN_LENGTH = 30;
const essentialLoadById = new Map(
  essentialLoadItems.map((item) => [item.id, item]),
);

function validReadinessIds(readiness, serviceSlug) {
  if (!readiness || typeof readiness !== "object") return [];
  if (readiness.service !== serviceSlug) return [];

  const allowedIds = new Set(
    (readinessChecklistByService[serviceSlug] || []).map((item) => item.id),
  );
  return Array.isArray(readiness.availableContextIds)
    ? [...new Set(readiness.availableContextIds)].filter((id) =>
        allowedIds.has(id),
      )
    : [];
}

function initialRequestValues(
  searchParams,
  blueprint = null,
  readiness = null,
) {
  const requestedService = services.find(
    (item) => item.slug === searchParams.get("service"),
  );
  const selectedService = blueprint
    ? services.find((item) => item.slug === blueprint.service)
    : requestedService;
  const requestedPath = searchParams.get("path") || "";
  const blueprintReadiness = validReadinessIds(
    {
      service: selectedService?.slug,
      availableContextIds: blueprint?.availableContextIds,
    },
    selectedService?.slug,
  );
  const transferredReadiness = validReadinessIds(
    readiness,
    selectedService?.slug,
  );

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
    availableContextIds: [
      ...new Set([...blueprintReadiness, ...transferredReadiness]),
    ],
    serviceConsent: false,
    marketingConsent: false,
  };
}

function validationErrorsForStep(currentStep, values) {
  const nextErrors = {};

  if (currentStep === 1) {
    if (!values.service) nextErrors.service = "Choose a primary service.";
    if (!values.propertyType)
      nextErrors.propertyType = "Choose a property type.";
    if (!values.parish) nextErrors.parish = "Choose a parish.";
  }

  if (currentStep === 2) {
    if (!values.urgency) nextErrors.urgency = "Choose a project timing.";
    if (values.details.trim().length < REQUEST_DETAILS_MIN_LENGTH) {
      nextErrors.details =
        `Add at least ${REQUEST_DETAILS_MIN_LENGTH} characters so the request has useful context.`;
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

  return nextErrors;
}

function requestSummary(values, reference, plannerData, guidedResponses) {
  const service =
    services.find((item) => item.slug === values.service)?.label ||
    values.service;
  const readinessOptions = readinessChecklistByService[values.service] || [];
  const selectedReadiness = readinessOptions.filter((item) =>
    values.availableContextIds.includes(item.id),
  );
  const guidedSummary = guidedResponseSummary(
    values.service,
    guidedResponses,
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

  if (guidedSummary.length) {
    lines.push(
      "",
      "Customer-observed project context (not a diagnosis):",
      ...guidedSummary.map(
        (item) => `- ${item.label}: ${item.answers.join(", ")}`,
      ),
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
  const labels = ["Project", "Details", "Contact", "Review"];
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

function GuidedProjectQuestions({
  service,
  responses,
  onToggle,
}) {
  const guidance = guidanceForService(service);
  if (!guidance) return null;

  return (
    <section
      className="guided-request"
      aria-labelledby={`guided-request-${service}`}
    >
      <div className="guided-request-heading">
        <span>Optional guided context</span>
        <h2 id={`guided-request-${service}`}>{guidance.title}</h2>
        <p>{guidance.intro}</p>
      </div>

      <div className="guided-request-groups">
        {guidance.groups.map((group) => {
          const selected = Array.isArray(responses[group.id])
            ? responses[group.id]
            : [];
          return (
            <fieldset className="guided-question" key={group.id}>
              <legend>{group.label}</legend>
              <p>{group.help}</p>
              <div className="guided-question-options">
                {group.options.map((option) => {
                  const checked = selected.includes(option.id);
                  return (
                    <label className={checked ? "selected" : ""} key={option.id}>
                      <input
                        type={group.multiple ? "checkbox" : "radio"}
                        name={`guided-${service}-${group.id}`}
                        value={option.id}
                        checked={checked}
                        onChange={() =>
                          onToggle(group.id, option.id)
                        }
                      />
                      <span>{option.label}</span>
                      {checked ? (
                        <Check size={16} weight="bold" aria-hidden="true" />
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      {hasGuidedSafetyConcern(service, responses) ? (
        <div className="safety-notice guided-safety-notice" role="alert">
          <Info size={22} weight="fill" aria-hidden="true" />
          <p>
            Do not wait on this form for smoke, fire, shock risk, exposed
            energized parts, unusual heat, or immediate danger. Move away and
            contact the appropriate emergency or utility service. These choices
            organize non-emergency follow-up only.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function PhotoReadinessCoach({
  service,
  localPhotos,
  rejectedPhotos,
  photoStatus,
  onFiles,
  onMove,
  onRemove,
}) {
  const guidance = guidanceForService(service);
  if (!guidance) return null;

  return (
    <section
      className="photo-readiness-coach"
      aria-labelledby="photo-readiness-title"
    >
      <div className="photo-readiness-heading">
        <div>
          <span>On-device photo preparation</span>
          <h2 id="photo-readiness-title">
            Prepare safer, more useful reference photos.
          </h2>
        </div>
        <strong>{localPhotos.length} / {LOCAL_PHOTO_LIMIT} local photos</strong>
      </div>
      <p className="photo-readiness-intro">
        Use these prompts only from a safe, accessible position. Selecting a
        photo here helps you review it on this device; it does not attach or
        transmit the file.
      </p>

      <ol className="photo-shot-prompts" aria-label="Suggested photo sequence">
        {guidance.photoPrompts.map((prompt, index) => (
          <li key={prompt.title}>
            <span>0{index + 1}</span>
            <div>
              <strong>{prompt.title}</strong>
              <p>{prompt.copy}</p>
            </div>
          </li>
        ))}
      </ol>

      <label className="upload-field photo-local-picker">
        <FileArrowUp size={27} aria-hidden="true" />
        <span>
          <strong>Add local photo previews</strong>
          JPEG, PNG, WebP, HEIC, or another browser-supported image · up to 8 MB
          each · maximum {LOCAL_PHOTO_LIMIT}
        </span>
        <input
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          onChange={onFiles}
          aria-describedby="photo-local-boundary"
        />
      </label>

      <div className="photo-local-boundary" id="photo-local-boundary">
        <Info size={20} weight="fill" aria-hidden="true" />
        <p>
          Local preparation only. These images stay in this open page and are
          never uploaded, sent to Matken, or included in the request summary.
          Photo delivery remains disabled until private storage and its provider
          are separately approved, activated, and tested.
        </p>
      </div>

      {rejectedPhotos.length ? (
        <div className="photo-rejection-feedback" role="alert">
          <strong>Some files were not added</strong>
          <ul>
            {rejectedPhotos.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {localPhotos.length ? (
        <ol className="local-photo-list" aria-label="Local photo preview order">
          {localPhotos.map((item, index) => (
            <li key={item.id}>
              <div className="local-photo-preview">
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={`Local preview of ${item.file.name}`}
                  />
                ) : (
                  <ImageSquare size={30} weight="duotone" aria-hidden="true" />
                )}
                <span>Local only</span>
              </div>
              <div className="local-photo-meta">
                <strong>{item.file.name}</strong>
                <span>{formatLocalPhotoSize(item.file.size)}</span>
              </div>
              <div className="local-photo-actions">
                <button
                  type="button"
                  onClick={() => onMove(item.id, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${item.file.name} earlier`}
                >
                  <ArrowUp size={16} weight="bold" aria-hidden="true" />
                  Earlier
                </button>
                <button
                  type="button"
                  onClick={() => onMove(item.id, 1)}
                  disabled={index === localPhotos.length - 1}
                  aria-label={`Move ${item.file.name} later`}
                >
                  <ArrowDown size={16} weight="bold" aria-hidden="true" />
                  Later
                </button>
                <button
                  className="remove"
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.file.name}`}
                >
                  <TrashSimple size={16} aria-hidden="true" />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="photo-local-empty">
          <ImageSquare size={28} weight="duotone" aria-hidden="true" />
          <p>No local photo previews selected. Photos are optional.</p>
        </div>
      )}

      {photoStatus ? (
        <p className="photo-local-status" role="status" aria-live="polite">
          {photoStatus}
        </p>
      ) : null}
    </section>
  );
}

function ReviewSection({ title, editLabel, onEdit, children }) {
  return (
    <section className="request-review-section">
      <div className="request-review-section-heading">
        <h2>{title}</h2>
        <button type="button" onClick={onEdit}>
          Edit <span className="visually-hidden">{editLabel}</span>
        </button>
      </div>
      {children}
    </section>
  );
}

function createLocalPhotoItem(file, id) {
  let previewUrl = "";
  try {
    previewUrl =
      typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(file)
        : "";
  } catch {
    previewUrl = "";
  }
  return { id, file, previewUrl };
}

function releaseLocalPhotoPreview(item) {
  if (!item?.previewUrl || typeof URL.revokeObjectURL !== "function") return;
  URL.revokeObjectURL(item.previewUrl);
}

export function RequestPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [carriedReadinessCount] = useState(() =>
    validReadinessIds(
      location.state?.readiness,
      initialBlueprint?.service,
    ).length,
  );
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState(emptyErrors);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [summaryActionError, setSummaryActionError] = useState("");
  const [guidedResponses, setGuidedResponses] = useState({});
  const [localPhotos, setLocalPhotos] = useState([]);
  const [rejectedPhotos, setRejectedPhotos] = useState([]);
  const [photoStatus, setPhotoStatus] = useState("");
  const [editingReviewStep, setEditingReviewStep] = useState(null);
  const [values, setValues] = useState(() =>
    initialRequestValues(
      searchParams,
      initialBlueprint,
      location.state?.readiness,
    ),
  );
  const stepLegendRef = useRef(null);
  const previousStepRef = useRef(step);
  const requestFormRef = useRef(null);
  const localPhotosRef = useRef([]);
  const photoIdRef = useRef(0);

  const selectedService = services.find(
    (service) => service.slug === values.service,
  );
  const readinessOptions =
    readinessChecklistByService[values.service] || [];
  const appliedBlueprintGoal = projectBlueprintGoals.find(
    (goal) => goal.id === appliedBlueprint?.goalId,
  );
  const selectedReadiness = readinessOptions.filter((item) =>
    values.availableContextIds.includes(item.id),
  );
  const guidedSummary = guidedResponseSummary(
    values.service,
    guidedResponses,
  );
  const errorCount = Object.values(errors).filter(Boolean).length;

  useEffect(() => {
    localPhotosRef.current = localPhotos;
  }, [localPhotos]);

  useEffect(
    () => () => {
      localPhotosRef.current.forEach(releaseLocalPhotoPreview);
    },
    [],
  );

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    stepLegendRef.current?.scrollIntoView?.({ block: "nearest" });
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
        ? requestSummary(
            values,
            result.reference,
            plannerData,
            guidedResponses,
          )
        : "",
    [guidedResponses, plannerData, result, values],
  );

  const update = (field, value) => {
    const changedCarriedBlueprintField =
      appliedBlueprint &&
      ["service", "propertyType", "pathway", "urgency"].includes(field) &&
      value !== values[field];

    if (changedCarriedBlueprintField) {
      setAppliedBlueprint(null);
    }
    if (field === "service" && value !== values.service) {
      setGuidedResponses({});
      setRejectedPhotos([]);
      setPhotoStatus(
        localPhotos.length
          ? "Service changed. Review the new safe-shot prompts before using the same local photos."
          : "",
      );
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

  const toggleGuidedAnswer = (groupId, optionId) => {
    setGuidedResponses((current) =>
      toggleGuidedResponse(
        values.service,
        current,
        groupId,
        optionId,
      ),
    );
  };

  const validateStep = (currentStep) => {
    const nextErrors = validationErrorsForStep(currentStep, values);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    if (editingReviewStep === step) {
      setEditingReviewStep(null);
      setStep(4);
      return;
    }
    setStep((current) => Math.min(4, current + 1));
  };

  const handleFormKeyDown = (event) => {
    if (event.key !== "Enter" || event.defaultPrevented) return;
    if (!(event.target instanceof HTMLInputElement)) return;
    if (
      event.target.type === "checkbox" ||
      event.target.type === "file" ||
      event.target.type === "radio"
    ) {
      return;
    }
    if (step >= 4) return;
    event.preventDefault();
    nextStep();
  };

  const handleFiles = (event) => {
    const { accepted, rejected } = validateLocalPhotoSelection(
      event.target.files,
      localPhotos.map((item) => item.file),
    );
    const created = accepted.map((file) => {
      photoIdRef.current += 1;
      return createLocalPhotoItem(
        file,
        `local-photo-${Date.now()}-${photoIdRef.current}`,
      );
    });

    if (created.length) {
      setLocalPhotos((current) => [...current, ...created]);
      setPhotoStatus(
        `${created.length} local photo preview${
          created.length === 1 ? "" : "s"
        } added. Nothing was uploaded or sent.`,
      );
    } else if (rejected.length) {
      setPhotoStatus("No local photos were added.");
    }
    setRejectedPhotos(rejected);
    event.target.value = "";
  };

  const movePhoto = (id, direction) => {
    const photo = localPhotos.find((item) => item.id === id);
    const next = moveLocalPhoto(localPhotos, id, direction);
    if (next === localPhotos) return;
    setLocalPhotos(next);
    setPhotoStatus(
      `${photo?.file.name || "Local photo"} moved ${
        direction < 0 ? "earlier" : "later"
      }. Nothing was uploaded or sent.`,
    );
  };

  const removePhoto = (id) => {
    const photo = localPhotos.find((item) => item.id === id);
    if (!photo) return;
    releaseLocalPhotoPreview(photo);
    setLocalPhotos((current) => current.filter((item) => item.id !== id));
    setRejectedPhotos([]);
    setPhotoStatus(
      `${photo.file.name} removed from this device-only preview.`,
    );
  };

  const clearLocalPhotos = () => {
    localPhotos.forEach(releaseLocalPhotoPreview);
    setLocalPhotos([]);
    setRejectedPhotos([]);
    setPhotoStatus("");
  };

  const editReviewSection = (targetStep) => {
    setErrors(emptyErrors);
    setEditingReviewStep(targetStep);
    setStep(targetStep);
  };

  const cancelReviewEdit = () => {
    setErrors(emptyErrors);
    setEditingReviewStep(null);
    setStep(4);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (step !== 4) return;

    const invalidStep = [1, 2, 3].find(
      (candidateStep) =>
        Object.keys(validationErrorsForStep(candidateStep, values)).length > 0,
    );
    if (invalidStep) {
      setErrors(validationErrorsForStep(invalidStep, values));
      setEditingReviewStep(invalidStep);
      setStep(invalidStep);
      return;
    }
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
        guidedContext: normalizeGuidedResponses(
          values.service,
          guidedResponses,
        ),
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

  const openProjectPack = () => {
    const requestTransferKey = stageProjectPackRequestTransfer({
      requestSummary: summary,
      requestReference: result.reference,
    });
    navigate("/project-pack", {
      state: {
        ...(appliedBlueprint ? { blueprint: appliedBlueprint } : {}),
        ...(plannerData ? { planner: plannerData } : {}),
        readiness: {
          service: values.service,
          availableContextIds: values.availableContextIds,
        },
        requestTransferKey,
      },
    });
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
          {result.mode === "prepared" ? (
            <section
              className="request-prepared-next-steps"
              aria-labelledby="request-prepared-next-steps-title"
            >
              <div>
                <span>What you can do next</span>
                <h2 id="request-prepared-next-steps-title">
                  Choose a deliberate handoff.
                </h2>
              </div>
              <ol>
                <li>
                  <strong>Keep the reference</strong>
                  <p>Use it when you call or share this prepared summary.</p>
                </li>
                <li>
                  <strong>Copy, share, or print the summary</strong>
                  <p>Choose one of the controls below to keep the project details together.</p>
                </li>
                <li>
                  <strong>Open Project Pack if you want one planning handoff</strong>
                  <p>It combines this summary with the private planning details you choose to include.</p>
                </li>
                <li>
                  <strong>Contact Matken through the verified phone number</strong>
                  <p>Tell them this website did not transmit the request, then provide the summary or reference.</p>
                </li>
              </ol>
            </section>
          ) : null}
          {localPhotos.length ? (
            <div className="preview-warning">
              <ImageSquare size={22} weight="duotone" aria-hidden="true" />
              <p>
                {localPhotos.length} local photo preview
                {localPhotos.length === 1 ? " stayed" : "s stayed"} on this
                device. No selected image was uploaded, sent to Matken, stored,
                or included in the request summary.
              </p>
            </div>
          ) : null}
          <div className="summary-panel">
            <pre>{summary}</pre>
          </div>
          <div className="result-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={openProjectPack}
            >
              <FileText size={18} aria-hidden="true" />
              Open Project Pack
            </button>
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
              clearLocalPhotos();
              setGuidedResponses({});
              setEditingReviewStep(null);
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
            scope, or availability. {liveContactTruth}
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
            onKeyDown={handleFormKeyDown}
            noValidate
          >
            {errorCount ? (
              <div className="form-error-summary" role="alert">
                <strong>
                  Fix {errorCount} {errorCount === 1 ? "item" : "items"} before
                  continuing.
                </strong>
              </div>
            ) : null}
            {step === 1 ? (
              <fieldset>
                <legend ref={stepLegendRef} tabIndex="-1">
                  <span>Step 1 of 4</span>
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
                      aria-label="Property type"
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
                      aria-label="Parish"
                      aria-invalid={Boolean(errors.parish)}
                      aria-describedby={
                        errors.parish
                          ? "parish-help parish-error"
                          : "parish-help"
                      }
                    >
                      <option value="">Choose one</option>
                      {parishes.map((parish) => (
                        <option key={parish}>{parish}</option>
                      ))}
                    </select>
                    <small id="parish-help">
                      Choose the Jamaica parish for the property.
                    </small>
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
                  <span>Step 2 of 4</span>
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

                <GuidedProjectQuestions
                  service={values.service}
                  responses={guidedResponses}
                  onToggle={toggleGuidedAnswer}
                />

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
                    {carriedReadinessCount ? (
                      <p className="carried-readiness-note" role="status">
                        {carriedReadinessCount} optional readiness
                        {carriedReadinessCount === 1 ? " selection was" : " selections were"}{" "}
                        carried from your private Project Pack. Review or
                        change them before continuing.
                      </p>
                    ) : null}
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
                    aria-label="Project details"
                    aria-invalid={Boolean(errors.details)}
                    aria-describedby={
                      [
                        "project-details-help",
                        "project-details-count",
                        errors.details ? "project-details-error" : null,
                      ]
                        .filter(Boolean)
                        .join(" ")
                    }
                  />
                  <small id="project-details-help">
                    Include the current condition and desired outcome. Do not
                    include account numbers or payment information.
                  </small>
                  <small
                    className={
                      values.details.trim().length >= REQUEST_DETAILS_MIN_LENGTH
                        ? "field-count field-count-ready"
                        : "field-count"
                    }
                    id="project-details-count"
                  >
                    {values.details.trim().length >= REQUEST_DETAILS_MIN_LENGTH
                      ? `${values.details.trim().length} characters · enough for a useful starting brief`
                      : `${values.details.trim().length} of ${REQUEST_DETAILS_MIN_LENGTH} characters needed`}
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

                <PhotoReadinessCoach
                  service={values.service}
                  localPhotos={localPhotos}
                  rejectedPhotos={rejectedPhotos}
                  photoStatus={photoStatus}
                  onFiles={handleFiles}
                  onMove={movePhoto}
                  onRemove={removePhoto}
                />

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
                  <span>Step 3 of 4</span>
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
                      placeholder="(876) 555-0101"
                      required={values.contactPreference !== "Email"}
                      aria-label={
                        values.contactPreference === "Email"
                          ? "Phone (optional)"
                          : "Phone"
                      }
                      aria-required={values.contactPreference !== "Email"}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={
                        errors.phone ? "phone-help phone-error" : "phone-help"
                      }
                    />
                    <small id="phone-help">
                      Include the area code. This number is for follow-up, not
                      an appointment confirmation.
                    </small>
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
              </fieldset>
            ) : null}

            {step === 4 ? (
              <fieldset className="request-review">
                <legend ref={stepLegendRef} tabIndex="-1">
                  <span>Step 4 of 4</span>
                  Check every detail before the final action.
                </legend>

                <p className="request-review-intro">
                  Nothing is sent by entering this step. Use Edit to correct a
                  section, then return here for the final provider-aware action.
                </p>

                <div className="request-review-sections">
                  <ReviewSection
                    title="Project"
                    editLabel="project section"
                    onEdit={() => editReviewSection(1)}
                  >
                    <dl className="request-review-facts">
                      <div>
                        <dt>Primary service</dt>
                        <dd>{selectedService?.label || "Not selected"}</dd>
                      </div>
                      <div>
                        <dt>Property</dt>
                        <dd>{values.propertyType}</dd>
                      </div>
                      <div>
                        <dt>Parish</dt>
                        <dd>{values.parish}</dd>
                      </div>
                    </dl>
                  </ReviewSection>

                  <ReviewSection
                    title="Details and preparation"
                    editLabel="details and preparation section"
                    onEdit={() => editReviewSection(2)}
                  >
                    <dl className="request-review-facts">
                      <div>
                        <dt>Project category</dt>
                        <dd>{values.pathway || "Left open for follow-up"}</dd>
                      </div>
                      <div>
                        <dt>Timing</dt>
                        <dd>{values.urgency}</dd>
                      </div>
                    </dl>

                    {guidedSummary.length ? (
                      <div className="request-review-list">
                        <strong>Customer-observed context</strong>
                        <ul>
                          {guidedSummary.map((item) => (
                            <li key={item.id}>
                              <span>{item.label}</span>
                              <strong>{item.answers.join(", ")}</strong>
                            </li>
                          ))}
                        </ul>
                        <small>
                          These answers organize follow-up. They are not a
                          diagnosis, recommendation, or safety clearance.
                        </small>
                      </div>
                    ) : (
                      <p className="request-review-empty">
                        No optional guided answers selected.
                      </p>
                    )}

                    {selectedReadiness.length ? (
                      <div className="request-review-list">
                        <strong>Preparation already available</strong>
                        <ul>
                          {selectedReadiness.map((item) => (
                            <li key={item.id}>{item.label}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="request-review-copy">
                      <strong>Project details</strong>
                      <p>{values.details}</p>
                    </div>

                    {plannerData ? (
                      <div className="request-review-plan">
                        <Sun size={20} weight="duotone" aria-hidden="true" />
                        <p>
                          Includes the educational planner result:{" "}
                          {plannerData.result.startingSolarKw.toFixed(1)} kW
                          starting solar range and{" "}
                          {plannerData.result.nominalBatteryKwh.toFixed(1)} kWh
                          nominal battery range.
                        </p>
                      </div>
                    ) : null}

                    <div className="request-review-photos">
                      <div>
                        <ImageSquare
                          size={22}
                          weight="duotone"
                          aria-hidden="true"
                        />
                        <strong>
                          {localPhotos.length} local photo preview
                          {localPhotos.length === 1 ? "" : "s"}
                        </strong>
                      </div>
                      <p>
                        Photos stay on this device. They are not uploaded, sent,
                        stored, or included in the request summary—even when the
                        text-request provider is connected.
                      </p>
                      {localPhotos.length ? (
                        <ol>
                          {localPhotos.map((item) => (
                            <li key={item.id}>{item.file.name}</li>
                          ))}
                        </ol>
                      ) : null}
                    </div>
                  </ReviewSection>

                  <ReviewSection
                    title="Contact"
                    editLabel="contact section"
                    onEdit={() => editReviewSection(3)}
                  >
                    <dl className="request-review-facts">
                      <div>
                        <dt>Name</dt>
                        <dd>{values.name}</dd>
                      </div>
                      <div>
                        <dt>Preferred contact</dt>
                        <dd>{values.contactPreference}</dd>
                      </div>
                      <div>
                        <dt>Phone</dt>
                        <dd>{values.phone.trim() || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt>Email</dt>
                        <dd>{values.email.trim() || "Not provided"}</dd>
                      </div>
                    </dl>
                    <p className="request-review-consent">
                      Service-request follow-up: confirmed · Optional updates:{" "}
                      {values.marketingConsent ? "selected" : "not selected"}
                    </p>
                  </ReviewSection>
                </div>

                {values.urgency === "Urgent safety concern" ||
                hasGuidedSafetyConcern(
                  values.service,
                  guidedResponses,
                ) ? (
                  <div className="safety-notice" role="alert">
                    <Info size={22} weight="fill" aria-hidden="true" />
                    <p>
                      This review does not make the website an emergency
                      service. For smoke, fire, shock risk, exposed energized
                      parts, unusual heat, or immediate danger, move away and
                      contact the appropriate emergency or utility service.
                    </p>
                  </div>
                ) : null}

                <div className="request-review-boundary">
                  <Info size={22} weight="fill" aria-hidden="true" />
                  <div>
                    <strong>
                      {providerConfig.requestMode === "connected"
                        ? "Text request ready for secure delivery"
                        : "Preview mode: summary preparation only"}
                    </strong>
                    <p>
                      {providerConfig.requestMode === "connected"
                        ? "The final button sends the text request to the configured same-origin endpoint. It does not send local photos or confirm an appointment, scope, quote, or availability."
                        : "The final button prepares a private summary in this browser. It does not email, upload, store, or send this request to Matken."}
                    </p>
                  </div>
                </div>

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
              {editingReviewStep === step ? (
                <button
                  className="button button-outline"
                  type="button"
                  onClick={cancelReviewEdit}
                >
                  <ArrowLeft size={18} weight="bold" aria-hidden="true" />
                  Cancel edit
                </button>
              ) : step > 1 ? (
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
              {step < 4 ? (
                <button
                  key={`request-next-${step}`}
                  className="button button-primary"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    nextStep();
                  }}
                >
                  {editingReviewStep === step
                    ? "Return to review"
                    : step === 3
                      ? "Review request"
                      : "Continue"}
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </button>
              ) : (
                <button
                  key="request-final-submit"
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
