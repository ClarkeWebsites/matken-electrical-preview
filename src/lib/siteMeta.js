import { business, faqs, resourceArticles, services } from "../data/site.js";
import { createAppShareUrl, publicAssetUrl } from "./appUrl.js";

const defaultTitle = "Matken Electrical | Electrical, Solar & Construction";
const defaultDescription =
  "Explore electrical, solar, and construction project pathways with Matken in Jamaica.";

const pageMeta = {
  "/": [defaultTitle, defaultDescription],
  "/services": [
    "Services | Matken Electrical",
    "Explore electrical, solar, and construction project pathways.",
  ],
  "/planner": [
    "Solar & Backup Planner | Matken Electrical",
    "Build an educational solar and essential-load backup planning range.",
  ],
  "/request": [
    "Request Service | Matken Electrical",
    "Organize an electrical, solar, or construction project request. In this preview, details stay on this device.",
  ],
  "/project-pack": [
    "Project Pack | Matken Electrical",
    "Combine private planning details into a polished Matken print and download pack.",
  ],
  "/pay-invoice": [
    "Pay an Invoice | Matken Electrical",
    "Preview how private invoice access will work after a payment provider is approved. No lookup happens now.",
  ],
  "/project-status": [
    "Project Status | Matken Electrical",
    "Preview how private project-status access will work. No lookup or message is sent in this prototype.",
  ],
  "/resources": [
    "Planning Resources | Matken Electrical",
    "Practical guides for solar, backup, electrical, and construction planning.",
  ],
  "/about": [
    "About | Matken Electrical",
    "Learn about Matken's electrical, solar, and construction service paths in Jamaica.",
  ],
  "/privacy": [
    "Privacy | Matken Electrical",
    "Read the prototype privacy and provider-activation boundaries.",
  ],
  "/terms": [
    "Terms | Matken Electrical",
    "Read the website planning, request, and payment-use boundaries.",
  ],
};

export function routeMetaForPath(pathname) {
  if (pathname.startsWith("/services/")) {
    const service = services.find((item) => item.slug === pathname.split("/")[2]);
    return {
      title: `${service?.label || "Services"} | Matken Electrical`,
      description:
        service?.summary ||
        "Explore Matken electrical, solar, and construction services.",
    };
  }

  if (pathname.startsWith("/resources/")) {
    const article = resourceArticles.find(
      (item) => item.slug === pathname.split("/")[2],
    );
    return {
      title: `${article?.title || "Resources"} | Matken Electrical`,
      description:
        article?.excerpt ||
        "Practical electrical, solar, backup, and construction planning resources.",
    };
  }

  const selected = pageMeta[pathname];
  if (selected) {
    return {
      title: selected[0],
      description: selected[1],
    };
  }

  return {
    title: "Page not found | Matken Electrical",
    description: defaultDescription,
  };
}

export function canonicalUrlForPath(pathname, locationLike = window.location) {
  return createAppShareUrl(pathname || "/", locationLike);
}

export function businessJsonLd(locationLike = window.location) {
  const pageUrl = canonicalUrlForPath("/", locationLike);
  return {
    "@context": "https://schema.org",
    "@type": ["Electrician", "HomeAndConstructionBusiness"],
    name: business.legalName,
    alternateName: business.name,
    telephone: business.phoneHref,
    areaServed: {
      "@type": "Country",
      name: business.locationLabel,
    },
    url: pageUrl,
    image: new URL(
      publicAssetUrl("/assets/brand/matken-social-card.png"),
      locationLike.origin,
    ).href,
    knowsAbout: services.map((service) => service.label),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Matken public service paths",
      itemListElement: services.map((service, index) => ({
        "@type": "OfferCatalog",
        position: index + 1,
        name: service.label,
        description: service.summary,
        url: createAppShareUrl(`/services/${service.slug}`, locationLike),
      })),
    },
  };
}

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
