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
function buildFilters({ fps, width, colors, dither, keepOriginalDimensions = false, widthOverride = false }) {
  // keepOriginalDimensions: SAR fix only, no resize.
  // widthOverride: user explicitly passed -w, so honour the exact value (allows upscale).
  // Otherwise: cap at source width to prevent upscaling.
  const scale = keepOriginalDimensions
    ? `scale=iw*sar:ih,setsar=1`
    : widthOverride
      ? `scale=iw*sar:ih,scale=${width}:-2:flags=lanczos,setsar=1`
      : `scale=iw*sar:ih,scale='min(${width},iw)':-2:flags=lanczos,setsar=1`;

  const palettegen = `palettegen=max_colors=${colors}`;
  const paletteuse = `paletteuse=dither=${dither}`;

  return [
    `fps=${fps}`,
    scale,
    `split[s0][s1];[s0]${palettegen}[p];[s1][p]${paletteuse}`
  ].join(",");
}

export { buildFilters };
