# Framer Scroll Scrub Video

A dependency-free Framer Code Component that maps native page-scroll progress to an HTML video's `currentTime` and displays connected Framer components as timed scene overlays.

[Live demo](https://scrollscrubvideo.framer.website/) · [Implementation guide](https://tarasovs.me/how-scroll-scrubbed-video-works-in-framer/)

![Scroll-scrubbed video in Framer with a glowing glass motion sculpture](https://tarasovs.me/wp-content/uploads/2026/09/scroll-progress-video1.webp)

## Features

- Native document scrolling and CSS sticky positioning
- Forward and reverse video scrubbing
- Framer component instances as scene overlays
- Desktop and mobile video sources
- Desktop and mobile poster images
- Cache-safe media readiness checks
- Poster-first loading without a white flash
- Guarded seeking and frame-rate-independent smoothing
- Coarse-pointer and mobile viewport handling
- iOS gesture-unlock fallback
- Reduced-motion static state
- No GSAP or other runtime dependency

## Install in Framer

1. Download [`ScrollScrubVideo.tsx`](./ScrollScrubVideo.tsx).
2. In Framer, open **Assets → Code → Create Code File**.
3. Name the file `ScrollScrubVideo.tsx`.
4. Remove the starter code and paste the complete component source.
5. Return to the canvas and insert **ScrollScrubVideo** from Code Components.
6. Set its width to **Fill** and keep the component in normal page flow.
7. Assign the desktop **Clip** and **Poster** in the Properties panel.
8. Add the optional **Mobile clip**, **Mobile poster**, and connected **Scenes**.
9. Test the interaction in Preview or on the published site. The Framer canvas intentionally displays a static poster state.

See [Framer setup](./docs/FRAMER_SETUP.md) for the complete scene-overlay workflow.

## Recommended starting settings

| Property | Starting value | Purpose |
| --- | --- | --- |
| Clip | Optimized H.264 MP4 | Main scroll-controlled video |
| Poster | First meaningful frame | Loading, canvas, failure and reduced-motion fallback |
| Mobile clip | Optional 720p encode | Lighter source for narrow/coarse-pointer devices |
| Mobile poster | Optional mobile crop | Protects the focal point on narrow screens |
| Scroll band | `250vh` | Simple short sequence |
| Scroll band | About `900vh` | Eight viewport-length text scenes |
| Smoothing | `0.20` | Balanced response and glide |
| Focal point | `50% 50%` | Equivalent to CSS `object-position` |
| Scene fade | `0.22` | Crossfade portion at the end of each scene |
| Scene rise | `36px` | Vertical offset for entering scenes |

## Prepare the video before uploading

Ordinary playback files can contain long gaps between keyframes. Scroll scrubbing repeatedly seeks to arbitrary times, so use a keyframe approximately every **0.25–0.5 seconds**.

For a 24 fps clip, start with a six-frame GOP:

```bash
ffmpeg -i "input.mp4" \
  -an \
  -c:v libx264 \
  -profile:v high \
  -level:v 4.1 \
  -pix_fmt yuv420p \
  -preset slow \
  -crf 22 \
  -r 24 \
  -g 6 \
  -keyint_min 6 \
  -sc_threshold 0 \
  -bf 0 \
  -movflags +faststart \
  "scroll-scrub-video.mp4"
```

Read [Video encoding](./docs/VIDEO_ENCODING.md) for desktop/mobile commands and keyframe verification.

## Scene overlays

The `Scenes` property accepts Framer component instances in display order. Each scene receives an equal part of the normalized scroll range.

For eight connected scenes:

- each scene owns 12.5% of the scroll range;
- a `900vh` scroll band provides roughly one viewport of travel per scene;
- one continuous clip avoids eight separate media requests and file-to-file jumps.

Remove opaque Fill colors from scene frames so the video remains visible below them. If the source scene instances are also placed on the page, set those instances to **Position: Absolute** so they do not add separate blocks to the page stack.

## Loading behavior

Version 1.0 combines declarative React media callbacks with native media listeners and an immediate `readyState` check. This closes a cache race where Framer or the browser can finish loading a cached video before React attaches `loadedmetadata` or `loadeddata`, leaving a ready video at `opacity: 0`.

The component also synchronizes its initial frame to the real page position after reload or back navigation.

## Accessibility

The video is decorative and hidden from assistive technology. When the visitor enables reduced motion, the scroll-linked seeking is disabled and the poster remains available as the static media state.

Do not put essential information only inside the video. Keep meaningful headings and descriptions in the connected scene components or surrounding page content.

## Testing checklist

- Fresh load at the beginning of the section
- Reload while positioned in the middle of the section
- Fast forward and reverse scrolling
- Desktop and mobile source switching around 860px
- iOS Safari after the first touch interaction
- Chrome on Android
- Reduced Motion enabled at operating-system level
- Failed or intentionally missing video source

## Troubleshooting

**The canvas only shows the poster**  
Expected behavior. Use Preview or the published page to test video scrubbing.

**The video is blank but the text scenes appear**  
Confirm that a poster and supported MP4/WebM clip are assigned. Use the current component version, which includes the cache-safe readiness fix.

**Scene text hides the video**  
Remove the scene frame's opaque Fill. The overlay component should have a transparent background.

**The page contains large empty blocks**  
Set the separate source scene instances to Position: Absolute. Keep `ScrollScrubVideo` itself in normal page flow.

**Seeking feels delayed or jumps**  
Re-encode the video with a short keyframe interval and verify the result with `ffprobe`.

## License

Released under the [MIT License](./LICENSE).

## Author

Created by [Yurii Tarasov](https://tarasovs.me/), Verified Framer Expert and founder of Tarasovs Digital Agency.

