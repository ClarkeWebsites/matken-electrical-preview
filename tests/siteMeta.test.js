import { describe, expect, it } from "vitest";
import { faqs, services } from "../src/data/site.js";
import {
  businessJsonLd,
  canonicalUrlForPath,
  faqJsonLd,
  routeMetaForPath,
} from "../src/lib/siteMeta.js";

const previewLocation = {
  origin: "https://clarkewebsites.github.io",
  pathname: "/matken-electrical-preview/",
  search: "",
  hash: "#/services",
  href: "https://clarkewebsites.github.io/matken-electrical-preview/#/services",
};

describe("site metadata", () => {
  it("keeps verified business facts only in structured data", () => {
    const data = businessJsonLd(previewLocation);
    const serialized = JSON.stringify(data);

    expect(data["@type"]).toEqual([
      "Electrician",
      "HomeAndConstructionBusiness",
    ]);
    expect(data.name).toBe("Matken Electrical");
    expect(data.telephone).toBe("+18765682616");
    expect(data.areaServed).toEqual({
      "@type": "Country",
      name: "Jamaica",
    });
    expect(data.hasOfferCatalog.itemListElement).toHaveLength(services.length);
    expect(serialized).not.toMatch(/streetAddress|openingHours|"email"/i);
    expect(serialized).not.toMatch(/aggregateRating|reviewCount/i);
  });

  it("reuses published FAQs without inventing answers", () => {
    const data = faqJsonLd();
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(faqs.length);
    expect(data.mainEntity[0]).toEqual({
      "@type": "Question",
      name: faqs[0].question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faqs[0].answer,
      },
    });
  });

  it("builds route-specific titles, descriptions, and preview canonicals", () => {
    expect(routeMetaForPath("/request")).toEqual({
      title: "Request Service | Matken Electrical",
      description:
        "Organize an electrical, solar, or construction project request. In this preview, details stay on this device.",
    });
    expect(routeMetaForPath("/services/solar").title).toBe(
      "Solar & storage | Matken Electrical",
    );
    expect(routeMetaForPath("/missing").title).toBe(
      "Page not found | Matken Electrical",
    );
    expect(canonicalUrlForPath("/planner", previewLocation)).toBe(
      "https://clarkewebsites.github.io/matken-electrical-preview/#/planner",
    );
  });
});
