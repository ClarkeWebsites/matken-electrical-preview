import { basename } from "node:path";

export const supportedProjectPhotoExtension = /\.(?:jpe?g|heic|heif)$/i;

export const projectPhotoSlugFor = (filename) =>
  basename(filename, filename.slice(filename.lastIndexOf(".")))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const readUint24LE = (buffer, offset) =>
  buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);

export function webpDimensions(buffer) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("Invalid WebP container.");
  }

  const format = buffer.toString("ascii", 12, 16);
  if (format === "VP8 ") {
    if (
      buffer[23] !== 0x9d ||
      buffer[24] !== 0x01 ||
      buffer[25] !== 0x2a
    ) {
      throw new Error("Invalid lossy WebP frame header.");
    }
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (format === "VP8L") {
    if (buffer[20] !== 0x2f) {
      throw new Error("Invalid lossless WebP frame header.");
    }
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }
  if (format === "VP8X") {
    return {
      width: readUint24LE(buffer, 24) + 1,
      height: readUint24LE(buffer, 27) + 1,
    };
  }
  throw new Error(`Unsupported WebP format ${format || "<blank>"}.`);
}

const allowedApprovalScopes = new Set(["generic-gallery-only", "alt-text"]);
const stableIdPattern = /^[a-z0-9][a-z0-9-]{2,63}$/;

export function publicationManifestErrors(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return ["manifest must be an object"];
  }

  const errors = [];
  const approvals = manifest.approvalRecords;
  const photos = manifest.photos;

  if (manifest.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }
  if (
    !approvals ||
    typeof approvals !== "object" ||
    Array.isArray(approvals)
  ) {
    errors.push("approvalRecords must be an object");
  }
  if (!Array.isArray(photos) || photos.length === 0) {
    errors.push("photos must be a non-empty array");
  }

  if (approvals && typeof approvals === "object" && !Array.isArray(approvals)) {
    for (const [reference, approval] of Object.entries(approvals)) {
      if (!stableIdPattern.test(reference)) {
        errors.push(`approval ${reference || "<blank>"} has an invalid reference`);
      }
      if (!approval || typeof approval !== "object" || Array.isArray(approval)) {
        errors.push(`approval ${reference} must be an object`);
        continue;
      }
      if (approval.status !== "approved") {
        errors.push(`approval ${reference} is not approved`);
      }
      if (!allowedApprovalScopes.has(approval.scope)) {
        errors.push(`approval ${reference} has an invalid scope`);
      }
      if (
        typeof approval.evidence !== "string" ||
        approval.evidence.trim().length < 8
      ) {
        errors.push(`approval ${reference} is missing evidence`);
      }
    }
  }

  if (!Array.isArray(photos)) return errors;

  const ids = new Set();
  const sources = new Set();
  const slugs = new Set();
  let homepageHeroCount = 0;

  photos.forEach((photo, index) => {
    const label = `photo ${index + 1}`;
    if (!photo || typeof photo !== "object" || Array.isArray(photo)) {
      errors.push(`${label} must be an object`);
      return;
    }

    if (!stableIdPattern.test(photo.id || "")) {
      errors.push(`${label} has an invalid id`);
    } else if (ids.has(photo.id)) {
      errors.push(`${label} duplicates id ${photo.id}`);
    } else {
      ids.add(photo.id);
    }

    if (
      typeof photo.source !== "string" ||
      basename(photo.source) !== photo.source ||
      !supportedProjectPhotoExtension.test(photo.source)
    ) {
      errors.push(`${label} has an invalid source filename`);
    } else {
      const normalizedSource = photo.source.toLowerCase();
      const slug = projectPhotoSlugFor(photo.source);
      if (sources.has(normalizedSource)) {
        errors.push(`${label} duplicates source ${photo.source}`);
      } else {
        sources.add(normalizedSource);
      }
      if (!slug || slugs.has(slug)) {
        errors.push(`${label} has a duplicate or empty output slug`);
      } else {
        slugs.add(slug);
      }
    }

    const publicationApproval = approvals?.[photo.publicationApproval];
    if (
      !publicationApproval ||
      publicationApproval.status !== "approved" ||
      publicationApproval.scope !== "generic-gallery-only"
    ) {
      errors.push(`${label} lacks generic-gallery publication approval`);
    }

    if (photo.featured !== undefined && typeof photo.featured !== "boolean") {
      errors.push(`${label} has an invalid featured flag`);
    }
    if (
      photo.homepageHero !== undefined &&
      typeof photo.homepageHero !== "boolean"
    ) {
      errors.push(`${label} has an invalid homepageHero flag`);
    }
    if (photo.homepageHero === true) {
      homepageHeroCount += 1;
      if (photo.featured !== true) {
        errors.push(`${label} homepage hero must also be featured`);
      }
    }

    if (photo.altText === null) {
      if (photo.altApproval !== undefined && photo.altApproval !== null) {
        errors.push(`${label} has alt approval without alt text`);
      }
    } else if (
      typeof photo.altText === "string" &&
      photo.altText.trim().length >= 8 &&
      photo.altText.trim().length <= 240
    ) {
      const altApproval = approvals?.[photo.altApproval];
      if (
        !altApproval ||
        altApproval.status !== "approved" ||
        altApproval.scope !== "alt-text"
      ) {
        errors.push(`${label} has text without approved alt-text evidence`);
      }
    } else {
      errors.push(`${label} altText must be null or 8-240 approved characters`);
    }
  });

  if (homepageHeroCount !== 1) {
    errors.push("exactly one approved photo must be the homepage hero");
  }

  return errors;
}

export function validatePublicationManifest(manifest) {
  const errors = publicationManifestErrors(manifest);
  if (errors.length) {
    throw new Error(
      `Invalid project-photo publication manifest:\n- ${errors.join("\n- ")}`,
    );
  }
  return manifest;
}
