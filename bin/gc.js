#!/usr/bin/env node

"use strict";

const path = require("path");
const fs = require("fs");
const { Command } = require("commander");
const presets = require("../presets/presets");
const { resolveWidth } = require("../lib/resolveWidth");
const { buildFilters } = require("../lib/buildFilters");
const { runFFmpeg, checkFFmpeg, printFFmpegInstallHelp } = require("../lib/runFFmpeg");
const { findVideoFiles } = require("../lib/selectFiles");

// ─── Colour helpers (no dependencies) ────────────────────────────────────────

const c = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  white:  "\x1b[97m",
};

const bold   = (s) => `${c.bold}${s}${c.reset}`;
const dim    = (s) => `${c.dim}${s}${c.reset}`;
const cyan   = (s) => `${c.cyan}${s}${c.reset}`;
const green  = (s) => `${c.green}${s}${c.reset}`;
const red    = (s) => `${c.red}${s}${c.reset}`;

// ─── Preset validation ────────────────────────────────────────────────────────

function validatePreset(name) {
  if (presets[name]) return;

  const names = Object.keys(presets).join("\n  ");
  console.error(red(`\nUnknown preset: ${bold(name)}\n`));
  console.error(`Available presets:\n\n  ${names}\n`);
  process.exit(1);
}

// ─── Help screen ─────────────────────────────────────────────────────────────

function showHelp() {
  const line  = dim("─".repeat(48));
  const flag  = (s) => `${c.yellow}${s}${c.reset}`;
  const cmd   = (s) => `${c.cyan}${c.bold}${s}${c.reset}`;
  const arg   = (s) => `${c.white}${s}${c.reset}`;
  const label = (s) => dim(s.padEnd(22));

  console.log();
  console.log(`  ${bold("gc")}  ${dim("— Creator-friendly GIF compression")}`);
  console.log();
  console.log(`  ${line}`);
  console.log();

  console.log(`  ${bold("Commands")}`);
  console.log();
  console.log(`  ${cmd("gc")} ${arg("<file>")} ${arg("<preset>")}       Compress a single file`);
  console.log(`  ${cmd("gc batch")} ${arg("<preset>")}          Compress all video files in the current directory`);
  console.log(`  ${cmd("gc preset list")}              List all presets and their settings`);
  console.log(`  ${cmd("gc help")}                     Show this help screen`);
  console.log();
  console.log(`  ${line}`);
  console.log();

  console.log(`  ${bold("Override flags")}  ${dim("(work with both gc and gc batch)")}`);
  console.log();
  console.log(`  ${label(flag("-w, --width") + " " + arg("<value>"))} Override width`);
  console.log(`  ${dim("".padEnd(22))} ${dim("500")}  ${dim("absolute pixels")}`);
  console.log(`  ${dim("".padEnd(22))} ${dim("1/2")}  ${dim("fraction of preset width")}`);
  console.log(`  ${dim("".padEnd(22))} ${dim("2x")}   ${dim("multiplier of preset width")}`);
  console.log(`  ${dim("".padEnd(22))} ${dim("-1")}   ${dim("aspect-ratio lock")}`);
  console.log();
  console.log(`  ${label(flag("-f, --fps") + " " + arg("<number>"))} Override frames per second`);
  console.log(`  ${label(flag("-c, --colors") + " " + arg("<number>"))} Override palette colours (max 256)`);
  console.log(`  ${label(flag("-d, --dither") + " " + arg("<name>"))} Override dither algorithm`);
  console.log(`  ${label(flag("-o, --output") + " " + arg("<file>"))} Custom output filename ${dim("(single file only)")}`);
  console.log();
  console.log(`  ${line}`);
  console.log();

  console.log(`  ${bold("Presets")}`);
  console.log();

  const nameWidth = Math.max(...Object.keys(presets).map((k) => k.length));
  for (const [name, preset] of Object.entries(presets)) {
    const padded = name.padEnd(nameWidth);
    console.log(
      `  ${cmd(padded)}  ${dim("→")}  ${preset.label}`
    );
    console.log(
      dim(`  ${"".padEnd(nameWidth)}     ${preset.width}px · ${preset.fps}fps · ${preset.colors} colours · ${preset.dither} dither`)
    );
    console.log();
  }

  console.log(`  ${line}`);
  console.log();
  console.log(`  ${bold("Examples")}`);
  console.log();
  console.log(`  ${dim("$")} ${cmd("gc")} ${arg("demo.mov medium")}`);
  console.log(`  ${dim("$")} ${cmd("gc")} ${arg("demo.mov large")} ${flag("-w 2x")} ${flag("--fps 20")}`);
  console.log(`  ${dim("$")} ${cmd("gc batch")} ${arg("medium")}`);
  console.log(`  ${dim("$")} ${cmd("gc batch")} ${arg("slack")} ${flag("-w 1/2")}`);
  console.log();
}

// ─── Preset listing ───────────────────────────────────────────────────────────

function listPresets() {
  console.log(`\n${bold("Available presets:")}\n`);

  const nameWidth = Math.max(...Object.keys(presets).map((k) => k.length));

  for (const [name, preset] of Object.entries(presets)) {
    const padded = name.padEnd(nameWidth);
    console.log(
      `  ${cyan(bold(padded))}  ${dim("→")}  ${preset.label}`
    );
    console.log(
      dim(
        `  ${"".padEnd(nameWidth)}     ${preset.width}px · ${preset.fps}fps · ${preset.colors} colours · ${preset.dither} dither`
      )
    );
    console.log();
  }
}

// ─── Resolve encode settings from preset + overrides ─────────────────────────

function resolveSettings(presetName, options) {
  const preset = { ...presets[presetName] };
  return {
    fps:    options.fps    ? parseInt(options.fps, 10)    : preset.fps,
    colors: options.colors ? parseInt(options.colors, 10) : preset.colors,
    dither: options.dither ?? preset.dither,
    width:  options.width  ? resolveWidth(options.width, preset.width) : preset.width,
  };
}

// ─── Main compress logic ──────────────────────────────────────────────────────

function compress(input, presetName, options) {
  validatePreset(presetName);

  if (!fs.existsSync(input)) {
    console.error(red(`\nFile not found: ${bold(input)}\n`));
    process.exit(1);
  }

  if (!checkFFmpeg()) {
    printFFmpegInstallHelp();
    process.exit(1);
  }

  const { fps, colors, dither, width } = resolveSettings(presetName, options);

  const ext      = path.extname(input);
  const basename = path.basename(input, ext);
  const outDir   = path.dirname(input);
  const output   = options.output
    ? options.output
    : path.join(outDir, `${basename}-${presetName}.gif`);

  console.log();
  console.log(`${dim("Compressing")} ${bold(input)}${dim("...")}`);
  console.log();
  console.log(`  ${dim("Preset")}    ${cyan(presetName)}`);
  console.log(`  ${dim("Width")}     ${width === -1 ? "auto (aspect lock)" : `${width}px`}`);
  console.log(`  ${dim("FPS")}       ${fps}`);
  console.log(`  ${dim("Colours")}   ${colors}`);
  console.log(`  ${dim("Dither")}    ${dither}`);
  console.log();
  console.log(`${dim("Generating GIF...")}`);

  const filters = buildFilters({ fps, width, colors, dither });

  try {
    runFFmpeg(input, filters, output);
  } catch (err) {
    console.error(red(`\nFFmpeg failed.\n`));
    console.error(dim(err.message));
    process.exit(1);
  }

  console.log(`${green("Done")} ${dim("→")} ${bold(output)}\n`);
}

// ─── Batch compress logic ─────────────────────────────────────────────────────

function batch(presetName, options) {
  validatePreset(presetName);

  if (!checkFFmpeg()) {
    printFFmpegInstallHelp();
    process.exit(1);
  }

  const cwd   = process.cwd();
  const files = findVideoFiles(cwd);

  if (files.length === 0) {
    console.log(dim("\nNo video files found in the current directory.\n"));
    process.exit(0);
  }

  const outFolder = path.join(cwd, `Outputs ${presetName}`);
  if (!fs.existsSync(outFolder)) {
    fs.mkdirSync(outFolder, { recursive: true });
  }

  const { fps, colors, dither, width } = resolveSettings(presetName, options);
  const filters = buildFilters({ fps, width, colors, dither });
  const total   = files.length;

  console.log();
  console.log(`${bold(`Batch compressing ${total} file${total === 1 ? "" : "s"}`)} ${dim("→")} ${cyan(`Outputs ${presetName}/`)}`);
  console.log();
  console.log(`  ${dim("Preset")}    ${cyan(presetName)}`);
  console.log(`  ${dim("Width")}     ${width === -1 ? "auto (aspect lock)" : `${width}px`}`);
  console.log(`  ${dim("FPS")}       ${fps}`);
  console.log(`  ${dim("Colours")}   ${colors}`);
  console.log();

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file     = files[i];
    const ext      = path.extname(file);
    const basename = path.basename(file, ext);
    const output   = path.join(outFolder, `${basename}-${presetName}.gif`);
    const counter  = dim(`[${i + 1}/${total}]`);

    process.stdout.write(`${counter} ${file}${dim("...")}  `);

    try {
      runFFmpeg(path.join(cwd, file), filters, output);
      console.log(green("Done"));
      passed++;
    } catch {
      console.log(red("Failed"));
      failed++;
    }
  }

  console.log();

  if (failed === 0) {
    console.log(`${green(bold(`${passed} GIF${passed === 1 ? "" : "s"} saved`))} ${dim("→")} ${bold(`Outputs ${presetName}/`)}\n`);
  } else {
    console.log(`${green(`${passed} saved`)}  ${red(`${failed} failed`)}  ${dim("→")} ${bold(`Outputs ${presetName}/`)}\n`);
  }
}

// ─── CLI definition ───────────────────────────────────────────────────────────

// Handle bare `gc` or `gc --presets` before Commander sees them
const rawArgs = process.argv.slice(2);
if (rawArgs.length === 0 || rawArgs.includes("--presets")) {
  if (rawArgs.includes("--presets")) listPresets();
  else showHelp();
  process.exit(0);
}

const program = new Command();

program
  .name("gc")
  .description("Creator-friendly GIF compression — Tailwind for FFmpeg")
  .version("1.0.0");

// ── Main compress command: gc <input> <preset> [options]
program
  .argument("<input>", "Source video file (e.g. demo.mov)")
  .argument("<preset>", "Compression preset (e.g. medium)")
  .option("-w, --width <value>",   "Override width: 500 | 1/2 | 2x | 0.5x | -1")
  .option("-f, --fps <number>",    "Override frames per second")
  .option("-c, --colors <number>", "Override palette colours (max 256)")
  .option("-d, --dither <name>",   "Override dither algorithm (e.g. floyd_steinberg)")
  .option("-o, --output <file>",   "Custom output filename")
  .action((input, preset, options) => {
    try {
      compress(input, preset, options);
    } catch (err) {
      console.error(red(`\nError: ${err.message}\n`));
      process.exit(1);
    }
  });

// ── Batch subcommand: gc batch <preset> [options]
program
  .command("batch")
  .description("Compress all video files in the current directory using the specified preset")
  .argument("<preset>", "Compression preset (e.g. medium)")
  .option("-w, --width <value>",   "Override width: 500 | 1/2 | 2x | 0.5x | -1")
  .option("-f, --fps <number>",    "Override frames per second")
  .option("-c, --colors <number>", "Override palette colours (max 256)")
  .option("-d, --dither <name>",   "Override dither algorithm")
  .action((preset, options) => {
    try {
      batch(preset, options);
    } catch (err) {
      console.error(red(`\nError: ${err.message}\n`));
      process.exit(1);
    }
  });

// ── Help subcommand: gc help
program
  .command("help", { isDefault: false })
  .description("Show all commands, flags, presets, and examples")
  .action(() => {
    showHelp();
  });

// ── Preset list subcommand: gc preset list
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
