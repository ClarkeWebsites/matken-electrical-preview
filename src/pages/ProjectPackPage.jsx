import {
  ArrowRight,
  ClipboardText,
  Copy,
  DownloadSimple,
  FileText,
  MapTrifold,
  Printer,
  ShieldCheck,
  Sun,
  Trash,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { readinessChecklistByService } from "../data/site.js";
import {
  buildProjectPackHtml,
  buildProjectPackText,
  clearProjectPackRequestTransfer,
  clearProjectPackPlanning,
  createProjectPack,
  mergeProjectPackPlanning,
  normalizeProjectPackPlanning,
  projectPackDisplayData,
  projectPackConversationSummary,
  readProjectPackRequestTransfer,
} from "../lib/projectPack.js";
import { publicAssetUrl } from "../lib/appUrl.js";

const fileNameFor = (reference) =>
  `matken-project-pack${reference ? `-${reference}` : ""}.html`
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-");

export function ProjectPackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const incoming = location.state || {};
  const [requestTransferKey] = useState(() =>
    typeof incoming.requestTransferKey === "string"
      ? incoming.requestTransferKey
      : "",
  );
  const [incomingRequest] = useState(() =>
    readProjectPackRequestTransfer(requestTransferKey),
  );
  const [planning, setPlanning] = useState(() =>
    mergeProjectPackPlanning({
      ...(incoming.blueprint ? { blueprint: incoming.blueprint } : {}),
      ...(incoming.planner ? { planner: incoming.planner } : {}),
      ...(incoming.readiness ? { readiness: incoming.readiness } : {}),
    }),
  );
  const [requestSummary, setRequestSummary] = useState(
    incomingRequest.requestSummary,
  );
  const [requestReference, setRequestReference] = useState(
    incomingRequest.requestReference,
  );
  const [receivedPackUpdate, setReceivedPackUpdate] = useState(() => {
    const acceptedPlanning = normalizeProjectPackPlanning(incoming);
    return Boolean(
      acceptedPlanning.blueprint ||
        acceptedPlanning.planner ||
        acceptedPlanning.readiness ||
        incomingRequest.requestSummary,
    );
  });
  const [actionStatus, setActionStatus] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const display = useMemo(
    () => projectPackDisplayData(planning),
    [planning],
  );
  const pack = useMemo(
    () =>
      createProjectPack({
        planning,
        requestSummary,
        requestReference,
      }),
    [planning, requestReference, requestSummary],
  );
  const hasPlanning =
    Boolean(planning.blueprint) ||
    Boolean(planning.planner) ||
    Boolean(planning.readiness);
  const hasContent = hasPlanning || Boolean(pack.requestSummary);
  const readinessService = planning.readiness?.service || "";
  const readinessCount =
    readinessChecklistByService[readinessService]?.length || 0;
  const packParts = [
    { label: "Project Blueprint", present: Boolean(planning.blueprint) },
    { label: "Energy planning range", present: Boolean(planning.planner) },
    { label: "Readiness notes", present: Boolean(planning.readiness) },
    { label: "Request summary", present: Boolean(pack.requestSummary) },
  ];
  const completedPartCount = packParts.filter((part) => part.present).length;
  const conversationSummary = useMemo(
    () => projectPackConversationSummary(pack),
    [pack],
  );

  useEffect(() => {
    clearProjectPackRequestTransfer(requestTransferKey);
    if (location.state) {
      navigate("/project-pack", { replace: true, state: null });
    }
  }, [location.state, navigate, requestTransferKey]);

  const download = () => {
    if (!hasContent) return;
    const blob = new Blob([buildProjectPackHtml(pack)], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileNameFor(pack.requestReference);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setActionStatus(
      "Project Pack downloaded. It is now a file you control on this device.",
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildProjectPackText(pack));
      setActionStatus("Project Pack copied to your clipboard.");
    } catch {
      setActionStatus(
        "The pack could not be copied automatically. Print or download it instead.",
      );
    }
  };

  const clear = () => {
    clearProjectPackPlanning();
    const empty = mergeProjectPackPlanning({
      blueprint: null,
      planner: null,
      readiness: null,
    });
    setPlanning(empty);
    setRequestSummary("");
    setRequestReference("");
    setReceivedPackUpdate(false);
    setConfirmClear(false);
    setActionStatus(
      "Project Pack cleared from this tab. Downloaded files are not affected.",
    );
    navigate("/project-pack", { replace: true, state: null });
  };

  return (
    <>
      <section className="project-pack-hero">
        <div className="shell project-pack-hero-grid">
          <div>
            <span className="section-index section-index-light">
              Your planning handoff
            </span>
            <h1>Bring the whole project conversation into one pack.</h1>
            <p>
              Combine a Blueprint, solar and backup range, readiness notes,
              and a request summary—then print or download a polished copy.
            </p>
          </div>
          <div className="project-pack-hero-mark" aria-hidden="true">
            <img
              src={publicAssetUrl("/assets/brand/matken-mark-reversed.svg")}
              alt=""
              width="96"
              height="96"
            />
            <span>PROJECT PACK</span>
          </div>
        </div>
      </section>

      <section className="section project-pack-page">
        <div className="shell project-pack-layout">
          <article className="project-pack-sheet">
            <header className="project-pack-sheet-header">
              <img
                src={publicAssetUrl(
                  "/assets/brand/matken-logo-horizontal.svg",
                )}
                alt="Matken"
                width="580"
                height="112"
              />
              <div>
                <span>Private browser workspace</span>
                <strong>{hasContent ? "Ready to review" : "Waiting for details"}</strong>
              </div>
            </header>

            {!hasContent ? (
              <div className="project-pack-empty">
                <FileText size={40} weight="duotone" aria-hidden="true" />
                <h2>Start with any planning tool.</h2>
                <p>
                  Add pieces in any order. Only non-contact planning details
                  are held in this tab’s session storage.
                </p>
              </div>
            ) : (
              <div className="project-pack-sections">
                <article className="project-pack-conversation-summary">
                  <div className="project-pack-section-heading">
                    <FileText size={24} weight="duotone" aria-hidden="true" />
                    <div>
                      <span>Conversation at a glance</span>
                      <h2>The details you chose to organize.</h2>
                    </div>
                  </div>
                  <dl>
                    {conversationSummary.map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    This private snapshot organizes the starting conversation.
                    It does not confirm a quote, appointment, scope, or final
                    technical recommendation.
                  </p>
                </article>
                {planning.blueprint ? (
                  <article>
                    <div className="project-pack-section-heading">
                      <MapTrifold
                        size={24}
                        weight="duotone"
                        aria-hidden="true"
                      />
                      <div>
                        <span>01 · Project Blueprint</span>
                        <h2>{display.blueprintGoal?.label}</h2>
                      </div>
                    </div>
                    <dl className="project-pack-facts">
                      <div>
                        <dt>Starting service</dt>
                        <dd>{display.blueprintService?.label}</dd>
                      </div>
                      <div>
                        <dt>Planning category</dt>
                        <dd>{planning.blueprint.pathway}</dd>
                      </div>
                      <div>
                        <dt>Property</dt>
                        <dd>{planning.blueprint.propertyType}</dd>
                      </div>
                      <div>
                        <dt>Timing</dt>
                        <dd>{planning.blueprint.urgency}</dd>
                      </div>
                    </dl>
                  </article>
                ) : null}

                {planning.planner ? (
                  <article>
                    <div className="project-pack-section-heading">
                      <Sun size={24} weight="duotone" aria-hidden="true" />
                      <div>
                        <span>02 · Educational planning range</span>
                        <h2>
                          {planning.planner.result.startingSolarKw.toFixed(1)}{" "}
                          kW solar ·{" "}
                          {planning.planner.result.nominalBatteryKwh.toFixed(1)}{" "}
                          kWh battery
                        </h2>
                      </div>
                    </div>
                    <dl className="project-pack-facts">
                      <div>
                        <dt>Monthly use</dt>
                        <dd>{planning.planner.monthlyKwh} kWh</dd>
                      </div>
                      <div>
                        <dt>Essential load</dt>
                        <dd>{planning.planner.essentialKw} kW</dd>
                      </div>
                      <div>
                        <dt>Backup target</dt>
                        <dd>{planning.planner.outageHours} hours</dd>
                      </div>
                      <div>
                        <dt>Panel planning value</dt>
                        <dd>{planning.planner.panelWatts} W</dd>
                      </div>
                    </dl>
                    <p className="project-pack-boundary">
                      Educational only—not a design, quote, equipment
                      recommendation, or performance guarantee.
                    </p>
                  </article>
                ) : null}

                {planning.readiness ? (
                  <article>
                    <div className="project-pack-section-heading">
                      <ShieldCheck
                        size={24}
                        weight="duotone"
                        aria-hidden="true"
                      />
                      <div>
                        <span>03 · Readiness</span>
                        <h2>
                          {display.readinessSelected.length} of {readinessCount}{" "}
                          useful items already available
                        </h2>
                      </div>
                    </div>
                    <div className="project-pack-readiness">
                      <div>
                        <strong>Already available</strong>
                        <ul>
                          {display.readinessSelected.length ? (
                            display.readinessSelected.map((item) => (
                              <li key={item.id}>{item.label}</li>
                            ))
                          ) : (
                            <li>Nothing selected yet</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <strong>Still useful to gather</strong>
                        <ul>
                          {display.readinessRemaining.length ? (
                            display.readinessRemaining.map((item) => (
                              <li key={item.id}>{item.label}</li>
                            ))
                          ) : (
                            <li>Preparation list complete</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </article>
                ) : null}

                {pack.requestSummary ? (
                  <article>
                    <div className="project-pack-section-heading">
                      <ClipboardText
                        size={24}
                        weight="duotone"
                        aria-hidden="true"
                      />
                      <div>
                        <span>04 · Request summary</span>
                        <h2>
                          {pack.requestReference
                            ? `Reference ${pack.requestReference}`
                            : "Prepared request details"}
                        </h2>
                      </div>
                    </div>
                    <pre className="project-pack-request-summary">
                      {pack.requestSummary}
                    </pre>
                    <p className="project-pack-private-note">
                      This contact-bearing summary is held only in the current
                      page state. It is never added to session storage or a
                      resume URL.
                    </p>
                  </article>
                ) : null}
              </div>
            )}

            <footer className="project-pack-sheet-footer">
              This customer-prepared pack is not a quote, contract,
              appointment, diagnosis, design, safety clearance, schedule, or
              final work scope.
            </footer>
          </article>

          <aside className="project-pack-tools">
            <span className="section-index">Build the pack</span>
            <h2>Add what is useful. Leave out what is not.</h2>
            <section
              className="project-pack-completeness"
              aria-labelledby="project-pack-completeness-title"
            >
              <div>
                <span>Your private handoff</span>
                <strong id="project-pack-completeness-title">
                  {completedPartCount} of {packParts.length} optional pieces added
                </strong>
              </div>
              <ul>
                {packParts.map((part) => (
                  <li className={part.present ? "complete" : ""} key={part.label}>
                    <span aria-hidden="true">{part.present ? "✓" : "○"}</span>
                    {part.label}
                    <small>{part.present ? "Added" : "Optional"}</small>
                  </li>
                ))}
              </ul>
              <p>
                Add only what helps you explain the project. This is not a
                required checklist or a submitted request.
              </p>
            </section>
            <div className="project-pack-add">
              <Link to="/" state={{ projectPackMode: true }}>
                <MapTrifold size={20} aria-hidden="true" />
                <span>
                  <strong>
                    {planning.blueprint ? "Replace Blueprint" : "Add Blueprint"}
                  </strong>
                  Build from the homepage
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/planner" state={{ projectPackMode: true }}>
                <Sun size={20} aria-hidden="true" />
                <span>
                  <strong>
                    {planning.planner ? "Replace energy plan" : "Add energy plan"}
                  </strong>
                  Use the educational planner
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                to="/request"
                state={{
                  ...(planning.blueprint ? { blueprint: planning.blueprint } : {}),
                  ...(planning.planner ? { plan: planning.planner } : {}),
                  ...(planning.readiness ? { readiness: planning.readiness } : {}),
                }}
              >
                <ClipboardText size={20} aria-hidden="true" />
                <span>
                  <strong>Prepare a request</strong>
                  Add readiness and a final summary
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>

            <div className="project-pack-actions">
              <button
                className="button button-primary"
                type="button"
                disabled={!hasContent}
                onClick={download}
              >
                <DownloadSimple size={19} weight="bold" aria-hidden="true" />
                Download Project Pack
              </button>
              <button
                className="button button-outline"
                type="button"
                disabled={!hasContent}
                onClick={() => window.print()}
              >
                <Printer size={18} aria-hidden="true" />
                Print / save PDF
              </button>
              <button
                className="button button-outline"
                type="button"
                disabled={!hasContent}
                onClick={copy}
              >
                <Copy size={18} aria-hidden="true" />
                Copy as text
              </button>
            </div>

            <div className="project-pack-storage-note">
              <ShieldCheck size={20} weight="fill" aria-hidden="true" />
              <p>
                Blueprint, planner, and readiness selections may remain in
                this tab until it closes. Contact details and request
                summaries are not stored there.
              </p>
            </div>

            {receivedPackUpdate && !confirmClear ? (
              <p className="project-pack-status" role="status">
                Your private Project Pack was updated with the details you
                chose. Nothing was sent to Matken.
              </p>
            ) : null}

            {actionStatus ? (
              <p className="project-pack-status" role="status">
                {actionStatus}
              </p>
            ) : null}

            {confirmClear ? (
              <div className="project-pack-clear-confirmation" role="alert">
                <p>
                  Clear the planning details held in this tab? Downloaded files
                  are not affected.
                </p>
                <div>
                  <button
                    className="project-pack-clear"
                    type="button"
                    onClick={clear}
                  >
                    <Trash size={17} aria-hidden="true" />
                    Clear this pack now
                  </button>
                  <button
                    className="project-pack-clear-cancel"
                    type="button"
                    onClick={() => setConfirmClear(false)}
                  >
                    Keep this pack
                  </button>
                </div>
              </div>
            ) : hasContent ? (
              <button
                className="project-pack-clear"
                type="button"
                onClick={() => setConfirmClear(true)}
              >
                <Trash size={17} aria-hidden="true" />
                Clear this pack
              </button>
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}
