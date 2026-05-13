import fs from "fs";
import path from "path";
import prompts from "prompts";

const VIDEO_EXTENSIONS = [".mov", ".mp4", ".mkv", ".avi", ".webm", ".m4v"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".tiff", ".bmp"];

function walkFiles(root, dir, extensions) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith("Outputs ") || entry.name.startsWith(".")) continue;
      results = results.concat(walkFiles(root, path.join(dir, entry.name), extensions));
    } else if (extensions.includes(path.extname(entry.name).toLowerCase())) {
      results.push(path.relative(root, path.join(dir, entry.name)));
    }
  }
  return results.sort();
}

function findVideoFiles(dir, recursive = false) {
  if (!recursive) {
    return fs
      .readdirSync(dir)
      .filter((f) => VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase()))
      .sort();
  }
  return walkFiles(dir, dir, VIDEO_EXTENSIONS);
}

function findImageFiles(dir, recursive = false) {
  if (!recursive) {
    return fs
      .readdirSync(dir)
      .filter((f) => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
      .sort();
  }
  return walkFiles(dir, dir, IMAGE_EXTENSIONS);
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
