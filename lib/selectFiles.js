import fs from "fs";
import path from "path";
import prompts from "prompts";

const VIDEO_EXTENSIONS = [".mov", ".mp4", ".mkv", ".avi", ".webm", ".m4v"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".tiff", ".bmp"];

function findVideoFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort();
}

function findImageFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort();
}

async function selectFiles(dir) {
  const files = findVideoFiles(dir);

  if (files.length === 0) {
    return null;
  }

  const response = await prompts(
    {
      type: "multiselect",
      name: "files",
      message: "Select files to compress",
      choices: files.map((f) => ({ title: f, value: f })),
      hint: "Space to select · Arrow keys to navigate · Enter to confirm",
      instructions: false,
      min: 1,
    },
    {
      onCancel: () => {
        process.exit(0);
      }
    }
  );

  return response.files && response.files.length > 0 ? response.files : null;
}

export { selectFiles, findVideoFiles, findImageFiles };
