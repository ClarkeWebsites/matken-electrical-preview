import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  Compass,
  Phone,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Link, Navigate, useParams } from "react-router";
import { OptimizedImage } from "../components/OptimizedImage.jsx";
import { business, faqs, resourceArticles, services } from "../data/site.js";

export function ResourcesPage() {
  return (
    <>
      <section className="page-hero resources-page-hero">
        <div className="shell page-hero-grid">
          <div>
            <span className="section-index">Planning library</span>
            <h1>Practical reading before the project begins.</h1>
          </div>
          <p>
            Organize energy use, outage priorities, electrical context, and
            construction scope before asking for a quote or recommendation.
          </p>
        </div>
      </section>

      <section className="section resource-library">
        <div className="shell resource-library-grid">
          {resourceArticles.map((article, index) => (
            <article className={index === 0 ? "featured-resource" : ""} key={article.slug}>
              <div className="resource-icon">
                <BookOpenText size={28} weight="duotone" aria-hidden="true" />
              </div>
              <span>
                {article.category} · {article.readTime}
              </span>
              <h2>{article.title}</h2>
              <p>{article.excerpt}</p>
              <Link to={`/resources/${article.slug}`}>
                Read guide
                <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section faq-library-section">
        <div className="shell faq-library-grid">
          <div>
            <span className="section-index">Frequently asked</span>
            <h2>Know what the website can—and cannot—confirm.</h2>
            <p>
              Planning tools and forms make the first conversation clearer.
              They do not replace property review, professional judgment, or
              written confirmation.
            </p>
          </div>
          <div className="faq-list">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function ResourceArticlePage() {
  const { slug } = useParams();
  const article = resourceArticles.find((item) => item.slug === slug);

  if (!article) {
    return <Navigate to="/resources" replace />;
  }

  return (
    <article className="article-page">
      <header className="article-header">
        <div className="shell article-header-inner">
          <Link className="back-link" to="/resources">
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            All resources
          </Link>
          <span className="section-index">{article.category}</span>
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
          <span className="article-meta">{article.readTime} read</span>
        </div>
      </header>
      <div className="shell article-layout">
        <div className="article-body">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
          <div className="article-safety-note">
            <ShieldCheck size={24} weight="duotone" aria-hidden="true" />
            <p>
              This guide is general planning information. It is not a remote
              diagnosis, design, quote, safety clearance, or instruction to
              work on energized equipment.
            </p>
          </div>
        </div>
        <aside className="article-aside">
          <span>Ready to organize the project?</span>
          <h2>Carry these details into a request.</h2>
          <Link className="button button-primary" to="/request">
            Start a request
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
          <a href={`tel:${business.phoneHref}`}>
            <Phone size={17} weight="fill" aria-hidden="true" />
            {business.phoneDisplay}
          </a>
        </aside>
      </div>
    </article>
  );
}

export function AboutPage() {
  return (
    <>
      <section className="about-hero">
        <div className="shell about-hero-grid">
          <div className="about-hero-copy">
            <span className="section-index">About Matken</span>
            <h1>Connected thinking across power, energy, and the built space.</h1>
            <p>
              Matken’s public service story brings electrical, solar, and
              construction conversations together for homes and businesses in
              Jamaica.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/request">
                Start a project request
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
              <a className="text-link" href={`tel:${business.phoneHref}`}>
                Call {business.phoneDisplay}
              </a>
            </div>
          </div>
          <div className="about-hero-images">
            <OptimizedImage
              src="/assets/matken-hero-solar.jpg"
              alt="Representative rooftop solar installation"
              eager
              sizes="(max-width: 760px) 78vw, 34vw"
            />
            <OptimizedImage
              src="/assets/service-electrical.jpg"
              alt="Representative electrical panel work"
              sizes="(max-width: 760px) 58vw, 24vw"
            />
            <span>Representative editorial imagery</span>
          </div>
        </div>
      </section>

      <section className="section about-principles">
        <div className="shell">
          <div className="section-heading heading-split">
            <div>
              <span className="section-index">What the site is designed to support</span>
              <h2>Clarity before commitment.</h2>
            </div>
            <p>
              This redesign intentionally avoids publishing credentials,
              project claims, staff history, service areas, or response
              promises that Matken has not yet approved for publication.
            </p>
          </div>
          <div className="principle-grid">
            <article>
              <Compass size={29} weight="duotone" aria-hidden="true" />
              <h3>Start with the real need</h3>
              <p>
                Service pathways are organized around property context,
                project stage, and the outcome the customer needs.
              </p>
            </article>
            <article>
              <BookOpenText size={29} weight="duotone" aria-hidden="true" />
              <h3>Make planning understandable</h3>
              <p>
                Tools and guides explain the next useful questions while
                clearly separating estimates from final recommendations.
              </p>
            </article>
            <article>
              <ShieldCheck size={29} weight="duotone" aria-hidden="true" />
              <h3>Protect customer trust</h3>
              <p>
                Forms, invoice access, and payments are designed around private
                links, provider authority, and honest delivery states.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section about-services">
        <div className="shell about-services-card">
          <div>
            <span className="section-index section-index-light">Service map</span>
            <h2>Three starting points. One request can connect them.</h2>
          </div>
          <div>
            {services.map((service) => (
              <Link key={service.slug} to={`/services/${service.slug}`}>
                <Check size={17} weight="bold" aria-hidden="true" />
                <span>
                  <strong>{service.label}</strong>
                  {service.summary}
                </span>
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section contact-band">
        <div className="shell contact-band-inner">
          <div>
            <span className="section-index">Verified public contact</span>
            <h2>Start with the phone number already published by Matken.</h2>
            <p>
              Additional email, address, hours, social profiles, and staff
              details remain unpublished until the owner confirms them.
            </p>
          </div>
          <a className="big-phone" href={`tel:${business.phoneHref}`}>
            <Phone size={27} weight="fill" aria-hidden="true" />
            {business.phoneDisplay}
          </a>
        </div>
      </section>
    </>
  );
}

export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="This prototype does not transmit or store request-form personal data unless a secure same-origin provider endpoint is explicitly configured."
      sections={[
        {
          title: "Current prototype behavior",
          body:
            "Without a configured request endpoint, entered details remain in the current browser session long enough to prepare a summary. Attachments are not uploaded. Closing or refreshing the page clears the in-memory form.",
        },
        {
          title: "Before production activation",
          body:
            "Matken must approve the form recipient, data processor, permitted fields, retention and deletion rules, privacy contact, abuse controls, allowed production origin, and customer confirmation wording.",
        },
        {
          title: "Payments",
          body:
            "The intended payment flow uses a private hosted page from an eligible payment provider. This website must not collect full card details, online-banking credentials, or one-time authentication codes.",
        },
        {
          title: "Project status",
          body:
            "Without a configured project-status endpoint, no project record is searched and no verification message is sent. After activation, a protected server—not this public browser—must match the reference and contact route, issue a short-lived one-time link, and return only approved status fields.",
        },
        {
          title: "Marketing choices",
          body:
            "Consent to receive service-request follow-up is separate from optional consent to receive broader educational or promotional updates.",
        },
      ]}
    />
  );
}

export function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro="Planning tools, guides, and request forms are designed to organize an initial conversation. They do not create a contract or confirm work."
      sections={[
        {
          title: "No automatic appointment or quote",
          body:
            "Submitting a request does not confirm an appointment, availability, scope, price, schedule, site condition, product selection, or acceptance of work.",
        },
        {
          title: "Planning estimates",
          body:
            "Calculator results are educational starting ranges only. They are not engineering designs, electrical instructions, energy guarantees, equipment specifications, or purchasing recommendations.",
        },
        {
          title: "Safety",
          body:
            "Do not use a routine website form for immediate danger. Smoke, fire, shock risk, exposed energized parts, unusual heat, or other urgent hazards require the appropriate emergency or utility response.",
        },
        {
          title: "Invoice payment",
          body:
            "Only a finalized invoice and verified hosted payment link from Matken’s selected billing provider can establish the amount due and payment status.",
        },
        {
          title: "Project tracking",
          body:
            "Only a status returned through Matken’s protected project system is authoritative. Public form entries, planning results, elapsed time, and website copy do not advance a project or establish a schedule.",
        },
      ]}
    />
  );
}

function LegalPage({ title, intro, sections }) {
  return (
    <article className="legal-page">
      <header>
        <div className="shell legal-header">
          <span className="section-index">Matken website</span>
          <h1>{title}</h1>
          <p>{intro}</p>
          <span>Prototype policy copy · owner/legal review required before publication</span>
        </div>
      </header>
      <div className="shell legal-content">
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}

export function NotFoundPage() {
  return (
    <section className="section not-found">
      <div className="shell">
        <span className="section-index">404</span>
        <h1>That page is not part of this project.</h1>
        <p>Return home or choose a verified service path.</p>
        <div className="hero-actions">
          <Link className="button button-primary" to="/">
            Go home
          </Link>
          <Link className="text-link" to="/services">
            View services
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
