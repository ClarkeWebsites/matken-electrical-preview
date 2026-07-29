const normalizeAppRoute = (route = "/") => {
  const value = String(route || "/");
  return value.startsWith("/") ? value : `/${value}`;
};

const normalizedBaseUrl = (() => {
  const configured = String(import.meta.env.BASE_URL || "/").trim();
  const leading = configured.startsWith("/") ? configured : `/${configured}`;
  return leading.endsWith("/") ? leading : `${leading}/`;
})();

export function publicAssetUrl(value) {
  const assetPath = String(value || "").trim();
  if (
    !assetPath ||
    /^(?:[a-z]+:|\/\/|#)/i.test(assetPath)
  ) {
    return assetPath;
  }
  if (normalizedBaseUrl !== "/" && assetPath.startsWith(normalizedBaseUrl)) {
    return assetPath;
  }
  return `${normalizedBaseUrl}${assetPath.replace(/^\/+/, "")}`;
}

export function appSearchFromLocation(locationLike) {
  if (!locationLike) return "";

  const hash = String(locationLike.hash || "").replace(/^#/, "");
  if (hash.startsWith("/")) {
    const queryIndex = hash.indexOf("?");
    if (queryIndex !== -1) return hash.slice(queryIndex);
  }
  return locationLike.search || "";
}

export function createAppShareUrl(
  route,
  locationLike,
  { hashRouting } = {},
) {
  const normalizedRoute = normalizeAppRoute(route);
  const currentUrl = new URL(
    locationLike?.href ||
      `${locationLike?.origin || "http://localhost"}${
        locationLike?.pathname || "/"
      }${locationLike?.search || ""}${locationLike?.hash || ""}`,
  );
  const shouldUseHashRouting =
    typeof hashRouting === "boolean"
      ? hashRouting
      : String(locationLike?.hash || "").startsWith("#/");

  if (shouldUseHashRouting) {
    currentUrl.search = "";
    currentUrl.hash = `#${normalizedRoute}`;
    return currentUrl.href;
  }

  return new URL(normalizedRoute, currentUrl.origin).href;
}
