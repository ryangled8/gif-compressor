/**
 * Resolves a width override string into a final pixel value.
 *
 * Supports:
 *   "500"     → 500 (absolute)
 *   "1/2"     → presetWidth / 2
 *   "2x"      → presetWidth * 2
 *   "0.5x"    → presetWidth * 0.5
 *   "-1"      → -1 (aspect-ratio lock, passed through to ffmpeg)
 */
function resolveWidth(input, presetWidth) {
  const str = String(input).trim();

  if (str === "-1") return -1;

  // Multiplier: "2x", "0.5x", "1.5x"
  const multiplierMatch = str.match(/^(\d+(?:\.\d+)?)x$/i);
  if (multiplierMatch) {
    const factor = parseFloat(multiplierMatch[1]);
    return Math.round(presetWidth * factor);
  }

  // Fraction: "1/2", "3/4"
  const fractionMatch = str.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1], 10);
    const denominator = parseInt(fractionMatch[2], 10);
    if (denominator === 0) throw new Error("Width fraction denominator cannot be zero.");
    return Math.round((presetWidth * numerator) / denominator);
  }

  // Absolute integer
  const absolute = parseInt(str, 10);
  if (!isNaN(absolute) && absolute > 0) return absolute;

  throw new Error(
    `Invalid width: "${input}"\n\nSupported formats:\n  500    → absolute pixels\n  1/2    → fraction of preset width\n  2x     → multiplier of preset width\n  -1     → aspect-ratio lock`
  );
}

export { resolveWidth };
