const normalizeRelativeEndpoint = (value) => {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.startsWith("/") && !trimmed.startsWith("//") ? trimmed : "";
};

const requestEndpoint = normalizeRelativeEndpoint(
  import.meta.env.VITE_REQUEST_ENDPOINT,
);
const invoiceLookupEndpoint = normalizeRelativeEndpoint(
  import.meta.env.VITE_INVOICE_LOOKUP_ENDPOINT,
);
const projectStatusEndpoint = normalizeRelativeEndpoint(
  import.meta.env.VITE_PROJECT_STATUS_ENDPOINT,
);

export const providerConfig = Object.freeze({
  requestEndpoint,
  invoiceLookupEndpoint,
  projectStatusEndpoint,
  requestMode: requestEndpoint ? "connected" : "preview",
  paymentMode: invoiceLookupEndpoint ? "connected" : "preview",
  projectStatusMode: projectStatusEndpoint ? "connected" : "preview",
});

export const PROVIDER_REQUEST_TIMEOUT_MS = 15_000;

export const postProviderJson = async (
  endpoint,
  payload,
  failureMessage,
  {
    fetchImpl = globalThis.fetch,
    timeoutMilliseconds = PROVIDER_REQUEST_TIMEOUT_MS,
  } = {},
) => {
  const controller =
    typeof AbortController === "function" ? new AbortController() : null;
  const timeout = controller
    ? globalThis.setTimeout(
        () => controller.abort("provider-timeout"),
        timeoutMilliseconds,
      )
    : null;

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "same-origin",
      redirect: "error",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });
  } catch {
    throw new Error(failureMessage);
  } finally {
    if (timeout !== null) globalThis.clearTimeout(timeout);
  }

  if (!response.ok) throw new Error(failureMessage);

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};

  try {
    const result = await response.json();
    return result && typeof result === "object" ? result : {};
  } catch {
    throw new Error(failureMessage);
  }
};

export function buildRequestReference() {
  const stamp = Date.now().toString(36).slice(-6).toUpperCase();
  const random = crypto.getRandomValues(new Uint16Array(2));
  return `MKN-${stamp}-${random[0].toString(36).toUpperCase()}${random[1]
    .toString(36)
    .toUpperCase()}`.slice(0, 24);
}

export async function submitRequest(payload) {
  const reference = buildRequestReference();

  if (!providerConfig.requestEndpoint) {
    return {
      ok: true,
      mode: "prepared",
      reference,
      message:
        "Your request summary is prepared on this device. It has not been transmitted.",
    };
  }

  const result = await postProviderJson(
    providerConfig.requestEndpoint,
    { ...payload, clientReference: reference },
    "The request could not be delivered. Please call Matken.",
  );
  const providerReference =
    typeof result.reference === "string" &&
    /^[a-z0-9_-]{6,64}$/i.test(result.reference)
      ? result.reference
      : reference;

  return {
    ok: true,
    mode: "submitted",
    reference: providerReference,
    message: "Your request was received for review.",
  };
}

export async function requestInvoiceAccess({ invoiceReference, email }) {
  if (!providerConfig.invoiceLookupEndpoint) {
    return {
      ok: true,
      mode: "preview",
      message:
        "Online invoice access is not connected in this prototype. No lookup was performed.",
    };
  }

  await postProviderJson(
    providerConfig.invoiceLookupEndpoint,
    { invoiceReference, email },
    "If the details match an invoice, a secure access link will be sent.",
  );

  return {
    ok: true,
    mode: "submitted",
    message:
      "If the details match an invoice, a secure access link will be sent.",
  };
}

export const projectStatusStages = Object.freeze([
  {
    code: "request_received",
    label: "Request received",
    description: "The project request is available for review.",
  },
  {
    code: "scope_clarification",
    label: "Clarifying the scope",
    description: "Project details or site context are being organized.",
  },
  {
    code: "site_review",
    label: "Site review",
    description: "A property or technical review is the active next step.",
  },
  {
    code: "proposal_ready",
    label: "Proposal ready",
    description: "A project document is ready through the approved channel.",
  },
  {
    code: "approved_scheduled",
    label: "Approved and scheduled",
    description: "The agreed work has an authoritative schedule.",
  },
  {
    code: "in_progress",
    label: "In progress",
    description: "The approved work is underway.",
  },
  {
    code: "complete",
    label: "Complete",
    description: "The project record has been marked complete.",
  },
]);

const projectStatusCodes = new Set(
  projectStatusStages.map((stage) => stage.code),
);

const normalizeAccessToken = (value) => {
  const token = String(value || "").trim();
  return /^[a-z0-9_-]{24,256}$/i.test(token) ? token : "";
};

export async function requestProjectStatusAccess(
  { projectReference, channel, destination },
  options,
) {
  const genericMessage =
    "If the details match a project, a one-time access link will be sent.";

  if (!providerConfig.projectStatusEndpoint) {
    return {
      ok: true,
      mode: "preview",
      message:
        "Project tracking is not connected in this prototype. No project lookup was performed and no message was sent.",
    };
  }

  await postProviderJson(
    providerConfig.projectStatusEndpoint,
    {
      action: "request-access",
      projectReference,
      channel,
      destination,
    },
    genericMessage,
    options,
  );

  return {
    ok: true,
    mode: "submitted",
    message: genericMessage,
  };
}

export async function lookupProjectStatus(accessToken, options) {
  const token = normalizeAccessToken(accessToken);
  if (!token || !providerConfig.projectStatusEndpoint) {
    throw new Error(
      "This project-status link is unavailable. Request a new one-time link.",
    );
  }

  const result = await postProviderJson(
    providerConfig.projectStatusEndpoint,
    { action: "lookup-status", accessToken: token },
    "This project-status link is unavailable. Request a new one-time link.",
    options,
  );

  if (
    !projectStatusCodes.has(result.status) ||
    !/^[a-z0-9_-]{6,64}$/i.test(String(result.projectReference || ""))
  ) {
    throw new Error(
      "This project-status link is unavailable. Request a new one-time link.",
    );
  }

  const stage = projectStatusStages.find(
    (item) => item.code === result.status,
  );
  return {
    projectReference: result.projectReference,
    status: stage,
    updatedLabel:
      typeof result.updatedLabel === "string" &&
      result.updatedLabel.length <= 80
        ? result.updatedLabel
        : "",
    nextStep:
      typeof result.nextStep === "string" && result.nextStep.length <= 240
        ? result.nextStep
        : "",
  };
}
