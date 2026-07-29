import { lazy, Suspense, useState } from "react";
import {
  ArrowRight,
  Buildings,
  Check,
  ClipboardText,
  HardHat,
  House,
  MapTrifold,
  Plug,
  Sun,
  Wrench,
} from "@phosphor-icons/react";
import { Link } from "react-router";
import { OptimizedImage } from "../components/OptimizedImage.jsx";
import {
  business,
  faqs,
  processSteps,
  projectCategories,
  resourceArticles,
  services,
} from "../data/site.js";

const serviceIcons = {
  solar: Sun,
  electrical: Plug,
  construction: HardHat,
};

const featuredResources = resourceArticles.slice(0, 3);
let blueprintModulePromise;

const loadProjectBlueprint = () => {
  blueprintModulePromise ??= import(
    "../components/ProjectBlueprint.jsx"
  ).catch((error) => {
    blueprintModulePromise = undefined;
    throw error;
  });
  return blueprintModulePromise;
};

const warmProjectBlueprint = () => {
  void loadProjectBlueprint().catch(() => undefined);
};

const warmPlannerPage = () => {
  void import("./PlannerPage.jsx").catch(() => undefined);
};

const warmRequestPage = () => {
  void import("./RequestPage.jsx").catch(() => undefined);
};

const focusProjectBlueprintEntry = () => {
  window.requestAnimationFrame(() => {
    document
      .querySelector("#project-blueprint .blueprint-panel-launch button")
      ?.focus({ preventScroll: true });
  });
};

const LazyProjectBlueprint = lazy(() =>
  loadProjectBlueprint().then((module) => ({
    default: module.ProjectBlueprint,
  })),
);

function BlueprintExperience() {
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <Suspense
        fallback={
          <div
            className="blueprint-panel blueprint-loading"
            role="status"
          >
            <span />
            <strong>Preparing your private Project Blueprint…</strong>
          </div>
        }
      >
        <LazyProjectBlueprint />
      </Suspense>
    );
  }

  return (
    <div className="blueprint-panel blueprint-panel-launch">
      <div className="blueprint-intro">
        <div>
          <span className="section-index section-index-light">
            Private project planning
          </span>
          <h2>Build your Matken Project Blueprint.</h2>
        </div>
        <div>
          <p>
            Answer a few project questions and leave with an organized
            starting brief before you decide whether to contact Matken.
          </p>
          <span className="blueprint-privacy-line">
            <ClipboardText size={17} weight="duotone" aria-hidden="true" />
            No contact details here. Project answers are not sent to Matken.
          </span>
        </div>
      </div>
      <div className="blueprint-launch">
        <ol aria-label="Project Blueprint stages">
          {[
            ["01", "Outcome", "Name the result you need"],
            ["02", "Context", "Shape the starting path"],
            ["03", "Preparation", "See what is useful to gather"],
          ].map(([number, label, copy]) => (
            <li key={number}>
              <span>{number}</span>
              <strong>{label}</strong>
              <small>{copy}</small>
            </li>
          ))}
        </ol>
        <button
          className="button button-sun"
          type="button"
          onPointerEnter={warmProjectBlueprint}
          onPointerDown={warmProjectBlueprint}
          onFocus={warmProjectBlueprint}
          onClick={() => setStarted(true)}
        >
          Start my blueprint
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function HomeFaq() {
  return (
    <div className="faq-list">
      {faqs.slice(0, 4).map((faq) => (
        <details key={faq.question}>
          <summary>{faq.question}</summary>
          <p>{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function HomePage() {
  return (
    <>
      <section className="home-hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <h1>Power, projects, and next steps—made clearer.</h1>
            <p>
              Explore electrical, solar, and construction pathways built
              around the way Jamaican homes and businesses actually use their
              spaces.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/request">
                Request a consultation
                <ArrowRight size={19} weight="bold" aria-hidden="true" />
              </Link>
              <Link className="text-link" to="/services">
                Explore services
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
            </div>
            <div className="hero-proof" aria-label="Matken service overview">
              <div>
                <House size={20} aria-hidden="true" />
                <span>Homes</span>
              </div>
              <div>
                <Buildings size={20} aria-hidden="true" />
                <span>Businesses</span>
              </div>
              <div>
                <Wrench size={20} aria-hidden="true" />
                <span>Project coordination</span>
              </div>
            </div>
          </div>
          <div className="hero-media">
            <OptimizedImage
              src="/assets/matken-hero-solar.jpg"
              alt="Representative solar panels installed on residential rooftops"
              eager
              sizes="(max-width: 920px) 100vw, 52vw"
            />
            <span className="image-disclosure">
              Representative editorial image
            </span>
            <div className="hero-callout">
              <Sun size={25} weight="duotone" aria-hidden="true" />
              <div>
                <strong>Start with your energy goals</strong>
                <span>Then size the conversation around the property.</span>
              </div>
            </div>
          </div>
        </div>
        <div className="shell hero-rail" aria-label="Quick actions">
          <a
            href="#project-blueprint"
            aria-controls="project-blueprint"
            onPointerEnter={warmProjectBlueprint}
            onPointerDown={warmProjectBlueprint}
            onFocus={warmProjectBlueprint}
            onClick={focusProjectBlueprintEntry}
          >
            <MapTrifold size={21} aria-hidden="true" />
            <span>
              <strong>Build my Project Blueprint</strong>
              Create a private starting brief
            </span>
            <ArrowRight size={19} aria-hidden="true" />
          </a>
          <Link
            to="/planner"
            onPointerEnter={warmPlannerPage}
            onPointerDown={warmPlannerPage}
            onFocus={warmPlannerPage}
          >
            <Sun size={21} aria-hidden="true" />
            <span>
              <strong>Explore solar readiness</strong>
              Build an educational starting estimate
            </span>
            <ArrowRight size={19} aria-hidden="true" />
          </Link>
          <Link
            to="/request"
            onPointerEnter={warmRequestPage}
            onPointerDown={warmRequestPage}
            onFocus={warmRequestPage}
          >
            <ClipboardText size={21} aria-hidden="true" />
            <span>
              <strong>Organize a service request</strong>
              Capture the details before you call
            </span>
            <ArrowRight size={19} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="section section-services">
        <div className="shell">
          <div className="section-heading heading-split">
            <div>
              <span className="section-index">Three connected disciplines</span>
              <h2>One project can cross more than one service.</h2>
            </div>
            <p>
              Start with the primary need. The request flow leaves room to
              explain where electrical, energy, and construction work overlap.
            </p>
          </div>
          <div className="service-feature-list">
            {services.map((service, index) => {
              const Icon = serviceIcons[service.slug];
              return (
                <article
                  className={`service-feature accent-${service.accent}`}
                  key={service.slug}
                >
                  <span className="service-number">0{index + 1}</span>
                  <div className="service-icon">
                    <Icon size={28} weight="duotone" aria-hidden="true" />
                  </div>
                  <div>
                    <h3>{service.label}</h3>
                    <p>{service.summary}</p>
                  </div>
                  <Link
                    className="round-link"
                    to={`/services/${service.slug}`}
                    aria-label={`Explore ${service.label}`}
                  >
                    <ArrowRight size={20} weight="bold" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="section section-finder"
        id="project-blueprint"
      >
        <div className="shell">
          <BlueprintExperience />
        </div>
      </section>

      <section className="section section-projects">
        <div className="shell">
          <div className="section-heading heading-split">
            <div>
              <span className="section-index">Project categories</span>
              <h2>See the shape of the work before you request it.</h2>
            </div>
            <p>
              These images show representative project categories. Approved
              Matken photography can replace them without changing the site
              structure.
            </p>
          </div>
          <div className="project-gallery">
            {projectCategories.map((project, index) => (
              <figure
                className={
                  index === 0
                    ? "project-card project-card-wide"
                    : "project-card"
                }
                key={project.title}
              >
                <OptimizedImage
                  src={project.image}
                  alt={project.alt}
                  sizes={
                    index === 0
                      ? "(max-width: 700px) 100vw, 66vw"
                      : "(max-width: 700px) 100vw, 34vw"
                  }
                />
                <figcaption>
                  <span>Representative category</span>
                  <h3>{project.title}</h3>
                  <p>{project.copy}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section planner-promo">
        <div className="shell planner-promo-grid">
          <div className="planner-promo-copy">
            <span className="section-index section-index-light">
              Start with a range, not a sales claim
            </span>
            <h2>Build a practical outage and solar planning brief.</h2>
            <p>
              Estimate essential backup energy and a starting solar range,
              then carry the result into a consultation request.
            </p>
            <ul className="check-list">
              <li>
                <Check size={18} weight="bold" aria-hidden="true" />
                Essential-load estimate
              </li>
              <li>
                <Check size={18} weight="bold" aria-hidden="true" />
                Outage-duration planning
              </li>
              <li>
                <Check size={18} weight="bold" aria-hidden="true" />
                Printable consultation brief
              </li>
            </ul>
            <Link className="button button-sun" to="/planner">
              Open the planning tool
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>
          </div>
          <div className="planner-visual" aria-hidden="true">
            <div className="planner-visual-top">
              <span>Backup planning preview</span>
              <Sun size={26} weight="duotone" />
            </div>
            <div className="planner-chart">
              <div style={{ "--bar": "42%" }}>
                <span>Lighting & essentials</span>
                <i />
              </div>
              <div style={{ "--bar": "66%" }}>
                <span>Refrigeration & connectivity</span>
                <i />
              </div>
              <div style={{ "--bar": "82%" }}>
                <span>Selected critical loads</span>
                <i />
              </div>
            </div>
            <div className="planner-visual-result">
              <span>Planning range</span>
              <strong>Calculated from your inputs</strong>
              <small>Educational only · site review still required</small>
            </div>
          </div>
        </div>
      </section>

      <section className="section process-section">
        <div className="shell">
          <div className="section-heading">
            <span className="section-index">How the conversation moves</span>
            <h2>A clear request makes the next step easier.</h2>
          </div>
          <div className="process-grid">
            {processSteps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section resources-preview">
        <div className="shell">
          <div className="section-heading heading-inline">
            <div>
              <span className="section-index">Plan with more confidence</span>
              <h2>Practical guides before the first call.</h2>
            </div>
            <Link className="text-link" to="/resources">
              View all resources
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>
          </div>
          <div className="resource-grid">
            {featuredResources.map((article) => (
              <article key={article.slug}>
                <span>
                  {article.category} · {article.readTime}
                </span>
                <h3>{article.title}</h3>
                <p>{article.excerpt}</p>
                <Link to={`/resources/${article.slug}`}>
                  Read guide
                  <ArrowRight size={16} weight="bold" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section faq-section">
        <div className="shell faq-layout">
          <div className="faq-intro">
            <span className="section-index">Useful answers</span>
            <h2>Questions worth resolving early.</h2>
            <p>
              Still unsure where to start? Call {business.phoneDisplay} or
              prepare a request with the details you already know.
            </p>
            <Link className="button button-dark" to="/request">
              Prepare a request
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>
          </div>
          <HomeFaq />
        </div>
      </section>
    </>
  );
}
