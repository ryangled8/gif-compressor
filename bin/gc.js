#!/usr/bin/env node

import path from "path";
import fs from "fs";
import { Command } from "commander";
import gifPresets from "../presets/gifPresets.js";
import videoPresets from "../presets/videoPresets.js";
import { resolveWidth } from "../lib/resolveWidth.js";
import { buildFilters } from "../lib/buildFilters.js";
import { buildVideoArgs } from "../lib/buildVideoCommand.js";
import { runFFmpegAsync, runFFmpegRawAsync, checkFFmpeg, checkCodec, printFFmpegInstallHelp } from "../lib/runFFmpeg.js";
import { findVideoFiles } from "../lib/selectFiles.js";

// ─── Colour helpers ───────────────────────────────────────────────────────────

const c = {
  reset:   "\x1b[0m",
  bold:    "\x1b[1m",
  dim:     "\x1b[2m",
  cyan:    "\x1b[36m",
  green:   "\x1b[32m",
  yellow:  "\x1b[33m",
  magenta: "\x1b[35m",
  blue:    "\x1b[34m",
  red:     "\x1b[31m",
  white:   "\x1b[97m",
};

const bold    = (s) => `${c.bold}${s}${c.reset}`;
const dim     = (s) => `${c.dim}${s}${c.reset}`;
const cyan    = (s) => `${c.cyan}${s}${c.reset}`;
const green   = (s) => `${c.green}${s}${c.reset}`;
const yellow  = (s) => `${c.yellow}${s}${c.reset}`;
const magenta = (s) => `${c.magenta}${s}${c.reset}`;
const red     = (s) => `${c.red}${s}${c.reset}`;

// ─── Spinner ──────────────────────────────────────────────────────────────────

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

// Starts a spinner on the current line. Returns { done(msg), clear() }.
//   done(msg)  — stops spinner, overwrites line with label + msg + newline
//   clear()    — stops spinner, erases line (caller prints what comes next)
function startSpinner(label) {
  let i = 0;
  process.stdout.write(label + FRAMES[0]);
  const timer = setInterval(() => {
    process.stdout.write(`\r${label}${FRAMES[i++ % FRAMES.length]}`);
  }, 80);
  return {
    done: (msg) => { clearInterval(timer); process.stdout.write(`\r${label}${msg}\n`); },
    clear: ()   => { clearInterval(timer); process.stdout.write(`\r\x1b[K`); },
  };
}

// ─── Codec guard ─────────────────────────────────────────────────────────────

function assertCodecAvailable(codec) {
  if (!checkCodec(codec)) {
    console.error(red(`\n  Codec not available: ${bold(codec)}\n`));
    console.error(`  Your FFmpeg installation does not include ${bold(codec)}.`);
    console.error(`  Reinstall FFmpeg with full codec support:\n`);
    console.error(`    Mac:    ${dim("brew install ffmpeg")}`);
    console.error(`    Linux:  ${dim("sudo apt install ffmpeg")}`);
    console.error(`    Win:    ${dim("https://ffmpeg.org/download.html")}\n`);
    process.exit(1);
  }
}

function warnIfSlow(preset) {
  if (!preset.slowEncoder) return;
  console.log(`  ${yellow("Note")}      Uses the slow encoder preset — 3–4× longer than other presets.`);
  console.log(`            The spinner below will show progress — press Ctrl+C to cancel.`);
  console.log();
}

// Warns when source files are large enough that encoding time may be noticeable.
// filePaths is a single path string or an array (batch mode).
function warnIfLargeFile(filePaths, preset) {
  const paths  = Array.isArray(filePaths) ? filePaths : [filePaths];
  const totalMB = paths.reduce((sum, p) => sum + fs.statSync(p).size, 0) / (1024 * 1024);

  if (totalMB < 300) return;

  // Rough encode-time estimate on a modern machine:
  //   H.265 slow preset: ~8 min/GB, H.265 medium/fast: ~4 min/GB
  const minsPerGB = preset.slowEncoder ? 8 : preset.codec === "libx265" ? 4 : 2;
  const lo = Math.max(1, Math.round((totalMB / 1000) * minsPerGB));
  const hi = lo * 2;
  const timeStr = lo < 2 ? "a few minutes" : `${lo}–${hi} minutes`;

  const sizeStr = totalMB >= 1000
    ? `${(totalMB / 1000).toFixed(1)}GB`
    : `${Math.round(totalMB)}MB`;
  const context = paths.length > 1
    ? `${paths.length} files totalling ${sizeStr}`
    : sizeStr;

  console.log(`  ${yellow("Size")}      ${context} — encoding may take ${timeStr}.`);
  console.log();
}

// ─── Preset validation ────────────────────────────────────────────────────────

function validateGifPreset(name) {
  if (gifPresets[name]) return;
  const names = Object.keys(gifPresets).join("\n  ");
  console.error(red(`\nUnknown GIF preset: ${bold(name)}\n`));
  console.error(`Available GIF presets:\n\n  ${names}\n`);
  process.exit(1);
}

function validateVideoPreset(name) {
  if (videoPresets[name]) return;
  const names = Object.keys(videoPresets).join("\n  ");
  console.error(red(`\nUnknown video preset: ${bold(name)}\n`));
  console.error(`Available video presets:\n\n  ${names}\n`);
  process.exit(1);
}

// ─── Help screen ──────────────────────────────────────────────────────────────

function showHelp() {
  const line  = dim("─".repeat(52));
  const flag  = (s) => `${c.yellow}${s}${c.reset}`;
  const cmd   = (s) => `${c.cyan}${c.bold}${s}${c.reset}`;
  const arg   = (s) => `${c.white}${s}${c.reset}`;
  const head  = (s) => `${c.bold}${s}${c.reset}`;
  const label = (s) => dim(s.padEnd(26));

  console.log();
  console.log(`  ${bold("gc")}  ${dim("— Creator-friendly media compression")}`);
  console.log();
  console.log(`  ${line}`);
  console.log();

  // GIF commands
  console.log(`  ${head("GIF")}  ${dim("Convert video to animated GIF")}`);
  console.log();
  console.log(`  ${cmd("gc gif")} ${arg("<file> <preset>")}          Convert a file to GIF`);
  console.log(`  ${cmd("gc gif batch")} ${arg("<preset>")}           Convert all videos in current directory`);
  console.log();

  console.log(`  ${dim("Override flags")}`);
  console.log();
  console.log(`  ${label(flag("-w, --width") + " " + arg("<value>"))} Override width`);
  console.log(`  ${dim("".padEnd(26))} ${dim("500")}  ${dim("absolute pixels")}`);
  console.log(`  ${dim("".padEnd(26))} ${dim("1/2")}  ${dim("fraction of preset width")}`);
  console.log(`  ${dim("".padEnd(26))} ${dim("2x")}   ${dim("multiplier of preset width")}`);
  console.log();
  console.log(`  ${label(flag("-f, --fps") + " " + arg("<number>"))} Override frames per second`);
  console.log(`  ${label(flag("-c, --colors") + " " + arg("<number>"))} Override palette colours (max 256)`);
  console.log(`  ${label(flag("-d, --dither") + " " + arg("<name>"))} Override dither algorithm`);
  console.log(`  ${label(flag("-o, --output") + " " + arg("<file>"))} Custom output filename ${dim("(single only)")}`);
  console.log();
  console.log(`  ${line}`);
  console.log();

  // Video commands
  console.log(`  ${head("Video")}  ${dim("Compress video to MP4")}`);
  console.log();
  console.log(`  ${cmd("gc vid")} ${arg("<file> <preset>")}          Compress a video file`);
  console.log(`  ${cmd("gc vid batch")} ${arg("<preset>")}           Compress all videos in current directory`);
  console.log();

  console.log(`  ${dim("Override flags")}`);
  console.log();
  console.log(`  ${label(flag("-w, --width") + " " + arg("<value>"))} Override width (same formats as GIF)`);
  console.log(`  ${label(flag("-f, --fps") + " " + arg("<number>"))} Override frames per second`);
  console.log(`  ${label(flag("--crf") + " " + arg("<number>"))} Override CRF quality (lower = better)`);
  console.log(`  ${label(flag("--codec") + " " + arg("<name>"))} Override video codec`);
  console.log(`  ${label(flag("--preset") + " " + arg("<name>"))} Override FFmpeg encoder preset`);
  console.log(`  ${label(flag("--audio") + " " + arg("<bitrate>"))} Override audio bitrate (e.g. 192k)`);
  console.log(`  ${label(flag("-o, --output") + " " + arg("<file>"))} Custom output filename ${dim("(single only)")}`);
  console.log();
  console.log(`  ${line}`);
  console.log();

  // GIF presets
  console.log(`  ${head("GIF Presets")}`);
  console.log();
  const gifNameWidth = Math.max(...Object.keys(gifPresets).map((k) => k.length));
  for (const [name, preset] of Object.entries(gifPresets)) {
    const padded = name.padEnd(gifNameWidth);
    const gifDims = preset.keepOriginalDimensions ? "original dimensions" : `${preset.width}px`;
    console.log(`  ${cmd(padded)}  ${dim("→")}  ${preset.label}`);
    console.log(dim(`  ${"".padEnd(gifNameWidth)}     ${gifDims} · ${preset.fps}fps · ${preset.colors} colours`));
    console.log();
  }

  console.log(`  ${line}`);
  console.log();

  // Video presets
  console.log(`  ${head("Video Presets")}`);
  console.log();
  const vidNameWidth = Math.max(...Object.keys(videoPresets).map((k) => k.length));
  for (const [name, preset] of Object.entries(videoPresets)) {
    const padded = name.padEnd(vidNameWidth);
    const dims = preset.keepOriginalDimensions ? "original dimensions" : `${preset.width}px wide`;
    console.log(`  ${magenta(bold(padded))}  ${dim("→")}  ${preset.label}`);
    console.log(dim(`  ${"".padEnd(vidNameWidth)}     ${dims} · CRF ${preset.crf} · ${preset.audioBitrate} audio`));
    console.log();
  }

  console.log(`  ${line}`);
  console.log();

  // Examples
  console.log(`  ${head("Examples")}`);
  console.log();
  console.log(`  ${dim("$")} ${cmd("gc gif")} ${arg("demo.mov medium")}`);
  console.log(`  ${dim("$")} ${cmd("gc gif")} ${arg("demo.mov large")} ${flag("-w 2x --fps 20")}`);
  console.log(`  ${dim("$")} ${cmd("gc gif batch")} ${arg("medium")}`);
  console.log();
  console.log(`  ${dim("$")} ${cmd("gc vid")} ${arg("hero.mov compress")}`);
  console.log(`  ${dim("$")} ${cmd("gc vid")} ${arg("demo.mov social")}`);
  console.log(`  ${dim("$")} ${cmd("gc vid")} ${arg("demo.mov social")} ${flag("--crf 24")}`);
  console.log(`  ${dim("$")} ${cmd("gc vid batch")} ${arg("social")}`);
  console.log();
}

// ─── Preset listing ───────────────────────────────────────────────────────────

function listPresets() {
  console.log();
  console.log(`  ${bold("GIF Presets")}\n`);

  const gifNameWidth = Math.max(...Object.keys(gifPresets).map((k) => k.length));
  for (const [name, preset] of Object.entries(gifPresets)) {
    const padded = name.padEnd(gifNameWidth);
    const gifDims = preset.keepOriginalDimensions ? "original dimensions" : `${preset.width}px`;
    console.log(`  ${cyan(bold(padded))}  ${dim("→")}  ${preset.label}`);
    console.log(dim(`  ${"".padEnd(gifNameWidth)}     ${gifDims} · ${preset.fps}fps · ${preset.colors} colours · ${preset.dither} dither`));
    console.log();
  }

  console.log(`  ${bold("Video Presets")}\n`);

  const vidNameWidth = Math.max(...Object.keys(videoPresets).map((k) => k.length));
  for (const [name, preset] of Object.entries(videoPresets)) {
    const padded = name.padEnd(vidNameWidth);
    const dims = preset.keepOriginalDimensions ? "original dimensions" : `${preset.width}px wide`;
    console.log(`  ${magenta(bold(padded))}  ${dim("→")}  ${preset.label}`);
    console.log(dim(`  ${"".padEnd(vidNameWidth)}     ${dims} · CRF ${preset.crf} · ${preset.preset} · ${preset.audioBitrate} audio`));
    console.log();
  }
}

// ─── GIF: resolve settings ────────────────────────────────────────────────────

function resolveGifSettings(presetName, options) {
  const preset = { ...gifPresets[presetName] };
  const hasWidthOverride = Boolean(options.width);
  const keepOriginalDimensions = hasWidthOverride ? false : (preset.keepOriginalDimensions ?? false);
  return {
    fps:    options.fps    ? parseInt(options.fps, 10)    : preset.fps,
    colors: options.colors ? parseInt(options.colors, 10) : preset.colors,
    dither: options.dither ?? preset.dither,
    width:  hasWidthOverride ? resolveWidth(options.width, preset.width ?? 1920) : preset.width,
    keepOriginalDimensions,
    widthOverride: hasWidthOverride,
  };
}

// ─── Video: resolve settings ──────────────────────────────────────────────────

function resolveVideoSettings(presetName, options) {
  const preset = { ...videoPresets[presetName] };

  // Explicit width override disables keepOriginalDimensions
  const hasWidthOverride = Boolean(options.width);
  const keepOriginalDimensions = hasWidthOverride ? false : (preset.keepOriginalDimensions ?? false);
  const width = hasWidthOverride
    ? resolveWidth(options.width, preset.width ?? 1920)
    : preset.width;

  return {
    keepOriginalDimensions,
    widthOverride: hasWidthOverride,
    width,
    codec:         options.codec  ?? preset.codec,
    crf:           options.crf    ? parseInt(options.crf, 10) : preset.crf,
    preset:        options.preset ?? preset.preset,
    fps:           options.fps    ? parseInt(options.fps, 10) : null,
    audioBitrate:  options.audio  ?? preset.audioBitrate,
  };
}

// ─── GIF: compress single file ────────────────────────────────────────────────

async function compressGif(input, presetName, options) {
  validateGifPreset(presetName);

  if (!fs.existsSync(input)) {
    console.error(red(`\nFile not found: ${bold(input)}\n`));
    process.exit(1);
  }

  if (!checkFFmpeg()) {
    printFFmpegInstallHelp();
    process.exit(1);
  }

  const { fps, colors, dither, width, keepOriginalDimensions } = resolveGifSettings(presetName, options);

  const ext         = path.extname(input);
  const basename    = path.basename(input, ext);
  const outDir      = path.dirname(input);
  const widthSuffix = (options.width && width !== -1) ? `-${width}px` : "";
  const output      = options.output
    ? options.output
    : path.join(outDir, `${basename}-${presetName}${widthSuffix}.gif`);

  const widthLabel = keepOriginalDimensions ? dim("original dimensions") : width === -1 ? dim("auto (aspect lock)") : `${width}px`;

  console.log();
  console.log(`  ${dim("Compressing")} ${bold(input)}${dim("...")}`);
  console.log();
  console.log(`  ${dim("Mode")}      ${cyan("gif")}`);
  console.log(`  ${dim("Preset")}    ${cyan(presetName)}`);
  console.log(`  ${dim("Width")}     ${widthLabel}`);
  console.log(`  ${dim("FPS")}       ${fps}`);
  console.log(`  ${dim("Colours")}   ${colors}`);
  console.log(`  ${dim("Dither")}    ${dither}`);
  console.log();
  const filters = buildFilters({ fps, width, colors, dither, keepOriginalDimensions });
  const spinner = startSpinner(`  ${dim("Generating GIF...")}  `);

  try {
    await runFFmpegAsync(input, filters, output);
    spinner.clear();
  } catch (err) {
    spinner.clear();
    console.error(red(`\n  FFmpeg failed.\n`));
    console.error(dim(err.message));
    process.exit(1);
  }

  console.log(`  ${green("Done")} ${dim("→")} ${bold(output)}\n`);
}

// ─── GIF: batch compress ──────────────────────────────────────────────────────

async function batchGif(presetName, options) {
  validateGifPreset(presetName);

  if (!checkFFmpeg()) {
    printFFmpegInstallHelp();
    process.exit(1);
  }

  const cwd   = process.cwd();
  const files = findVideoFiles(cwd);

  if (files.length === 0) {
    console.log(dim("\n  No video files found in the current directory.\n"));
    process.exit(0);
  }

  const outFolder = path.join(cwd, `Outputs gif-${presetName}`);
  if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder, { recursive: true });

  const { fps, colors, dither, width, keepOriginalDimensions } = resolveGifSettings(presetName, options);
  const filters = buildFilters({ fps, width, colors, dither, keepOriginalDimensions });
  const total   = files.length;

  const widthLabel = keepOriginalDimensions ? dim("original dimensions") : width === -1 ? dim("auto (aspect lock)") : `${width}px`;

  console.log();
  console.log(`  ${bold(`Batch`)} ${cyan("gif")} ${bold(`· ${total} file${total === 1 ? "" : "s"}`)} ${dim("→")} ${cyan(`Outputs gif-${presetName}/`)}`);
  console.log();
  console.log(`  ${dim("Preset")}    ${cyan(presetName)}`);
  console.log(`  ${dim("Width")}     ${widthLabel}`);
  console.log(`  ${dim("FPS")}       ${fps}`);
  console.log(`  ${dim("Colours")}   ${colors}`);
  console.log();

  let passed = 0;
  let failed = 0;

  const widthSuffix = (options.width && width !== -1) ? `-${width}px` : "";

  for (let i = 0; i < files.length; i++) {
    const file     = files[i];
    const ext      = path.extname(file);
    const basename = path.basename(file, ext);
    const output   = path.join(outFolder, `${basename}-${presetName}${widthSuffix}.gif`);
    const label    = `  ${dim(`[${i + 1}/${total}]`)} ${file}${dim("...")}  `;
    const spinner  = startSpinner(label);

    try {
      await runFFmpegAsync(path.join(cwd, file), filters, output);
      spinner.done(green("Done"));
      passed++;
    } catch {
      spinner.done(red("Failed"));
      failed++;
    }
  }

  console.log();

  if (failed === 0) {
    console.log(`  ${green(bold(`${passed} GIF${passed === 1 ? "" : "s"} saved`))} ${dim("→")} ${bold(`Outputs gif-${presetName}/`)}\n`);
  } else {
    console.log(`  ${green(`${passed} saved`)}  ${red(`${failed} failed`)}  ${dim("→")} ${bold(`Outputs gif-${presetName}/`)}\n`);
  }
}

// ─── Video: compress single file ──────────────────────────────────────────────

async function compressVideo(input, presetName, options) {
  validateVideoPreset(presetName);

  if (!fs.existsSync(input)) {
    console.error(red(`\nFile not found: ${bold(input)}\n`));
    process.exit(1);
  }

  if (!checkFFmpeg()) {
    printFFmpegInstallHelp();
    process.exit(1);
  }

  const settings = resolveVideoSettings(presetName, options);
  const { keepOriginalDimensions, width, codec, crf, preset, fps, audioBitrate } = settings;

  assertCodecAvailable(codec);

  const ext         = path.extname(input);
  const basename    = path.basename(input, ext);
  const outDir      = path.dirname(input);
  const widthSuffix = (options.width && width !== -1) ? `-${width}px` : "";
  const output      = options.output
    ? options.output
    : path.join(outDir, `${basename}-${presetName}${widthSuffix}.mp4`);

  const codecLabel = { libx264: "H.264", libx265: "H.265 (HEVC)" }[codec] ?? codec;

  console.log();
  console.log(`  ${dim("Compressing")} ${bold(input)}${dim("...")}`);
  console.log();
  console.log(`  ${dim("Mode")}      ${magenta("vid")}`);
  console.log(`  ${dim("Preset")}    ${magenta(presetName)}`);
  console.log(`  ${dim("Width")}     ${keepOriginalDimensions ? dim("original dimensions") : `max ${width}px`}`);
  if (fps) console.log(`  ${dim("FPS")}       ${fps}`);
  console.log(`  ${dim("CRF")}       ${crf}`);
  console.log(`  ${dim("Codec")}     ${codecLabel}`);
  console.log(`  ${dim("Audio")}     ${audioBitrate}`);
  console.log();
  warnIfSlow(videoPresets[presetName]);
  warnIfLargeFile(input, videoPresets[presetName]);
  const args = buildVideoArgs(input, settings, output);
  const spinner = startSpinner(`  ${dim("Generating MP4...")}  `);

  try {
    await runFFmpegRawAsync(args);
    spinner.clear();
  } catch (err) {
    spinner.clear();
    console.error(red(`\n  FFmpeg failed.\n`));
    console.error(dim(err.message));
    process.exit(1);
  }

  console.log(`  ${green("Done")} ${dim("→")} ${bold(output)}\n`);
}

// ─── Video: batch compress ────────────────────────────────────────────────────

async function batchVideo(presetName, options) {
  validateVideoPreset(presetName);

  if (!checkFFmpeg()) {
    printFFmpegInstallHelp();
    process.exit(1);
  }

  const cwd   = process.cwd();
  const files = findVideoFiles(cwd);

  if (files.length === 0) {
    console.log(dim("\n  No video files found in the current directory.\n"));
    process.exit(0);
  }

  const outFolder = path.join(cwd, `Outputs vid-${presetName}`);
  if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder, { recursive: true });

  const settings = resolveVideoSettings(presetName, options);
  const { keepOriginalDimensions, width } = settings;

  assertCodecAvailable(settings.codec);

  const total = files.length;

  console.log();
  console.log(`  ${bold(`Batch`)} ${magenta("vid")} ${bold(`· ${total} file${total === 1 ? "" : "s"}`)} ${dim("→")} ${magenta(`Outputs vid-${presetName}/`)}`);
  console.log();
  console.log(`  ${dim("Preset")}    ${magenta(presetName)}`);
  console.log(`  ${dim("Width")}     ${keepOriginalDimensions ? dim("original dimensions") : `max ${width}px`}`);
  console.log(`  ${dim("CRF")}       ${settings.crf}`);
  console.log();
  warnIfSlow(videoPresets[presetName]);
  warnIfLargeFile(files.map((f) => path.join(cwd, f)), videoPresets[presetName]);

  let passed = 0;
  let failed = 0;

  const widthSuffix = (options.width && width !== -1) ? `-${width}px` : "";

  for (let i = 0; i < files.length; i++) {
    const file     = files[i];
    const ext      = path.extname(file);
    const basename = path.basename(file, ext);
    const output   = path.join(outFolder, `${basename}-${presetName}${widthSuffix}.mp4`);
    const label    = `  ${dim(`[${i + 1}/${total}]`)} ${file}${dim("...")}  `;
    const spinner  = startSpinner(label);

    const args = buildVideoArgs(path.join(cwd, file), settings, output);

    try {
      await runFFmpegRawAsync(args);
      spinner.done(green("Done"));
      passed++;
    } catch {
      spinner.done(red("Failed"));
      failed++;
    }
  }

  console.log();

  if (failed === 0) {
    console.log(`  ${green(bold(`${passed} video${passed === 1 ? "" : "s"} saved`))} ${dim("→")} ${bold(`Outputs vid-${presetName}/`)}\n`);
  } else {
    console.log(`  ${green(`${passed} saved`)}  ${red(`${failed} failed`)}  ${dim("→")} ${bold(`Outputs vid-${presetName}/`)}\n`);
  }
}

// ─── CLI definition ───────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);
if (rawArgs.length === 0) {
  showHelp();
  process.exit(0);
}

const program = new Command();

program
  .name("gc")
  .description("Creator-friendly media compression CLI — built on top of FFmpeg")
  .version("2.0.0");

// ── gc gif <input> <preset> [options]
//    gc gif batch <preset> [options]
const gifCmd = program
  .command("gif")
  .description("Convert a video file to an animated GIF")
  .argument("<input>", "Source video file (e.g. demo.mov)")
  .argument("<preset>", "GIF preset (e.g. medium)")
  .option("-w, --width <value>",   "Override width: 500 | 1/2 | 2x | 0.5x")
  .option("-f, --fps <number>",    "Override frames per second")
  .option("-c, --colors <number>", "Override palette colours (max 256)")
  .option("-d, --dither <name>",   "Override dither algorithm (e.g. floyd_steinberg)")
  .option("-o, --output <file>",   "Custom output filename")
  .action(async (input, preset, options) => {
    try {
      await compressGif(input, preset, options);
    } catch (err) {
      console.error(red(`\n  Error: ${err.message}\n`));
      process.exit(1);
    }
  });

gifCmd
  .command("batch")
  .description("Convert all videos in the current directory to GIF")
  .argument("<preset>", "GIF preset (e.g. medium)")
  .option("-w, --width <value>",   "Override width: 500 | 1/2 | 2x | 0.5x")
  .option("-f, --fps <number>",    "Override frames per second")
  .option("-c, --colors <number>", "Override palette colours (max 256)")
  .option("-d, --dither <name>",   "Override dither algorithm")
  .action(async (preset, options) => {
    try {
      await batchGif(preset, options);
    } catch (err) {
      console.error(red(`\n  Error: ${err.message}\n`));
      process.exit(1);
    }
  });

// ── gc vid <input> <preset> [options]
//    gc vid batch <preset> [options]
const videoCmd = program
  .command("vid")
  .description("Compress a video file to MP4")
  .argument("<input>", "Source video file (e.g. demo.mov)")
  .argument("<preset>", "Video preset (e.g. social, compress)")
  .option("-w, --width <value>",   "Override width: 500 | 1/2 | 2x | 0.5x")
  .option("-f, --fps <number>",    "Override frames per second")
  .option("--crf <number>",        "Override CRF quality value (lower = better quality)")
  .option("--codec <name>",        "Override video codec (e.g. libx265)")
  .option("--preset <name>",       "Override FFmpeg encoder preset (e.g. slow, fast)")
  .option("--audio <bitrate>",     "Override audio bitrate (e.g. 192k)")
  .option("-o, --output <file>",   "Custom output filename")
  .action(async (input, preset, options) => {
    try {
      await compressVideo(input, preset, options);
    } catch (err) {
      console.error(red(`\n  Error: ${err.message}\n`));
      process.exit(1);
    }
  });

videoCmd
  .command("batch")
  .description("Compress all videos in the current directory to MP4")
  .argument("<preset>", "Video preset (e.g. social, compress)")
  .option("-w, --width <value>",   "Override width: 500 | 1/2 | 2x | 0.5x")
  .option("-f, --fps <number>",    "Override frames per second")
  .option("--crf <number>",        "Override CRF quality value")
  .option("--codec <name>",        "Override video codec")
  .option("--preset <name>",       "Override FFmpeg encoder preset")
  .option("--audio <bitrate>",     "Override audio bitrate")
  .action(async (preset, options) => {
    try {
      await batchVideo(preset, options);
    } catch (err) {
      console.error(red(`\n  Error: ${err.message}\n`));
      process.exit(1);
    }
  });

// ── gc help
program
  .command("help", { isDefault: false })
  .description("Show all commands, flags, presets, and examples")
  .action(() => {
    showHelp();
  });

// ── gc preset list
const presetCmd = program
  .command("preset")
  .description("Manage presets");

presetCmd
  .command("list")
  .description("List all available presets and their settings")
  .action(() => {
    listPresets();
  });

program.parse(process.argv);
