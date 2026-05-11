import sharp from "sharp";
import path from "path";

async function compressImage(input, settings, output) {
  const { keepOriginalDimensions, widthOverride, width, format, quality } = settings;

  const pipeline = sharp(input);

  if (!keepOriginalDimensions && width) {
    pipeline.resize({
      width,
      withoutEnlargement: !widthOverride,
    });
  }

  // When format is null, detect from input extension so we always apply
  // best-compression settings rather than sharp's defaults.
  const resolvedFormat = format ?? path.extname(input).slice(1).toLowerCase().replace("jpg", "jpeg");

  switch (resolvedFormat) {
    case "jpeg": pipeline.jpeg({ quality, mozjpeg: true }); break;
    case "webp":  pipeline.webp({ quality }); break;
    case "avif":  pipeline.avif({ quality }); break;
    default:      pipeline.png({ compressionLevel: 9 }); break;
  }

  await pipeline.toFile(output);
}

export { compressImage };
