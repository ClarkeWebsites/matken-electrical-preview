import {
  ArrowRight,
  MagnifyingGlass,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";
import { resourceArticles, services } from "../data/site.js";

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const searchItems = [
  {
    type: "Explore",
    title: "All services",
    description:
      "Compare Matken’s electrical, solar and storage, and construction project paths.",
    to: "/services",
    keywords: "service options project help residential commercial",
  },
  {
    type: "Planning tool",
    title: "Solar & backup planner",
    description:
      "Build an educational starting range from monthly usage, essential load, and backup time.",
    to: "/planner",
    keywords:
      "battery outage appliances electricity bill kwh panels essential power calculator",
  },
  {
    type: "Get started",
    title: "Project request",
    description:
      "Organize the property, timing, preparation, and contact details for a project conversation.",
    to: "/request",
    keywords:
      "quote estimate consultation contact photos appointment electrical solar construction",
  },
  {
    type: "Planning tool",
    title: "Matken Project Pack",
    description:
      "Combine a Blueprint, planning range, readiness notes, and request summary into a printable download.",
    to: "/project-pack",
    keywords:
      "download print pdf pack blueprint planner readiness summary handoff",
  },
  {
    type: "Customer access",
    title: "Invoice payment access",
    description:
      "See how private invoice lookup will work after a payment provider is approved. This preview does not look up invoices or take payment.",
    to: "/pay-invoice",
    keywords: "invoice billing receipt payment card secure pay preview gated",
  },
  {
    type: "Customer access",
    title: "Project status",
    description:
      "Request a private one-time link after project tracking is connected. This preview does not look up projects or send messages.",
    to: "/project-status",
    keywords:
      "track project progress update schedule status reference verification email sms preview gated",
  },
  {
    type: "Learn",
    title: "Planning resources",
    description:
      "Browse practical guides for solar, backup, electrical, and construction preparation.",
    to: "/resources",
    keywords: "guides checklist help learn articles",
  },
  {
    type: "Company",
    title: "About Matken",
    description:
      "Learn how Matken organizes electrical, solar, and construction project conversations.",
    to: "/about",
    keywords: "company approach jamaica",
  },
  ...services.map((service) => ({
    type: "Service",
    title: service.label,
    description: service.summary,
    to: `/services/${service.slug}`,
    keywords: [
      service.detail,
      service.eyebrow,
      ...service.pathways,
      ...service.questions,
    ].join(" "),
  })),
  ...resourceArticles.map((article) => ({
    type: article.category,
    title: article.title,
    description: article.excerpt,
    to: `/resources/${article.slug}`,
    keywords: [
      article.category,
      ...article.sections.flatMap((section) => [
        section.heading,
        section.body,
      ]),
    ].join(" "),
  })),
].map((item, index) => ({
  ...item,
  order: index,
  normalizedTitle: normalizeText(item.title),
  searchText: normalizeText(
    `${item.title} ${item.description} ${item.keywords}`,
  ),
}));

const suggestedSearches = [
  "Battery backup",
  "Electrical panel",
  "Solar consultation",
  "Construction scope",
  "Invoice payment",
];

function findResults(query) {
  const normalizedQuery = normalizeText(query);
  if (normalizedQuery.length < 2) return [];

  const terms = normalizedQuery.split(" ").filter(Boolean);
  return searchItems
    .flatMap((item) => {
      if (!terms.every((term) => item.searchText.includes(term))) return [];

      let score = 0;
      if (item.normalizedTitle === normalizedQuery) score += 120;
      if (item.normalizedTitle.startsWith(normalizedQuery)) score += 70;
      if (item.normalizedTitle.includes(normalizedQuery)) score += 45;
      if (item.searchText.includes(normalizedQuery)) score += 25;
      terms.forEach((term) => {
        if (item.normalizedTitle.includes(term)) score += 12;
        else score += 3;
      });

      return [{ ...item, score }];
    })
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 8);
}

export function SiteSearchDialog({ open, onClose }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const returnFocusRef = useRef(null);
  const results = useMemo(() => findResults(deferredQuery), [deferredQuery]);
  const normalizedQuery = normalizeText(deferredQuery);

  useEffect(() => {
    if (!open) return undefined;

    returnFocusRef.current = document.activeElement;
    document.body.classList.add("search-dialog-open");
    const focusFrame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.classList.remove("search-dialog-open");
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus({ preventScroll: true });
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  const hasSearch = normalizedQuery.length >= 2;

  return (
    <div
      className="site-search-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="site-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-search-title"
        aria-describedby="site-search-help"
      >
        <div className="site-search-heading">
          <div>
            <span className="section-index">Find the right next step</span>
            <h2 id="site-search-title">Search Matken</h2>
          </div>
          <button
            className="site-search-close"
            type="button"
            aria-label="Close search"
            onClick={onClose}
          >
            <X size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <p id="site-search-help" className="site-search-help">
          Search services, planning tools, request guidance, invoices, and
          practical resources.
        </p>

        <label className="site-search-input">
          <MagnifyingGlass size={22} weight="bold" aria-hidden="true" />
          <span className="visually-hidden">Search this website</span>
          <input
            ref={inputRef}
            type="search"
            aria-label="Search this website"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try “battery backup” or “panel”"
            autoComplete="off"
            spellCheck="false"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              Clear
            </button>
          ) : (
            <kbd>Esc</kbd>
          )}
        </label>

        <div className="site-search-body">
          {!hasSearch ? (
            <div className="site-search-suggestions">
              <p>Popular searches</p>
              <div>
                {suggestedSearches.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setQuery(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <p className="site-search-status" role="status" aria-live="polite">
                {results.length
                  ? `${results.length} result${results.length === 1 ? "" : "s"} for “${deferredQuery.trim()}”`
                  : `No results for “${deferredQuery.trim()}”`}
              </p>
              {results.length ? (
                <div className="site-search-results">
                  {results.map((result) => (
                    <Link
                      key={result.to}
                      to={result.to}
                      onClick={onClose}
                    >
                      <span>{result.type}</span>
                      <strong>{result.title}</strong>
                      <p>{result.description}</p>
                      <ArrowRight
                        size={20}
                        weight="bold"
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="site-search-empty">
                  <MagnifyingGlass size={28} aria-hidden="true" />
                  <h3>Try a broader project term.</h3>
                  <p>
                    Search for solar, battery, electrical, construction,
                    invoice, or request—or browse all service paths.
                  </p>
                  <Link to="/services" onClick={onClose}>
                    Browse all services
                    <ArrowRight size={18} weight="bold" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        <div className="site-search-privacy">
          <ShieldCheck size={19} weight="fill" aria-hidden="true" />
          <p>
            Private on this device. Search text is matched in your browser and
            is not sent to Matken or a third-party search service.
          </p>
        </div>
      </section>
    </div>
  );
}
