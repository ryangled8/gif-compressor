/**
 * Builds the FFmpeg -vf filter chain for high-quality GIF output.
 *
 * Pipeline:
 *   1. fps — set output frame rate
 *   2. scale — resize with lanczos, preserve aspect ratio
 *   3. split — duplicate stream for palette generation + application
 *   4. palettegen — derive optimal palette from source
 *   5. paletteuse — apply palette with chosen dithering
 */
function buildFilters({ fps, width, colors, dither }) {
  // Two-step scale to correctly handle non-square pixel sources:
  //   Pass 1 — scale=iw*sar:ih: expand width by the sample aspect ratio,
  //             converting non-square pixels to square before any resize.
  //             For sources already at SAR=1:1 this is a no-op.
  //   Pass 2 — scale=W:-2: resize to target width; -2 keeps height even.
  //   setsar=1: stamp the output as square pixels so players don't re-apply SAR.
  const scale = `scale=iw*sar:ih,scale=${width}:-2:flags=lanczos,setsar=1`;
  const palettegen = `palettegen=max_colors=${colors}`;
  const paletteuse = `paletteuse=dither=${dither}`;

  return [
    `fps=${fps}`,
    scale,
    `split[s0][s1];[s0]${palettegen}[p];[s1][p]${paletteuse}`
  ].join(",");
}

module.exports = { buildFilters };
