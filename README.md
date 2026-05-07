# gifcompress (`gc`)

> Creator-friendly GIF compression — Tailwind for FFmpeg.

Turn any video into a high-quality compressed GIF using simple, memorable commands. No FFmpeg knowledge required.

---

## Requirements

### FFmpeg

This tool requires FFmpeg to be installed on your machine. It is **not** bundled.

**Mac:**
```bash
brew install ffmpeg
```

**Ubuntu / Debian:**
```bash
sudo apt install ffmpeg
```

**Windows:**
Download from [ffmpeg.org/download.html](https://ffmpeg.org/download.html) and add to your PATH.

Verify your install:
```bash
ffmpeg -version
```

### Node.js

Node.js 16 or higher is required.

---

## Installation

Clone or download this repo, then install globally from the project folder:

```bash
cd path/to/npm-compressor
npm install -g .
```

Verify the install:
```bash
gc --help
```

---

## Basic Usage

```bash
gc <input> <preset>
```

Example:

```bash
gc demo.mov medium
```

Output:

```
Compressing demo.mov...

  Preset    medium
  Width     360px
  FPS       10
  Colours   256
  Dither    bayer

Generating GIF...
Done → demo-medium.gif
```

---

## Presets

Presets are the core of the tool. Pick the one that matches your use case.

| Preset   | Width  | FPS | Colours | Best for                     |
|----------|--------|-----|---------|------------------------------|
| `tiny`   | 180px  | 6   | 64      | Ultra-small reaction GIFs    |
| `small`  | 240px  | 8   | 128     | Lightweight web embeds       |
| `medium` | 360px  | 10  | 256     | UI demos and changelogs      |
| `large`  | 640px  | 15  | 256     | Showcase-quality GIFs        |
| `social` | 480px  | 12  | 256     | Optimised for social sharing |
| `slack`  | 240px  | 8   | 128     | Optimised for Slack/Discord  |

List all presets in the terminal:

```bash
gc preset list
# or
gc --presets
```

---

## Overrides

Override individual preset settings without abandoning the preset.

### Width

```bash
# Absolute pixel value
gc demo.mov medium -w 500

# Fraction of preset width (360 → 180)
gc demo.mov medium -w 1/2

# Multiplier (360 → 720)
gc demo.mov medium -w 2x

# Decimal multiplier (360 → 180)
gc demo.mov medium -w 0.5x

# Aspect-ratio lock (let FFmpeg decide)
gc demo.mov medium -w -1
```

### FPS

```bash
gc demo.mov medium --fps 12
```

### Colours

```bash
gc demo.mov medium --colors 128
```

### Dither algorithm

```bash
gc demo.mov medium --dither floyd_steinberg
```

### Custom output filename

```bash
gc demo.mov medium -o my-output.gif
```

### Combining overrides

```bash
gc demo.mov medium -w 2x --fps 12 --colors 128
```

---

## Batch Mode

Compress every video file in the current directory in one command.

```bash
gc batch medium
```

This will:

1. Scan the current directory for all video files (`.mov`, `.mp4`, `.mkv`, `.avi`, `.webm`, `.m4v`)
2. Compress each one using the specified preset
3. Save all outputs into a new folder named `Outputs {preset}/`

Example output:

```
Batch compressing 3 files → Outputs medium/

  Preset    medium
  Width     360px
  FPS       10
  Colours   256

[1/3] demo.mov...   Done
[2/3] intro.mov...  Done
[3/3] outro.mov...  Done

3 GIFs saved → Outputs medium/
```

Batch mode supports all the same overrides as single-file mode:

```bash
gc batch medium -w 1/2
gc batch medium -w 2x --fps 12
```

---

## Output Filenames

By default the output filename is:

```
{input-name}-{preset}.gif
```

Example: `demo.mov` + `medium` → `demo-medium.gif`

The file is saved in the same directory as the input. Use `-o` to specify a custom path.

---

## All Options

**Single file:**
```
gc <input> <preset> [options]

  -w, --width <value>    Override width: 500 | 1/2 | 2x | 0.5x | -1
  -f, --fps <number>     Override frames per second
  -c, --colors <number>  Override palette colours (max 256)
  -d, --dither <name>    Override dither algorithm
  -o, --output <file>    Custom output filename
```

**Batch:**
```
gc batch <preset> [options]

  -w, --width <value>    Override width
  -f, --fps <number>     Override frames per second
  -c, --colors <number>  Override palette colours
  -d, --dither <name>    Override dither algorithm
```

**Utility:**
```
gc preset list           List all presets with settings
gc --presets             Same, shorthand
gc --version             Output version number
gc --help                Display help
```
