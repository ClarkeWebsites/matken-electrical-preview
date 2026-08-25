import { publicAssetUrl } from "../lib/appUrl.js";

const imageVariants = Object.freeze({
  "/assets/matken-hero-solar.jpg": Object.freeze({
    width: 2000,
    height: 1500,
    sources: Object.freeze([
      Object.freeze({
        src: "/assets/optimized/matken-hero-solar-640.webp",
        width: 640,
      }),
      Object.freeze({
        src: "/assets/optimized/matken-hero-solar-960.webp",
        width: 960,
      }),
      Object.freeze({
        src: "/assets/optimized/matken-hero-solar-1440.webp",
        width: 1440,
      }),
    ]),
  }),
  "/assets/service-electrical.jpg": Object.freeze({
    width: 1600,
    height: 1100,
    sources: Object.freeze([
      Object.freeze({
        src: "/assets/optimized/service-electrical-640.webp",
        width: 640,
      }),
      Object.freeze({
        src: "/assets/optimized/service-electrical-960.webp",
        width: 960,
      }),
      Object.freeze({
        src: "/assets/optimized/service-electrical-1440.webp",
        width: 1440,
      }),
    ]),
  }),
  "/assets/service-construction.jpg": Object.freeze({
    width: 1600,
    height: 1100,
    sources: Object.freeze([
      Object.freeze({
        src: "/assets/optimized/service-construction-640.webp",
        width: 640,
      }),
      Object.freeze({
        src: "/assets/optimized/service-construction-960.webp",
        width: 960,
      }),
      Object.freeze({
        src: "/assets/optimized/service-construction-1440.webp",
        width: 1440,
      }),
    ]),
  }),
  "/assets/projects/img-20260824-wa0000.webp": Object.freeze({
    width: 1440,
    height: 810,
    sources: Object.freeze([
      Object.freeze({
        src: "/assets/projects/thumbs/img-20260824-wa0000.webp",
        width: 640,
      }),
      Object.freeze({
        src: "/assets/optimized/matken-project-hero-960.webp",
        width: 960,
      }),
      Object.freeze({
        src: "/assets/projects/img-20260824-wa0000.webp",
        width: 1440,
      }),
    ]),
  }),
});

export function OptimizedImage({
  src,
  alt,
  eager = false,
  sizes = "100vw",
  pictureClassName = "",
  ...imageProps
}) {
  const variant = imageVariants[src];
  const resolvedSrc = publicAssetUrl(src);
  const loading = eager ? "eager" : "lazy";
  const fetchPriority = eager ? "high" : undefined;

  if (!variant) {
    return (
      <img
        {...imageProps}
        src={resolvedSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
      />
    );
  }

  const srcSet = variant.sources
    .map((source) => `${publicAssetUrl(source.src)} ${source.width}w`)
    .join(", ");

  return (
    <picture
      className={`optimized-picture${pictureClassName ? ` ${pictureClassName}` : ""}`}
    >
      <source type="image/webp" srcSet={srcSet} sizes={sizes} />
      <img
        {...imageProps}
        src={resolvedSrc}
        alt={alt}
        width={variant.width}
        height={variant.height}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
      />
    </picture>
  );
}
