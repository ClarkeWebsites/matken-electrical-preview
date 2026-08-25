import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  projectPhotoSlugFor,
  publicationManifestErrors,
  validatePublicationManifest,
  webpDimensions,
} from "../scripts/project-photo-manifest.mjs";

const approvedManifest = () => ({
  schemaVersion: 1,
  approvalRecords: {
    "gallery-approval": {
      status: "approved",
      scope: "generic-gallery-only",
      evidence: "Recorded owner approval REF-100",
    },
    "alt-approval": {
      status: "approved",
      scope: "alt-text",
      evidence: "Recorded owner approval ALT-100",
    },
  },
  photos: [
    {
      id: "project-001",
      source: "IMG-001.jpg",
      publicationApproval: "gallery-approval",
      altText: null,
      featured: true,
      homepageHero: true,
    },
  ],
});

describe("project-photo publication manifest", () => {
  it("accepts an explicitly approved photo with pending alt text", () => {
    expect(validatePublicationManifest(approvedManifest()).photos).toHaveLength(1);
  });

  it("requires separate approval before descriptive alt text is published", () => {
    const manifest = approvedManifest();
    manifest.photos[0].altText = "Solar panels visible on a pitched roof";

    expect(publicationManifestErrors(manifest)).toContain(
      "photo 1 has text without approved alt-text evidence",
    );

    manifest.photos[0].altApproval = "alt-approval";
    expect(publicationManifestErrors(manifest)).toEqual([]);
  });

  it("rejects unapproved, nested, duplicate, and colliding sources", () => {
    const manifest = approvedManifest();
    manifest.photos.push({
      id: "project-002",
      source: "private/IMG 001.jpeg",
      publicationApproval: "missing-approval",
      altText: null,
    });

    expect(publicationManifestErrors(manifest)).toEqual(
      expect.arrayContaining([
        "photo 2 has an invalid source filename",
        "photo 2 lacks generic-gallery publication approval",
      ]),
    );

    manifest.photos[1].source = "IMG_001.jpeg";
    expect(publicationManifestErrors(manifest)).toContain(
      "photo 2 has a duplicate or empty output slug",
    );
  });

  it("normalizes output slugs deterministically", () => {
    expect(projectPhotoSlugFor("IMG 001.full-size.JPEG")).toBe(
      "img-001-full-size",
    );
  });

  it("reads the true dimensions from generated WebP files", () => {
    const hero = readFileSync(
      join(
        process.cwd(),
        "public/assets/projects/img-20260824-wa0000.webp",
      ),
    );
    expect(webpDimensions(hero)).toEqual({ width: 1440, height: 810 });
  });
});
