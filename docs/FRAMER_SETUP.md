# Framer setup

## 1. Add the Code Component

1. Open the Framer project.
2. Select **Assets** in the left panel.
3. Open **Code** and choose **Create Code File**.
4. Name the file `ScrollScrubVideo.tsx`.
5. Replace the starter example with the contents of [`ScrollScrubVideo.tsx`](../ScrollScrubVideo.tsx).
6. Wait for Framer to finish building the component.

## 2. Place the component

1. Return to the page canvas.
2. Insert **ScrollScrubVideo** from Code Components.
3. Set its width to **Fill**.
4. Keep it in normal page flow.
5. Do not place it inside a short fixed-height parent or a parent that clips the sticky section.

The component creates its own height from the **Scroll band** property. The inner media viewport remains sticky for `100vh` while the outer section moves through the page.

## 3. Add media

Assign these properties:

- **Clip:** optimized desktop MP4 or WebM
- **Poster:** first meaningful static frame
- **Mobile clip:** optional lighter encode
- **Mobile poster:** optional narrow-screen crop
- **Focal point:** CSS-style `object-position`, such as `50% 50%`

The Framer canvas intentionally uses the poster instead of loading and scrubbing the video. Test the full interaction in Preview.

## 4. Build scene components

Create every overlay as a normal Framer component. It can contain a heading, description, label, CTA, or other Framer layers.

For every scene:

1. Use the same viewport-sized frame dimensions where practical.
2. Remove the frame's opaque background Fill.
3. Keep essential text as real Framer text rather than rendering it into the video.
4. Create separate instances on the page so they are available to the component-instance control.
5. Set those source instances to **Position: Absolute** so they do not create page-height blocks.

Select `ScrollScrubVideo`, open **Scenes**, and connect the scene instances in display order.

## 5. Set the scroll distance

The usable sticky scrub distance equals:

```text
scroll band height - one viewport
```

Useful starting values:

| Sequence | Scroll band |
| --- | --- |
| Simple short clip | `250vh–350vh` |
| Four full-screen scenes | About `500vh` |
| Eight full-screen scenes | About `900vh` |

The component divides normalized progress equally between all connected scenes. It does not count mouse-wheel gestures.

## 6. Tune transitions

- **Smoothing `0.20`:** balanced starting point
- Lower smoothing: heavier glide
- Higher smoothing: tighter scroll response
- **Scene fade `0.22`:** uses the final 22% of each scene for crossfade
- **Scene rise `36px`:** subtle vertical entrance

## 7. Test before publishing

Test all of the following:

- scroll from start to finish and back;
- reload while the section is halfway visible;
- desktop and narrow breakpoints;
- mobile Safari after the first touch;
- Chrome Android;
- reduced-motion mode;
- slow network conditions;
- the page with the video source temporarily removed.

## Common problems

### Scenes cannot be selected

Confirm that each scene is a Framer component instance, not a loose frame or text layer. Place an instance on the same page and then select it inside the `Scenes` array.

### The scene covers the media

Remove the scene's background Fill. Text and controls should sit over a transparent component frame.

### Large blank sections appear

The separate scene instances are participating in the page stack. Set those source instances to Position: Absolute. Do not set the main `ScrollScrubVideo` instance to Absolute.

### The video is not visible on Canvas

This is expected. Canvas uses a static poster state to keep editing predictable. Open Preview to test the video.

### Video stays transparent after loading

Use the current component file. It includes native media listeners and an immediate `readyState` check to handle cached files whose load events fire before React hydration completes.

