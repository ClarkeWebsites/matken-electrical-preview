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

export const providerConfig = Object.freeze({
  requestEndpoint,
  invoiceLookupEndpoint,
  requestMode: requestEndpoint ? "connected" : "preview",
  paymentMode: invoiceLookupEndpoint ? "connected" : "preview",
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
