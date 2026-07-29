import { describe, expect, it, vi } from "vitest";
import { postProviderJson } from "../src/lib/providerConfig.js";

const headers = (contentType = "application/json") => ({
  get: (name) => (name.toLowerCase() === "content-type" ? contentType : null),
});

describe("provider request adapter", () => {
  it("returns a JSON object from a successful same-origin provider response", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      headers: headers(),
      json: async () => ({ reference: "MKN-ABC123" }),
    }));

    await expect(
      postProviderJson(
        "/api/request",
        { service: "solar" },
        "Generic failure",
        { fetchImpl },
      ),
    ).resolves.toEqual({ reference: "MKN-ABC123" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/request",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        redirect: "error",
      }),
    );
  });

  it("does not surface a provider response when delivery fails", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      headers: headers("text/plain"),
    }));

    await expect(
      postProviderJson(
        "/api/invoice",
        { invoiceReference: "private-reference" },
        "Generic invoice response",
        { fetchImpl },
      ),
    ).rejects.toThrow("Generic invoice response");
  });

  it("aborts a stalled provider request and returns the generic failure", async () => {
    const fetchImpl = vi.fn(
      (_endpoint, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            "abort",
            () => reject(new Error("internal timeout detail")),
            { once: true },
          );
        }),
    );

    await expect(
      postProviderJson("/api/request", {}, "Generic timeout response", {
        fetchImpl,
        timeoutMilliseconds: 5,
      }),
    ).rejects.toThrow("Generic timeout response");
  });
});
