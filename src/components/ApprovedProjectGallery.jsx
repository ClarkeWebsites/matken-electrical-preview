import { useState } from "react";
import { approvedProjectPhotos } from "../data/approvedProjectPhotos.js";
import { publicAssetUrl } from "../lib/appUrl.js";

const initialPhotoCount = 12;

export function ApprovedProjectGallery() {
  const [showAll, setShowAll] = useState(false);
  const visiblePhotos = showAll
    ? approvedProjectPhotos
    : approvedProjectPhotos.slice(0, initialPhotoCount);

  return (
    <section className="section approved-project-gallery" aria-labelledby="approved-project-gallery-title">
      <div className="shell">
        <div className="section-heading heading-split">
          <div>
            <span className="section-index">Matken project gallery</span>
            <h2 id="approved-project-gallery-title">
              A closer look at approved project photography.
            </h2>
          </div>
          <p>
            This client-approved collection is presented without unverified
            project specifications, outcomes, or performance claims.
          </p>
        </div>
        <div className="approved-photo-grid">
          {visiblePhotos.map((photo, index) => (
            <figure key={photo.id}>
              <img
                src={publicAssetUrl(photo.src)}
                alt={photo.alt}
                width="1440"
                height="1080"
                loading="lazy"
                decoding="async"
              />
            </figure>
          ))}
        </div>
        {!showAll ? (
          <button
            className="button button-primary"
            type="button"
            onClick={() => setShowAll(true)}
            aria-expanded="false"
          >
            View all {approvedProjectPhotos.length} approved photos
          </button>
        ) : null}
      </div>
    </section>
  );
}
