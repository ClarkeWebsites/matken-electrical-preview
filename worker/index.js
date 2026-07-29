const exactAppRoutes = new Set([
  "/",
  "/about",
  "/pay-invoice",
  "/planner",
  "/privacy",
  "/request",
  "/resources",
  "/services",
  "/terms",
]);
const dynamicAppRoutes = [/^\/resources\/[^/]+\/?$/, /^\/services\/[^/]+\/?$/];

const isAppRoute = (pathname) => {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return (
    exactAppRoutes.has(normalized) ||
    dynamicAppRoutes.some((pattern) => pattern.test(pathname))
  );
};

const withDeliveryHeaders = (request, response, { html = false } = {}) => {
  const headers = new Headers(response.headers);
  const pathname = new URL(request.url).pathname;

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=()",
  );
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "connect-src 'self'",
      "font-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data:",
      "manifest-src 'self'",
      "object-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
    ].join("; "),
  );

  if (new URL(request.url).protocol === "https:") {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  if (html) {
    headers.set("Cache-Control", "no-cache");
  } else if (/\/assets\/.*-[a-z0-9_-]{8,}\.(?:css|js)$/i.test(pathname)) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    headers.set("Cache-Control", "public, max-age=3600");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    const canUseAppShell =
      response.status === 404 &&
      acceptsHtml &&
      ["GET", "HEAD"].includes(request.method);

    if (!canUseAppShell) {
      return withDeliveryHeaders(request, response, {
        html: response.headers.get("content-type")?.includes("text/html"),
      });
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    const appShell = await env.ASSETS.fetch(new Request(indexUrl, request));
    const status = isAppRoute(new URL(request.url).pathname) ? 200 : 404;
    const routedResponse = new Response(appShell.body, {
      status,
      headers: appShell.headers,
    });

    return withDeliveryHeaders(request, routedResponse, { html: true });
  },
};
