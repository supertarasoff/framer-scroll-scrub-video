# Video encoding for scroll scrubbing

## Why keyframe spacing matters

When JavaScript assigns `video.currentTime`, the browser normally begins decoding from the nearest preceding keyframe. Long gaps between keyframes increase the amount of intermediate decoding required for each seek.

Use a keyframe approximately every **0.25–0.5 seconds** as a practical starting range.

```text
GOP frames = frame rate × target interval in seconds
```

| Frame rate | GOP | Approximate interval |
| --- | ---: | ---: |
| 24 fps | 6 | 0.25 s |
| 25 fps | 6 | 0.24 s |
| 30 fps | 8 | 0.27 s |
| 60 fps | 15 | 0.25 s |

## Desktop encode

This example preserves the source dimensions and creates a 24 fps H.264 MP4:

```bash
ffmpeg -i "input.mp4" \
  -an \
  -c:v libx264 \
  -profile:v high \
  -level:v 4.1 \
  -refs 3 \
  -pix_fmt yuv420p \
  -preset slow \
  -crf 22 \
  -r 24 \
  -g 6 \
  -keyint_min 6 \
  -sc_threshold 0 \
  -bf 0 \
  -movflags +faststart \
  "scroll-scrub-desktop-1080p.mp4"
```

## Mobile 720p encode

```bash
ffmpeg -i "input.mp4" \
  -an \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 \
  -profile:v high \
  -level:v 3.1 \
  -refs 3 \
  -pix_fmt yuv420p \
  -preset slow \
  -crf 24 \
  -r 24 \
  -g 6 \
  -keyint_min 6 \
  -sc_threshold 0 \
  -bf 0 \
  -movflags +faststart \
  "scroll-scrub-mobile-720p.mp4"
```

## Verify the keyframes

```bash
ffprobe -v error \
  -select_streams v:0 \
  -skip_frame nokey \
  -show_entries frame=best_effort_timestamp_time \
  -of csv=p=0 \
  "scroll-scrub-desktop-1080p.mp4"
```

For a 24 fps file with a six-frame GOP, the output should contain timestamps close to:

```text
0.000000
0.250000
0.500000
0.750000
1.000000
```

If only `0.000000` appears, the file still has only one keyframe at its beginning.

## Verify the output properties

```bash
ffprobe -v error \
  -select_streams v:0 \
  -show_entries stream=codec_name,profile,level,width,height,pix_fmt,r_frame_rate,duration,bit_rate,nb_frames \
  -of default=nw=1 \
  "scroll-scrub-desktop-1080p.mp4"
```

## What each relevant flag does

| Flag | Purpose |
| --- | --- |
| `-g 6` | Limits the GOP to six frames |
| `-keyint_min 6` | Requests a consistent minimum keyframe interval |
| `-sc_threshold 0` | Disables automatic scene-cut keyframes |
| `-bf 0` | Removes B-frames to simplify random seeking |
| `-movflags +faststart` | Moves MP4 metadata to the beginning of the file |
| `-pix_fmt yuv420p` | Maintains broad browser compatibility |
| `-an` | Removes audio from the decorative scroll-controlled clip |

Shorter GOPs are not automatically better. They can increase file size. Choose the smallest encode that still seeks cleanly on the slowest device the project supports.

