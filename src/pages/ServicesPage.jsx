import {
  ArrowRight,
  Check,
  Copy,
  HardHat,
  Plug,
  Sun,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { OptimizedImage } from "../components/OptimizedImage.jsx";
import { services } from "../data/site.js";

const serviceIcons = {
  solar: Sun,
  electrical: Plug,
  construction: HardHat,
};

const serviceQuestionText = (service) =>
  [
    `MATKEN ${service.label.toUpperCase()} — PREPARATION QUESTIONS`,
    "",
    ...service.questions.map((question) => `- ${question}`),
    "",
    "These are planning prompts only. They do not establish a quote, diagnosis, final scope, or appointment.",
  ].join("\n");

export function ServicesOverviewPage() {
  return (
    <>
      <section className="page-hero page-hero-services">
        <div className="shell page-hero-grid">
          <div>
            <span className="section-index">Services</span>
            <h1>Start with the project—not a list of buzzwords.</h1>
          </div>
          <p>
            Matken’s public service paths cover electrical, solar, and
            construction. Choose the closest starting point, then use the
            request form to explain where the work overlaps.
          </p>
        </div>
      </section>

      <section className="section services-overview-list">
        <div className="shell">
          {services.map((service, index) => {
            const Icon = serviceIcons[service.slug];
            return (
              <article
                className={`service-overview-row accent-${service.accent}`}
                key={service.slug}
              >
                <div className="service-overview-image">
                  <OptimizedImage
                    src={service.image}
                    alt={service.imageAlt}
                    eager={index === 0}
                    sizes="(max-width: 920px) 100vw, 50vw"
                  />
                  <span>Representative editorial image</span>
                </div>
                <div className="service-overview-content">
                  <span className="service-overview-number">0{index + 1}</span>
                  <Icon size={35} weight="duotone" aria-hidden="true" />
                  <h2>{service.label}</h2>
                  <p>{service.detail}</p>
                  <ul>
                    {service.pathways.map((pathway) => (
                      <li key={pathway}>
                        <Check size={17} weight="bold" aria-hidden="true" />
                        {pathway}
                      </li>
                    ))}
                  </ul>
                  <div className="button-row">
                    <Link
                      className="button button-dark"
                      to={`/services/${service.slug}`}
                    >
                      Explore {service.shortLabel}
                      <ArrowRight size={18} weight="bold" aria-hidden="true" />
                    </Link>
                    <Link
                      className="text-link"
                      to={`/request?service=${service.slug}`}
                    >
                      Start a request
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section overlap-callout">
        <div className="shell overlap-card">
          <div>
            <span className="section-index section-index-light">
              More than one service?
            </span>
            <h2>Describe the full project once.</h2>
          </div>
          <p>
            Choose the primary path in the request form, then add the
            electrical, solar, storage, or construction details that need to
            be considered together.
          </p>
          <Link className="button button-sun" to="/request">
            Start a combined request
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}

export function ServiceDetailPage() {
  const { slug } = useParams();
  const service = services.find((item) => item.slug === slug);

  if (!service) {
    return <Navigate to="/services" replace />;
  }

  const Icon = serviceIcons[service.slug];
  const otherServices = services.filter((item) => item.slug !== service.slug);
  const [questionStatus, setQuestionStatus] = useState("");

  const copyQuestions = async () => {
    try {
      await navigator.clipboard.writeText(serviceQuestionText(service));
      setQuestionStatus("Preparation questions copied. No details were sent to Matken.");
    } catch {
      setQuestionStatus(
        "The questions could not be copied automatically. Use the request or Project Blueprint to keep them together.",
      );
    }
  };

  return (
    <>
      <section className={`service-detail-hero accent-${service.accent}`}>
        <div className="shell service-detail-grid">
          <div className="service-detail-copy">
            <Icon size={40} weight="duotone" aria-hidden="true" />
            <span className="section-index">{service.eyebrow}</span>
            <h1>{service.label}</h1>
            <p>{service.summary}</p>
            <div className="hero-actions">
              <Link
                className="button button-primary"
                to={`/request?service=${service.slug}`}
              >
                Start a {service.shortLabel.toLowerCase()} request
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
              {service.slug === "solar" ? (
                <Link className="text-link" to="/planner">
                  Open solar planner
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </Link>
              ) : (
                <a className="text-link" href="tel:+18765682616">
                  Call (876) 568-2616
                </a>
              )}
              <Link className="text-link" to="/" state={{ startBlueprint: true }}>
                Build a private project blueprint
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="service-detail-media">
            <OptimizedImage
              src={service.image}
              alt={service.imageAlt}
              eager
              sizes="(max-width: 920px) 100vw, 54vw"
            />
            <span>Representative editorial image</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell detail-intro-grid">
          <div>
            <span className="section-index">A useful starting brief</span>
            <h2>Bring context, not just a one-line request.</h2>
          </div>
          <p>{service.detail}</p>
        </div>
        <div className="shell question-grid">
          {service.questions.map((question, index) => (
            <article key={question}>
              <span>0{index + 1}</span>
              <h3>{question}</h3>
            </article>
          ))}
        </div>
        <div className="shell service-question-actions">
          <button type="button" onClick={copyQuestions}>
            <Copy size={17} aria-hidden="true" />
            Copy preparation questions
          </button>
          {questionStatus ? (
            <p role="status" aria-live="polite">
              {questionStatus}
            </p>
          ) : null}
        </div>
      </section>

      <section className="section service-pathways">
        <div className="shell service-pathways-grid">
          <div>
            <span className="section-index section-index-light">
              Request pathways
            </span>
            <h2>Choose the closest path. Explain the rest.</h2>
            <p>
              These categories help organize an initial request. They are not
              a quote, diagnosis, availability promise, or final work scope.
            </p>
          </div>
          <div className="pathway-list">
            {service.pathways.map((pathway, index) => (
              <Link
                key={pathway}
                to={`/request?service=${service.slug}&path=${encodeURIComponent(
                  pathway,
                )}`}
              >
                <span>0{index + 1}</span>
                <strong>{pathway}</strong>
                <ArrowRight size={19} weight="bold" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section related-services">
        <div className="shell">
          <div className="section-heading heading-inline">
            <div>
              <span className="section-index">Related service paths</span>
              <h2>Keep the whole project connected.</h2>
            </div>
            <Link className="text-link" to="/services">
              View all services
              <ArrowRight size={17} weight="bold" aria-hidden="true" />
            </Link>
          </div>
          <div className="related-grid">
            {otherServices.map((related) => {
              const RelatedIcon = serviceIcons[related.slug];
              return (
                <Link
                  className={`related-card accent-${related.accent}`}
                  to={`/services/${related.slug}`}
                  key={related.slug}
                >
                  <RelatedIcon size={27} weight="duotone" aria-hidden="true" />
                  <h3>{related.label}</h3>
                  <p>{related.summary}</p>
                  <span>
                    Explore
                    <ArrowRight size={17} weight="bold" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
