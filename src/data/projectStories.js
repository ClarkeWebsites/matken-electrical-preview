import { services } from "./site.js";

const serviceSlugs = new Set(services.map((service) => service.slug));
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/*
 * Publication registry
 *
 * Add candidate records here only after Matken supplies the matching facts,
 * image rights, and publication approval. The public component filters every
 * candidate through the strict validator below; incomplete or pending records
 * remain invisible.
 */
export const projectStoryCandidates = Object.freeze([]);

export function projectStoryValidationErrors(story) {
  if (!story || typeof story !== "object") return ["missing record"];
  const errors = [];
  const requireText = (field, minimum = 3, maximum = 500) => {
    const value = story[field];
    if (
      typeof value !== "string" ||
      value.trim().length < minimum ||
      value.trim().length > maximum
    ) {
      errors.push(`invalid ${field}`);
    }
  };

  requireText("id", 3, 64);
  requireText("title", 6, 100);
  requireText("summary", 20, 280);
  requireText("challenge", 20, 500);
  requireText("coordination", 20, 500);
  requireText("workCompleted", 20, 500);
  requireText("outcome", 20, 500);
  requireText("locationLabel", 2, 100);

  if (!serviceSlugs.has(story.serviceSlug)) {
    errors.push("invalid serviceSlug");
  }
  if (story.approval?.status !== "approved") {
    errors.push("publication not approved");
  }
  if (
    typeof story.approval?.approvedBy !== "string" ||
    story.approval.approvedBy.trim().length < 2
  ) {
    errors.push("missing approver");
  }
  if (!isoDatePattern.test(story.approval?.approvedAt || "")) {
    errors.push("invalid approval date");
  }
  if (
    typeof story.approval?.claimEvidence !== "string" ||
    story.approval.claimEvidence.trim().length < 8
  ) {
    errors.push("missing claim evidence");
  }
  if (story.image?.rightsStatus !== "approved") {
    errors.push("image rights not approved");
  }
  if (
    typeof story.image?.src !== "string" ||
    !story.image.src.startsWith("/assets/")
  ) {
    errors.push("invalid image");
  }
  if (
    typeof story.image?.alt !== "string" ||
    story.image.alt.trim().length < 8
  ) {
    errors.push("invalid image alt");
  }
  if (
    typeof story.image?.approvalReference !== "string" ||
    story.image.approvalReference.trim().length < 4
  ) {
    errors.push("missing image approval reference");
  }

  return errors;
}

export const isApprovedProjectStory = (story) =>
  projectStoryValidationErrors(story).length === 0;

export const approvedProjectStories = Object.freeze(
  projectStoryCandidates.filter(isApprovedProjectStory),
);
