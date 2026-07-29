import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { Link } from "react-router";
import {
  approvedProjectStories,
  isApprovedProjectStory,
} from "../data/projectStories.js";
import { services } from "../data/site.js";
import { OptimizedImage } from "./OptimizedImage.jsx";

export function ApprovedProjectStories({
  stories = approvedProjectStories,
}) {
  const publishableStories = Array.isArray(stories)
    ? stories.filter(isApprovedProjectStory)
    : [];
  if (!publishableStories.length) return null;

  return (
    <section
      className="section verified-project-stories"
      aria-labelledby="verified-project-stories-title"
    >
      <div className="shell">
        <div className="section-heading heading-split">
          <div>
            <span className="section-index">Verified Matken work</span>
            <h2 id="verified-project-stories-title">
              See the need, coordination, work, and confirmed outcome.
            </h2>
          </div>
          <p>
            Every story in this section has an approved factual record and
            publication-cleared Matken project photography.
          </p>
        </div>
        <div className="verified-story-grid">
          {publishableStories.map((story) => {
            const service = services.find(
              (item) => item.slug === story.serviceSlug,
            );
            return (
              <article key={story.id}>
                <div className="verified-story-media">
                  <OptimizedImage
                    src={story.image.src}
                    alt={story.image.alt}
                    sizes="(max-width: 760px) 100vw, 50vw"
                  />
                  <span>
                    <CheckCircle size={16} weight="fill" aria-hidden="true" />
                    Approved project record
                  </span>
                </div>
                <div className="verified-story-copy">
                  <span>
                    {service?.label} · {story.locationLabel}
                  </span>
                  <h3>{story.title}</h3>
                  <p>{story.summary}</p>
                  <dl>
                    <div>
                      <dt>Starting need</dt>
                      <dd>{story.challenge}</dd>
                    </div>
                    <div>
                      <dt>Project coordination</dt>
                      <dd>{story.coordination}</dd>
                    </div>
                    <div>
                      <dt>Work completed</dt>
                      <dd>{story.workCompleted}</dd>
                    </div>
                    <div>
                      <dt>Confirmed outcome</dt>
                      <dd>{story.outcome}</dd>
                    </div>
                  </dl>
                  <Link to={`/request?service=${story.serviceSlug}`}>
                    Start a similar conversation
                    <ArrowRight size={17} weight="bold" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
