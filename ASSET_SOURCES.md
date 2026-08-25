# Matken Website Asset Sources

Photography has two distinct publication classes. Service-page editorial imagery is representative and must not be described as a Matken employee, customer, installation, build, or completed project. The homepage hero and project gallery use client-approved photography only within the generic-display boundary documented below.

## Brand reference

- `public/assets/matken-logo-source.png`
- Source: cropped from the captured Matken homepage reference at `source-reference.png`.
- Purpose: preserve the existing public MATKEN wordmark while the owner supplies an original transparent/vector logo.
- Production replacement required: original SVG, PDF, EPS, or high-resolution transparent PNG from Matken.

## Connected Conduit M prototype system

- Directory: `public/assets/brand/`
- Concept source: generated for this Matken redesign with OpenAI ImageGen from
  the verified public wordmark reference and the owner-directed Connected
  Conduit M brief. The full-resolution concept remains in the local,
  intentionally ignored design-reference folder rather than the public
  preview repository.
- Production vectors: authored specifically for this prototype from the
  selected concept using Matken Navy `#061831`, Connection Red `#CF2630`, and
  the locally bundled Manrope typeface.
- Raster derivatives: generated locally from the authored SVGs with
  `scripts/render-brand-assets.mjs`.
- Approval status: prototype only. Matken owner approval, trademark clearance,
  physical vendor proofs, and production signoff remain required.
- Yellow is intentionally excluded from the primary logo and remains reserved
  for website interaction accents.

## Editorial photography

### Solar hero

- File: `public/assets/matken-hero-solar.jpg`
- Creator: Vivint Solar
- Source: https://unsplash.com/photos/a-house-with-a-solar-panel-on-the-roof-_ciUqT1HEuY
- License displayed by source: Unsplash License.
- Use: homepage hero, solar service, representative project category.

### Electrical service

- File: `public/assets/service-electrical.jpg`
- Creator: Toolmash Expo
- Source: https://unsplash.com/photos/electrician-testing-electrical-panel-with-multimeter-PkHf7BUWbtk
- License displayed by source: Unsplash License.
- Use: electrical service and representative project category.

### Construction service

- File: `public/assets/service-construction.jpg`
- Creator: Troy Mortier
- Source: https://unsplash.com/photos/a-house-under-construction-with-scaffolding-around-it-rxfWPJUUClo
- License displayed by source: Unsplash License.
- Use: construction service and representative project category.

## Optimized derivatives

- Directory: `public/assets/optimized/`
- Source: generated locally from the three documented editorial JPEGs above.
- Formats and widths: WebP at 640, 960, and 1440 pixels.
- Purpose: responsive delivery only. The classification, provenance,
  publication rule, and representative-image disclosure remain identical to
  each source image.

## Client-approved generic project photography

- Private originals: `pictures and videos/` (intentionally ignored; never copied into the repository).
- Approval allowlist: `pictures and videos/00-client-review/PHOTO_PUBLICATION_MANIFEST.json`.
- Public derivatives: `public/assets/projects/` and `public/assets/projects/thumbs/`.
- Generated data: `src/data/approvedProjectPhotos.js`.
- Publication scope: generic gallery and selected homepage-hero display only.
- Explicitly excluded until separately approved: customer or property identity, locations, project categories, equipment claims, performance or outcome claims, captions, case studies, and descriptive alt text.
- Accessibility boundary: images without separately approved descriptions use empty alt text; the viewer controls retain positional accessible labels.

The publishing script fails closed when an original is absent from the allowlist, an approval record is incomplete, derivative hashes repeat, dimensions drift, or stale generated files remain.

## Publication rule

For the documented editorial service imagery, Matken should either:

1. approve continued use of each editorial image with its representative-image disclosure; or
2. replace it with client-owned photography whose intended placement and publication scope are approved.

Removing the disclosure without replacing the imagery and confirming provenance is not approved.

Generic project-gallery approval does not authorize descriptive captions, project stories, customer details, locations, results, or removal of service-image disclosures.
