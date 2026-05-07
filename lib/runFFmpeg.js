const { execFileSync, execSync } = require("child_process");

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

/**
 * Runs FFmpeg with the given input, filter chain, and output path.
 * Suppresses FFmpeg's own output for a clean CLI experience.
 */
function runFFmpeg(input, filters, output) {
  if (!checkFFmpeg()) {
    printFFmpegInstallHelp();
    process.exit(1);
  }

  const args = [
    "-i", input,
    "-vf", filters,
    "-y",           // overwrite output without prompting
    output
  ];

  execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "ignore"] });
}

module.exports = { runFFmpeg, checkFFmpeg, printFFmpegInstallHelp };
