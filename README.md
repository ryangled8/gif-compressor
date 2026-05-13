# gc

> Creator-friendly media compression CLI — GIFs, videos, and images

Compress and convert any media using simple, memorable commands. No FFmpeg or encoder knowledge required.

---

## Requirements

### FFmpeg

Required for GIF and video modes. It is **not** bundled.

> Image mode (`gc img`) uses [sharp](https://sharp.pixelplumbing.com/) which is installed automatically with `npm install` — no separate install needed.

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
gc help
```

---

## GIF Mode

Convert any video to an animated GIF.

```bash
gc gif <input> <preset>
```

Example:

```bash
gc gif demo.mov medium
```

Output:

```
  Compressing demo.mov...

  Mode      gif
  Preset    medium
  Width     360px
  FPS       10
  Colours   256
  Dither    bayer

  Generating GIF...
  Done → demo-medium.gif
```

### GIF Presets

| Preset      | Width              | FPS | Colours | Best for                          |
| ----------- | ------------------ | --- | ------- | --------------------------------- |
| `compress`  | original           | 15  | 256     | Reduce filesize, keep dimensions  |
| `tiny`      | 180px              | 6   | 64      | Ultra-small reaction GIFs         |
| `small`     | 240px              | 8   | 128     | Lightweight web embeds            |
| `medium`    | 360px              | 10  | 256     | UI demos and changelogs           |
| `large`     | 640px              | 15  | 256     | Showcase-quality GIFs             |
| `social`    | 480px              | 12  | 256     | Optimised for social sharing      |
| `slack`     | 240px              | 8   | 128     | Optimised for Slack and Discord   |
| `half`      | 50% of source      | 25  | 256     | Half source width, full quality   |
| `third`     | 33% of source      | 25  | 256     | One third source width            |
| `quart`     | 25% of source      | 25  | 256     | Quarter source width              |

### GIF Overrides

```bash
# Width
gc gif demo.mov medium -w 500       # absolute pixels
gc gif demo.mov medium -w 1/2       # fraction of preset width
gc gif demo.mov medium -w 2x        # multiplier
gc gif demo.mov medium -w 0.5x      # decimal multiplier

# FPS, colours, dither
gc gif demo.mov medium --fps 12
gc gif demo.mov medium --colors 128
gc gif demo.mov medium --dither floyd_steinberg

# Custom output filename
gc gif demo.mov medium -o my-output.gif
```

### GIF Batch Mode

Compress every video in the current directory to GIF in one command.

```bash
gc gif batch medium
```

Outputs are saved to `Outputs gif-{preset}/`.

```bash
gc gif batch medium -w 1/2
gc gif batch medium -w 2x --fps 12
```

Add `--all` to also recurse into subdirectories. Outputs mirror the source directory structure:

```bash
gc gif batch medium --all
gc gif batch medium --all -w 1/2
```

---

## Video Mode

Compress any video to MP4. Two distinct use cases:

### 1. Keep original dimensions, reduce filesize

```bash
gc vid hero.mov compress
```

The `compress` and `compress-best` presets preserve the source dimensions and aspect ratio — they simply optimise the encoding. `compress-best` uses H.265 for significantly smaller files but takes longer to encode.

### 2. Cap width + compress

```bash
gc vid demo.mov social
```

Resizing presets (`web`, `social`, `showcase`, `lightweight`) cap the output at their max width. Sources already narrower than the cap are passed through at their original size — they are never upscaled.

Output:

```
  Compressing demo.mov...

  Mode      vid
  Preset    social
  Width     max 1080px
  CRF       28
  Codec     H.265 (HEVC)
  Audio     128k

  Generating MP4...
  Done → demo-social.mp4
```

### Video Presets

| Preset           | Max Width    | CRF | Codec | Best for                              |
| ---------------- | ------------ | --- | ----- | ------------------------------------- |
| `compress`       | original     | 28  | H.265 | Reduce filesize, keep dimensions      |
| `compress-best`  | original     | 28  | H.265 | Maximum compression, keep dimensions  |
| `web`            | original     | 26  | H.265 | Web embedding, keep dimensions        |
| `social`         | 1080px       | 28  | H.265 | Social media posts                    |
| `showcase`       | 1920px       | 22  | H.265 | High-quality portfolio and demos      |
| `lightweight`    | 1280px       | 32  | H.265 | Email and document attachments        |

All video presets automatically apply:
- H.265 (HEVC) encoding — roughly 50% smaller files than H.264 at the same visual quality
- `yuv420p` pixel format — broad browser and social compatibility
- `faststart` — progressive streaming for web
- `hvc1` tag — QuickTime and Apple device compatibility

> **compress-best** uses the `slow` FFmpeg encoder preset for maximum compression. Encoding is 3–4× slower than other presets. The CLI will warn you and show a spinner so you know it's running.

### Video Overrides

```bash
# Width — overrides the max width cap
gc vid demo.mov social -w 720
gc vid demo.mov social -w 1/2
gc vid demo.mov social -w 2x

# Quality
gc vid demo.mov social --crf 24

# Encoder speed (ultrafast → veryslow)
gc vid demo.mov social --preset slow

# FPS
gc vid demo.mov social --fps 30

# Audio bitrate
gc vid demo.mov social --audio 192k

# Codec
gc vid demo.mov social --codec libx265

# Custom output filename
gc vid demo.mov social -o my-output.mp4
```

### Video Batch Mode

Compress every video in the current directory to MP4.

```bash
gc vid batch social
gc vid batch compress
gc vid batch compress-best
gc vid batch social --crf 24
```

Outputs are saved to `Outputs vid-{preset}/`.

Add `--all` to also recurse into subdirectories:

```bash
gc vid batch social --all
gc vid batch compress --all
```

---

## Image Mode

Compress or convert images using [sharp](https://sharp.pixelplumbing.com/) (libvips + mozjpeg).

```bash
gc img <input> <preset>
```

Example:

```bash
gc img photo.jpg webp
```

Output:

```
  Compressing photo.jpg...

  Mode      img
  Preset    webp
  Width     original dimensions
  Format    webp
  Quality   80

  Generating image...
  Done → photo-webp.webp
```

### Image Presets

| Preset      | Width      | Format         | Quality | Best for                              |
| ----------- | ---------- | -------------- | ------- | ------------------------------------- |
| `compress`  | original   | inherit        | 80      | Compress in place, keep format        |
| `webp`      | original   | WebP           | 80      | Web images, great compression         |
| `avif`      | original   | AVIF           | 50      | Best compression, modern browsers     |
| `social`    | 1080px     | JPEG           | 85      | Social media posts                    |
| `thumbnail` | 400px      | JPEG           | 80      | Thumbnails and previews               |

### Image Overrides

```bash
# Width
gc img photo.jpg social -w 720       # absolute pixels
gc img photo.jpg social -w 1/2       # fraction of preset width
gc img photo.jpg social -w 2x        # multiplier

# Quality
gc img photo.jpg webp -q 60

# Format — convert to a different format
gc img photo.png compress --format webp
gc img photo.jpg compress --format avif

# Custom output filename
gc img photo.jpg webp -o out/hero.webp
```

### Image Batch Mode

Compress every image in the current directory.

```bash
gc img batch webp
gc img batch compress --format avif
gc img batch social -w 720
```

Outputs are saved to `Outputs img-{preset}/`.

Add `--all` to also recurse into subdirectories:

```bash
gc img batch webp --all
gc img batch compress --all --format avif
```

---

## Output Filenames

**GIF:** `{input-name}-{preset}.gif` — e.g. `demo-medium.gif`

**Video:** `{input-name}-{preset}.mp4` — e.g. `demo-social.mp4`

**Image:** `{input-name}-{preset}.{ext}` — e.g. `photo-webp.webp`, `photo-compress.jpg`

When `-w` is used, the resolved pixel width is appended: `photo-social-720px.jpg`

Files are saved in the same directory as the input. Use `-o` to specify a custom path (single-file mode only).

---

## Utility Commands

```bash
gc help            Show full help with all commands, flags, and presets
gc preset list     List all presets with settings
```
