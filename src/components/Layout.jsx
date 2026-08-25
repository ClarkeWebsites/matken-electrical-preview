import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  CaretDown,
  List,
  MagnifyingGlass,
  Phone,
  X,
} from "@phosphor-icons/react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import {
  business,
  liveContactTruth,
  mainNav,
  services,
} from "../data/site.js";
import { publicAssetUrl } from "../lib/appUrl.js";
import {
  businessJsonLd,
  canonicalUrlForPath,
  routeMetaForPath,
} from "../lib/siteMeta.js";

let siteSearchModulePromise;

const loadSiteSearchDialog = () => {
  siteSearchModulePromise ??= import("./SiteSearchDialog.jsx")
    .then((module) => ({
      default: module.SiteSearchDialog,
    }))
    .catch((error) => {
      siteSearchModulePromise = undefined;
      throw error;
    });
  return siteSearchModulePromise;
};

const SiteSearchDialog = lazy(loadSiteSearchDialog);

const warmSiteSearchDialog = () => {
  void loadSiteSearchDialog().catch(() => undefined);
};

function setMeta(selector, attribute, value) {
  const node = document.querySelector(selector);
  node?.setAttribute(attribute, value);
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    const routeMeta = routeMetaForPath(pathname);
    const canonical = canonicalUrlForPath(pathname, window.location);
    const jsonLdNode =
      document.getElementById("matken-business-jsonld") ||
      Object.assign(document.createElement("script"), {
        id: "matken-business-jsonld",
        type: "application/ld+json",
      });
    if (!jsonLdNode.isConnected) document.head.append(jsonLdNode);

    document.title = routeMeta.title;
    setMeta('meta[name="description"]', "content", routeMeta.description);
    setMeta('meta[property="og:title"]', "content", routeMeta.title);
    setMeta('meta[property="og:description"]', "content", routeMeta.description);
    setMeta('meta[property="og:url"]', "content", canonical);
    setMeta('meta[name="twitter:title"]', "content", routeMeta.title);
    setMeta(
      'meta[name="twitter:description"]',
      "content",
      routeMeta.description,
    );
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute("href", canonical);
    jsonLdNode.textContent = JSON.stringify(businessJsonLd(window.location));
  }, [pathname]);

  return null;
}

function RouteAnnouncer({ mainRef }) {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (previousPath.current === pathname) return undefined;
    previousPath.current = pathname;

    const focusFrame = window.requestAnimationFrame(() => {
      const heading = mainRef.current?.querySelector("h1")?.textContent?.trim();
      setMessage(`${heading || "Page"} loaded`);
      mainRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [mainRef, pathname]);

  return (
    <p className="visually-hidden" role="status" aria-live="polite">
      {message}
    </p>
  );
}

function DesktopServicesMenu() {
  return (
    <div className="nav-services">
      <NavLink to="/services" className="nav-link nav-services-trigger">
        Services <CaretDown size={13} weight="bold" aria-hidden="true" />
      </NavLink>
      <div className="nav-services-popover" aria-label="Service pages">
        <Link to="/services" className="nav-popover-intro">
          <span>All services</span>
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
        {services.map((service) => (
          <Link key={service.slug} to={`/services/${service.slug}`}>
            <span>{service.label}</span>
            <small>{service.summary}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();
  const menuButtonRef = useRef(null);
  const mainRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const modalOpen = menuOpen || searchOpen;
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openSearch = useCallback(() => {
    setMenuOpen(false);
    setSearchOpen(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    const handleSearchShortcut = (event) => {
      if (event.defaultPrevented) return;

      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.matches("input, textarea, select") ||
          target.isContentEditable);
      if (isTyping) return;

      const key = event.key.toLowerCase();
      const commandShortcut = (event.metaKey || event.ctrlKey) && key === "k";
      const slashShortcut =
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey;
      if (!commandShortcut && !slashShortcut) return;

      event.preventDefault();
      openSearch();
    };

    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, [openSearch]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      mobileMenuRef.current?.querySelector("a")?.focus();
    });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = [
        menuButtonRef.current,
        ...(mobileMenuRef.current?.querySelectorAll("a, button") || []),
      ].filter(Boolean);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const desktopBreakpoint =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(min-width: 921px)")
        : null;
    const closeAtDesktop = (event) => {
      if (event.matches) setMenuOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    desktopBreakpoint?.addEventListener("change", closeAtDesktop);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      desktopBreakpoint?.removeEventListener("change", closeAtDesktop);
    };
  }, [menuOpen]);

  return (
    <>
      <ScrollToTop />
      <RouteAnnouncer mainRef={mainRef} />
      <a
        className="skip-link"
        href="#main-content"
        inert={searchOpen ? true : undefined}
      >
        Skip to content
      </a>
      <header
        className="site-header"
        inert={searchOpen ? true : undefined}
        aria-hidden={searchOpen ? "true" : undefined}
      >
        <div className="utility-bar">
          <div className="shell utility-inner">
            <span>Call is live · planning tools stay private</span>
            <div className="utility-actions">
              <Link to="/project-status">Track a project</Link>
              <a href={`tel:${business.phoneHref}`}>
                <Phone size={15} weight="fill" aria-hidden="true" />
                {business.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
        <div className="shell header-inner">
          <Link className="brand" to="/" aria-label="Matken home">
            <img
              src={publicAssetUrl("/assets/brand/matken-logo-wordmark.svg")}
              alt="Matken Electrical, Solar and Construction"
              width="390"
              height="96"
            />
          </Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {mainNav.map((item) =>
              item.to === "/services" ? (
                <DesktopServicesMenu key={item.to} />
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-link${isActive ? " active" : ""}`
                  }
                  end={item.to === "/"}
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>
          <div className="header-actions">
            <button
              className="header-search"
              type="button"
              aria-label="Search this website"
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              aria-keyshortcuts="/ Control+K Meta+K"
              onClick={openSearch}
              onPointerEnter={warmSiteSearchDialog}
              onPointerDown={warmSiteSearchDialog}
              onFocus={warmSiteSearchDialog}
            >
              <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
              <span>Search</span>
              <kbd>/</kbd>
            </button>
            <a className="header-call" href={`tel:${business.phoneHref}`}>
              <Phone size={17} weight="fill" aria-hidden="true" />
              Call {business.phoneDisplay}
            </a>
            <Link className="button button-primary button-compact" to="/request">
              Request service
              <ArrowRight size={17} weight="bold" aria-hidden="true" />
            </Link>
            <button
              ref={menuButtonRef}
              className="menu-button"
              type="button"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X size={25} /> : <List size={25} />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <div
            ref={mobileMenuRef}
            id="mobile-menu"
            className="mobile-menu open"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
          >
            <nav className="shell mobile-nav" aria-label="Mobile navigation">
              {mainNav.map((item) => (
                <NavLink key={item.to} to={item.to}>
                  {item.label}
                  <ArrowRight size={18} aria-hidden="true" />
                </NavLink>
              ))}
              <div className="mobile-service-links">
                {services.map((service) => (
                  <Link key={service.slug} to={`/services/${service.slug}`}>
                    {service.label}
                  </Link>
                ))}
              </div>
              <div className="mobile-nav-cta">
                <a
                  className="button button-dark"
                  href={`tel:${business.phoneHref}`}
                >
                  <Phone size={18} weight="fill" aria-hidden="true" />
                  Call {business.phoneDisplay}
                </a>
                <Link className="button button-primary" to="/request">
                  Prepare a request
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </Link>
                <p>{liveContactTruth}</p>
              </div>
              <Link to="/project-pack">
                Project Pack
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/pay-invoice">
                Pay an invoice
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/project-status">
                Track a project
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      {searchOpen ? (
        <Suspense
          fallback={
            <div className="site-search-overlay">
              <p className="site-search-loading" role="status">
                Opening private site search…
              </p>
            </div>
          }
        >
          <SiteSearchDialog open onClose={closeSearch} />
        </Suspense>
      ) : null}

      <main
        ref={mainRef}
        id="main-content"
        tabIndex="-1"
        inert={modalOpen ? true : undefined}
        aria-hidden={modalOpen ? "true" : undefined}
      >
        <Outlet />
      </main>

      <footer
        className="site-footer"
        inert={modalOpen ? true : undefined}
        aria-hidden={modalOpen ? "true" : undefined}
      >
        <div className="shell footer-grid">
          <div className="footer-brand">
            <img
              src={publicAssetUrl("/assets/brand/matken-logo-reversed.svg")}
              alt="Matken Electrical, Solar and Construction"
              width="580"
              height="112"
            />
            <p>
              Practical pathways for electrical, solar, and construction
              projects in Jamaica.
            </p>
            <a className="footer-phone" href={`tel:${business.phoneHref}`}>
              <Phone size={19} weight="fill" aria-hidden="true" />
              {business.phoneDisplay}
            </a>
          </div>
          <div>
            <h2>Explore</h2>
            <Link to="/services">Services</Link>
            <Link to="/planner">Solar planner</Link>
            <Link to="/project-pack">Project Pack</Link>
            <Link to="/resources">Resources</Link>
            <Link to="/about">About Matken</Link>
          </div>
          <div>
            <h2>Get started</h2>
            <Link to="/request">Request service</Link>
            <Link to="/project-pack">Project Pack</Link>
            <Link to="/project-status">Track a project</Link>
            <Link to="/pay-invoice">Pay an invoice</Link>
            <a href={`tel:${business.phoneHref}`}>Call Matken</a>
            <a
              href={publicAssetUrl("/assets/matken-contact.vcf")}
              download
            >
              Save Matken contact
            </a>
          </div>
          <div className="footer-cta">
            <h2>Have a project in mind?</h2>
            <p>
              Share the property, timing, and goal, then call the verified
              number. Website forms do not send details in this preview.
            </p>
            <Link className="button button-sun" to="/request">
              Prepare a request
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="shell footer-bottom">
          <span>© {new Date().getFullYear()} Matken Electrical.</span>
          <span className="prototype-note">
            {liveContactTruth}
          </span>
          <div>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>

      {pathname === "/request" ? null : (
        <div
          className="mobile-action-bar"
          inert={modalOpen ? true : undefined}
          aria-hidden={modalOpen ? "true" : undefined}
        >
          <a href={`tel:${business.phoneHref}`}>
            <Phone size={20} weight="fill" aria-hidden="true" />
            Call
          </a>
          <Link to="/request">
            Prepare a request
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      )}
    </>
  );
}
