import {
  ArrowRight,
  CheckCircle,
  EnvelopeSimple,
  Info,
  Key,
  LockKey,
  Phone,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import "./StatusPage.css";
import {
  lookupProjectStatus,
  projectStatusStages,
  providerConfig,
  requestProjectStatusAccess,
} from "../lib/providerConfig.js";

const initialValues = {
  projectReference: "",
  channel: "email",
  destination: "",
};

const referencePattern = /^[a-z0-9_-]{6,64}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values) {
  const errors = {};
  if (!referencePattern.test(values.projectReference.trim())) {
    errors.projectReference =
      "Enter the project reference exactly as it appears in your Matken message.";
  }

  if (values.channel === "email") {
    if (!emailPattern.test(values.destination.trim())) {
      errors.destination = "Enter the email address used for this project.";
    }
  } else if (values.destination.replace(/\D/g, "").length < 7) {
    errors.destination = "Enter the phone number used for this project.";
  }

  return errors;
}

function ConnectedStatus({ project }) {
  const currentIndex = projectStatusStages.findIndex(
    (stage) => stage.code === project.status.code,
  );

  return (
    <section
      className="status-result"
      aria-labelledby="project-status-result-title"
    >
      <div className="status-result-heading">
        <span>
          <CheckCircle size={22} weight="fill" aria-hidden="true" />
          Verified project view
        </span>
        <h2 id="project-status-result-title">{project.status.label}</h2>
        <p>
          Reference ending in{" "}
          <strong>{project.projectReference.slice(-6)}</strong>
          {project.updatedLabel ? ` · Updated ${project.updatedLabel}` : ""}
        </p>
      </div>

      <ol className="status-progress" aria-label="Authoritative project status">
        {projectStatusStages.map((stage, index) => {
          const isCurrent = index === currentIndex;
          const isComplete = index < currentIndex;
          return (
            <li
              key={stage.code}
              className={
                isCurrent
                  ? "current"
                  : isComplete
                    ? "complete"
                    : "upcoming"
              }
              aria-current={isCurrent ? "step" : undefined}
            >
              <span>{isComplete ? "✓" : index + 1}</span>
              <div>
                <strong>{stage.label}</strong>
                {isCurrent ? <small>{stage.description}</small> : null}
              </div>
            </li>
          );
        })}
      </ol>

      {project.nextStep ? (
        <div className="status-next-step">
          <span>Confirmed next step</span>
          <p>{project.nextStep}</p>
        </div>
      ) : null}

      <p className="status-authority-note">
        <ShieldCheck size={19} weight="fill" aria-hidden="true" />
        This state came from the protected Matken project system. Website
        inputs never calculate or advance project status.
      </p>
    </section>
  );
}

export function StatusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const accessToken = searchParams.get("access") || "";
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState(null);
  const [project, setProject] = useState(null);
  const [accessError, setAccessError] = useState("");
  const fieldType = values.channel === "email" ? "email" : "tel";
  const hasConnectedProvider =
    providerConfig.projectStatusMode === "connected";

  const activeFieldHelp = useMemo(
    () =>
      values.channel === "email"
        ? "Use the email address Matken has for this project."
        : "Use the mobile number Matken has for this project.",
    [values.channel],
  );

  useEffect(() => {
    if (!accessToken) return undefined;

    if (!hasConnectedProvider) {
      setAccessError(
        "Project tracking is not connected in this prototype. The link was not checked.",
      );
      setSearchParams({}, { replace: true });
      return undefined;
    }

    let active = true;
    setAccessError("");
    lookupProjectStatus(accessToken)
      .then((result) => {
        if (active) setProject(result);
      })
      .catch((error) => {
        if (active) setAccessError(error.message);
      })
      .finally(() => {
        if (active) setSearchParams({}, { replace: true });
      });

    return () => {
      active = false;
    };
  }, [
    accessToken,
    hasConnectedProvider,
    setSearchParams,
  ]);

  const updateValue = (field, value) => {
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "channel" ? { destination: "" } : {}),
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setResponse(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setResponse(null);
    try {
      const result = await requestProjectStatusAccess({
        projectReference: values.projectReference.trim(),
        channel: values.channel,
        destination: values.destination.trim(),
      });
      setResponse(result);
    } catch (error) {
      setResponse({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Project access could not be requested.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="page-hero status-page-hero">
        <div className="shell page-hero-grid">
          <div>
            <span className="section-index">Private customer access</span>
            <h1>Check the confirmed state of your project.</h1>
            {hasConnectedProvider ? null : (
              <div className="provider-preview-banner" role="status">
                <Info size={20} weight="fill" aria-hidden="true" />
                <p>
                  Preview only. This page does not look up a project or send an
                  email or text message.
                </p>
              </div>
            )}
          </div>
          <p>
            Request a one-time access link using the contact detail already
            associated with the project. Reference numbers never reveal a
            project on their own.
          </p>
        </div>
      </section>

      <section className="section status-page">
        <div className="shell status-layout">
          <div>
            {project ? (
              <ConnectedStatus project={project} />
            ) : (
              <form
                className="status-access-card"
                onSubmit={submit}
                noValidate
              >
                <div className="status-access-heading">
                  <span className="status-lock">
                    <LockKey size={25} weight="duotone" aria-hidden="true" />
                  </span>
                  <div>
                    <span className="section-index">One-time verification</span>
                    <h2>Request private access</h2>
                  </div>
                </div>

                <p>
                  To protect project information, the same response appears
                  whether or not the details match a record.
                </p>

                <label className="field">
                  <span>Project reference</span>
                  <input
                    type="text"
                    value={values.projectReference}
                    onChange={(event) =>
                      updateValue("projectReference", event.target.value)
                    }
                    autoComplete="off"
                    placeholder="For example, MKN-…"
                    aria-invalid={Boolean(errors.projectReference)}
                    aria-describedby={
                      errors.projectReference
                        ? "status-reference-error"
                        : undefined
                    }
                  />
                  {errors.projectReference ? (
                    <small
                      id="status-reference-error"
                      className="field-error"
                    >
                      {errors.projectReference}
                    </small>
                  ) : null}
                </label>

                <fieldset className="status-channel">
                  <legend>Send my one-time link by</legend>
                  <label>
                    <input
                      type="radio"
                      name="status-channel"
                      value="email"
                      checked={values.channel === "email"}
                      onChange={() => updateValue("channel", "email")}
                    />
                    <EnvelopeSimple size={19} aria-hidden="true" />
                    Email
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="status-channel"
                      value="sms"
                      checked={values.channel === "sms"}
                      onChange={() => updateValue("channel", "sms")}
                    />
                    <Phone size={19} aria-hidden="true" />
                    Text message
                  </label>
                </fieldset>

                <label className="field">
                  <span>
                    {values.channel === "email"
                      ? "Project email"
                      : "Project mobile number"}
                  </span>
                  <input
                    type={fieldType}
                    aria-label={
                      values.channel === "email"
                        ? "Project email"
                        : "Project mobile number"
                    }
                    value={values.destination}
                    onChange={(event) =>
                      updateValue("destination", event.target.value)
                    }
                    autoComplete={
                      values.channel === "email" ? "email" : "tel"
                    }
                    inputMode={
                      values.channel === "email" ? "email" : "tel"
                    }
                    aria-invalid={Boolean(errors.destination)}
                    aria-describedby="status-destination-help"
                  />
                  <small
                    id="status-destination-help"
                    className={errors.destination ? "field-error" : ""}
                  >
                    {errors.destination || activeFieldHelp}
                  </small>
                </label>

                <button
                  className="button button-primary"
                  type="submit"
                  disabled={submitting}
                >
                  <Key size={19} weight="bold" aria-hidden="true" />
                  {submitting ? "Requesting access…" : "Send one-time link"}
                </button>

                {response ? (
                  <div
                    className={`status-response ${
                      response.ok ? "success" : "error"
                    }`}
                    role="status"
                  >
                    {response.message}
                  </div>
                ) : null}
                {accessError ? (
                  <div className="status-response error" role="alert">
                    {accessError}
                  </div>
                ) : null}

                <p className="status-preview-note">
                  {hasConnectedProvider
                    ? "Connected mode: Matken’s approved server controls verification and status."
                    : "Prototype mode: no lookup, email, or text message is sent."}
                </p>
              </form>
            )}
          </div>

          <aside className="status-explainer">
            <span className="section-index">Built around customer trust</span>
            <h2>Useful updates without exposing private work.</h2>
            <div className="status-benefits">
              <article>
                <span>01</span>
                <div>
                  <h3>No guessable lookup</h3>
                  <p>
                    A project reference is paired with a verified email or
                    phone channel and a short-lived one-time link.
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>Authoritative states only</h3>
                  <p>
                    The website can display a status supplied by Matken’s
                    protected project system. It never invents one from form
                    answers or elapsed time.
                  </p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>Clear next action</h3>
                  <p>
                    When Matken has confirmed a next step, the secure project
                    view can present it in plain language.
                  </p>
                </div>
              </article>
            </div>
            <div className="status-support">
              <ShieldCheck size={23} weight="fill" aria-hidden="true" />
              <div>
                <strong>Do not have a project reference?</strong>
                <p>
                  Start with a service request or call the verified public
                  number. The public form cannot recover private records.
                </p>
                <Link to="/request">
                  Prepare a request
                  <ArrowRight size={17} weight="bold" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
