// GIF preset schema:
// {
//   label: string                     — human-readable description shown in help/preset list
//   keepOriginalDimensions?: boolean  — if true, skip resizing (preserve source dimensions)
//   width?: number                    — output width in pixels; omit when keepOriginalDimensions is true
//   fps: number                       — frames per second
//   colors: number                    — palette size, max 256
//   dither: string                    — dithering algorithm (e.g. "bayer", "floyd_steinberg")
// }

export default {
  compress: {
    label: "Keep original dimensions, optimise palette",
    keepOriginalDimensions: true,
    fps: 15,
    colors: 256,
    dither: "bayer"
  },

  tiny: {
    label: "Ultra-small reaction GIFs",
    width: 180,
    fps: 6,
    colors: 64,
    dither: "bayer"
  },

  small: {
    label: "Lightweight web embeds",
    width: 240,
    fps: 8,
    colors: 128,
    dither: "bayer"
  },

  medium: {
    label: "UI demos and changelogs",
    width: 360,
    fps: 10,
    colors: 256,
    dither: "bayer"
  },

  large: {
    label: "Showcase-quality GIFs",
    width: 640,
    fps: 15,
    colors: 256,
    dither: "bayer"
  },

  social: {
    label: "Optimised for social sharing",
    width: 480,
    fps: 12,
    colors: 256,
    dither: "bayer"
  },

  slack: {
    label: "Optimised for Slack and Discord",
    width: 240,
    fps: 8,
    colors: 128,
    dither: "bayer"
  }
};
