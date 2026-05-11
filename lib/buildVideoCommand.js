/**
 * Builds the FFmpeg args array for video compression.
 *
 * Always applies:
 *   -pix_fmt yuv420p     — broad browser/social compatibility
 *   -movflags +faststart — enables progressive web streaming
 *
 * Scale filter is omitted when keepOriginalDimensions is true,
 * unless a width override was explicitly provided by the user.
 */
function buildVideoArgs(input, settings, output) {
  const { keepOriginalDimensions, widthOverride, width, codec, crf, preset, audioBitrate, fps } = settings;

  const vfParts = [];
  if (fps) vfParts.push(`fps=${fps}`);
  if (!keepOriginalDimensions && width) {
    // Explicit -w flag: honour exact value (allows upscale). Preset width: cap at source.
    vfParts.push(widthOverride
      ? `scale=${width}:-2:flags=lanczos`
      : `scale='min(${width},iw)':-2:flags=lanczos`
    );
  }

  const args = ["-i", input];
  if (vfParts.length) args.push("-vf", vfParts.join(","));

  args.push(
    "-c:v", codec,
    "-crf", String(crf),
    "-preset", preset,
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-c:a", "aac",
    "-b:a", audioBitrate,
  );

  // QuickTime and Apple devices require the hvc1 tag for H.265 playback.
  // FFmpeg defaults to hev1, which QuickTime rejects.
  if (codec === "libx265") args.push("-tag:v", "hvc1");

  args.push("-y", output);

  return args;
}

export { buildVideoArgs };
