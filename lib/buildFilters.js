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
  const scale = `scale=${width}:-1:flags=lanczos`;
  const palettegen = `palettegen=max_colors=${colors}`;
  const paletteuse = `paletteuse=dither=${dither}`;

  return [
    `fps=${fps}`,
    `${scale}`,
    `split[s0][s1];[s0]${palettegen}[p];[s1][p]${paletteuse}`
  ].join(",");
}

module.exports = { buildFilters };
