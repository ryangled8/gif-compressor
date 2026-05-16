import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = `file://${path.resolve(__dirname, "../node_modules/@imgly/background-removal-node/dist")}/`;

export async function runBgRemoval(inputPath, outputPath, width = null) {
  const blob = await removeBackground(inputPath, { publicPath });
  const buffer = Buffer.from(await blob.arrayBuffer());
  let pipeline = sharp(buffer);
  if (width) pipeline = pipeline.resize({ width, withoutEnlargement: true });
  await pipeline.png().toFile(outputPath);
}
