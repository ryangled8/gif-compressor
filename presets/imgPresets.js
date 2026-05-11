// Image preset schema:
// {
//   label: string                     — human-readable description shown in help/preset list
//   keepOriginalDimensions?: boolean  — if true, skip resizing (preserve source dimensions)
//   width?: number                    — output width in pixels; omit when keepOriginalDimensions is true
//   format: string|null               — output format: "jpeg", "png", "webp", "avif", or null to inherit input format
//   quality: number                   — 1–100 for jpeg/webp/avif; PNG is lossless and ignores this
// }

export default {
  compress: {
    label: "Maximum compression, keep original format and dimensions",
    keepOriginalDimensions: true,
    format: null,
    quality: 80,
  },

  webp: {
    label: "Convert to WebP — great compression, universal browser support",
    keepOriginalDimensions: true,
    format: "webp",
    quality: 80,
  },

  avif: {
    label: "Convert to AVIF — best compression, modern browsers",
    keepOriginalDimensions: true,
    format: "avif",
    quality: 50,
  },

  social: {
    label: "Optimised for social media — 1080px wide JPEG",
    width: 1080,
    format: "jpeg",
    quality: 85,
  },

  thumbnail: {
    label: "Small thumbnail — 400px wide JPEG",
    width: 400,
    format: "jpeg",
    quality: 80,
  },
};
