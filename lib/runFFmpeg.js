import { execFileSync, execSync, spawn } from "child_process";

function checkCodec(codec) {
  try {
    const output = execSync("ffmpeg -encoders", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.includes(codec);
  } catch {
    return false;
  }
}

function checkFFmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function printFFmpegInstallHelp() {
  console.error(`\nFFmpeg not found.\n`);
  console.error(`Install:\n`);
  console.error(`  Mac:\n    brew install ffmpeg\n`);
  console.error(`  Ubuntu / Debian:\n    sudo apt install ffmpeg\n`);
  console.error(`  Windows:\n    https://ffmpeg.org/download.html\n`);
}

function runFFmpeg(input, filters, output) {
  if (!checkFFmpeg()) {
    printFFmpegInstallHelp();
    process.exit(1);
  }

  execFileSync("ffmpeg", ["-i", input, "-vf", filters, "-y", output], {
    stdio: ["ignore", "ignore", "ignore"],
  });
}

function runFFmpegRaw(args) {
  if (!checkFFmpeg()) {
    printFFmpegInstallHelp();
    process.exit(1);
  }

  execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "ignore"] });
}

// Async versions — used by spinner-enabled paths in the CLI

function runFFmpegRawAsync(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: "ignore" });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

function runFFmpegAsync(input, filters, output) {
  return runFFmpegRawAsync(["-i", input, "-vf", filters, "-y", output]);
}

export {
  runFFmpeg,
  runFFmpegRaw,
  runFFmpegAsync,
  runFFmpegRawAsync,
  checkFFmpeg,
  checkCodec,
  printFFmpegInstallHelp,
};
