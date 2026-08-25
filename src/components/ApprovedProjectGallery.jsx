import { useEffect, useRef, useState } from "react";
import { approvedProjectPhotos } from "../data/approvedProjectPhotos.js";
import { publicAssetUrl } from "../lib/appUrl.js";

const initialPhotoCount = 12;
const featuredProjectPhotos = approvedProjectPhotos.filter(
  (photo) => photo.featured,
);
const initialProjectPhotos = featuredProjectPhotos.length
  ? featuredProjectPhotos
  : approvedProjectPhotos.slice(0, initialPhotoCount);
const orderedProjectPhotos = [
  ...initialProjectPhotos,
  ...approvedProjectPhotos.filter(
    (photo) => !initialProjectPhotos.includes(photo),
  ),
];

export function ApprovedProjectGallery() {
  const [showAll, setShowAll] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const openingTriggerRef = useRef(null);
  const visiblePhotos = showAll
    ? orderedProjectPhotos
    : initialProjectPhotos;
  const selectedPhoto =
    selectedPhotoIndex === null
      ? null
      : orderedProjectPhotos[selectedPhotoIndex];

  const closeViewer = () => {
    openingTriggerRef.current?.focus();
    setSelectedPhotoIndex(null);
  };

  useEffect(() => {
    if (selectedPhotoIndex === null) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeViewer();
        return;
      }
      if (event.key === "ArrowLeft") {
        setSelectedPhotoIndex(
          (index) =>
            (index - 1 + orderedProjectPhotos.length) %
            orderedProjectPhotos.length,
        );
      }
      if (event.key === "ArrowRight") {
        setSelectedPhotoIndex(
          (index) => (index + 1) % orderedProjectPhotos.length,
        );
      }
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll("button");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.body.classList.add("gallery-photo-viewer-open");
    closeButtonRef.current?.focus();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("gallery-photo-viewer-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedPhotoIndex]);

  const moveSelection = (amount) => {
    setSelectedPhotoIndex(
      (index) =>
        (index + amount + orderedProjectPhotos.length) %
        orderedProjectPhotos.length,
    );
  };

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
          {visiblePhotos.map((photo) => (
            <figure key={photo.id}>
              <button
                className="gallery-photo-trigger"
                type="button"
                onClick={(event) => {
                  openingTriggerRef.current = event.currentTarget;
                  setSelectedPhotoIndex(orderedProjectPhotos.indexOf(photo));
                }}
                aria-label={`Open ${photo.alt}`}
              >
                <img
                  src={publicAssetUrl(photo.src)}
                  alt={photo.alt}
                  width="1440"
                  height="1080"
                  loading="lazy"
                  decoding="async"
                />
              </button>
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
      {selectedPhoto ? (
        <div className="gallery-photo-viewer" role="presentation">
          <div
            ref={dialogRef}
            className="gallery-photo-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Photo ${selectedPhotoIndex + 1} of ${orderedProjectPhotos.length}`}
          >
            <div className="gallery-photo-dialog-controls">
              <span aria-live="polite">
                Photo {selectedPhotoIndex + 1} of {orderedProjectPhotos.length}
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeViewer}
                aria-label="Close photo viewer"
              >
                ×
              </button>
            </div>
            <img
              src={publicAssetUrl(selectedPhoto.src)}
              alt={selectedPhoto.alt}
              width="1440"
              height="1080"
              decoding="async"
            />
            <div className="gallery-photo-dialog-navigation">
              <button type="button" onClick={() => moveSelection(-1)}>
                Previous photo
              </button>
              <button type="button" onClick={() => moveSelection(1)}>
                Next photo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
