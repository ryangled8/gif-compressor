// Video preset schema:
// {
//   label: string                      — human-readable description shown in help/preset list
//   keepOriginalDimensions?: boolean   — if true, skip scaling (compress filesize only)
//   width?: number                     — max output width in pixels; never upscales; omit when keepOriginalDimensions or widthFactor is set
//   widthFactor?: number               — scale to a fraction of source width (e.g. 0.5 = half); ffmpeg resolves iw at runtime
//   codec: string                      — FFmpeg video codec (e.g. "libx265")
//   crf: number                        — Constant Rate Factor; lower = better quality, larger file
//   preset: string                     — FFmpeg encoder speed preset (ultrafast → veryslow)
//   audioBitrate: string               — AAC audio bitrate (e.g. "128k")
//   slowEncoder?: boolean              — flags presets using a slow FFmpeg preset, triggers a time warning
// }

export default {
  compress: {
    label: "Optimise filesize, keep original dimensions",
    keepOriginalDimensions: true,
    codec: "libx265",
    crf: 28,
    preset: "medium",
    audioBitrate: "128k"
  },

  "compress-best": {
    label: "Maximum compression, keep original dimensions — slower encoding",
    keepOriginalDimensions: true,
    codec: "libx265",
    crf: 28,
    preset: "slow",
    audioBitrate: "128k",
    slowEncoder: true
  },

  web: {
    label: "Optimised for web embedding, keep original dimensions",
    keepOriginalDimensions: true,
    codec: "libx265",
    crf: 26,
    preset: "medium",
    audioBitrate: "128k"
  },

  social: {
    label: "Optimised for social media",
    width: 1080,
    codec: "libx265",
    crf: 28,
    preset: "fast",
    audioBitrate: "128k"
  },

  showcase: {
    label: "High-quality showcase and portfolio",
    width: 1920,
    codec: "libx265",
    crf: 22,
    preset: "medium",
    audioBitrate: "192k"
  },

  lightweight: {
    label: "Lightweight for email and docs",
    width: 1280,
    codec: "libx265",
    crf: 32,
    preset: "fast",
    audioBitrate: "96k"
  },

  half: {
    label: "Half source width, full quality",
    widthFactor: 0.5,
    codec: "libx265",
    crf: 28,
    preset: "medium",
    audioBitrate: "128k"
  },

  third: {
    label: "One third source width, full quality",
    widthFactor: 1/3,
    codec: "libx265",
    crf: 28,
    preset: "medium",
    audioBitrate: "128k"
  },

  quart: {
    label: "Quarter source width, full quality",
    widthFactor: 0.25,
    codec: "libx265",
    crf: 28,
    preset: "medium",
    audioBitrate: "128k"
  }
};
