/**
 * ScrollScrubVideo — Framer Code Component
 *
 * Maps native page-scroll progress to HTML video currentTime and displays
 * connected Framer scene components over the media.
 *
 * Author: Yurii Tarasov — https://tarasovs.me/
 * Demo: https://scrollscrubvideo.framer.website/
 * License: MIT
 */

import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface ResponsiveImageValue {
    src?: string
    srcSet?: string
    alt?: string
}

type ResponsiveImageInput = ResponsiveImageValue | string

interface Props {
    clip?: string
    poster?: ResponsiveImageInput
    mobileClip?: string
    mobilePoster?: ResponsiveImageInput
    scrollHeightVh: number
    smoothing: number
    objectPosition: string
    scenes?: ReactNode[]
    sceneTransition: number
    sceneOffset: number
    style?: CSSProperties
}

const clamp = (value: number, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value))

const smoothstep = (value: number) => value * value * (3 - 2 * value)

const normalizeImage = (
    value?: ResponsiveImageInput
): ResponsiveImageValue | undefined => {
    if (!value) return undefined
    return typeof value === "string" ? { src: value } : value
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 1800
 */
export default function ScrollScrubVideo({
    clip,
    poster,
    mobileClip,
    mobilePoster,
    scrollHeightVh = 300,
    smoothing = 0.2,
    objectPosition = "50% 50%",
    scenes = [],
    sceneTransition = 0.22,
    sceneOffset = 36,
    style,
}: Props) {
    const bandRef = useRef<HTMLDivElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const sceneRefs = useRef<Array<HTMLDivElement | null>>([])
    const onCanvas = RenderTarget.current() === RenderTarget.canvas

    const [activeSource, setActiveSource] = useState<string | undefined>(clip)
    const [readySource, setReadySource] = useState<string | null>(null)
    const [paintedSource, setPaintedSource] = useState<string | null>(null)

    const sceneCount = scenes.length
    const mediaReady = Boolean(activeSource && readySource === activeSource)
    const mediaPainted = Boolean(activeSource && paintedSource === activeSource)

    const posterValue = normalizeImage(poster)
    const explicitMobilePoster = normalizeImage(mobilePoster)
    const posterSrc = posterValue?.src
    const mobilePosterValue = explicitMobilePoster?.src
        ? explicitMobilePoster
        : posterValue

    // Resolve the desktop/mobile file without relying on a render-time window.
    useEffect(() => {
        if (onCanvas) {
            setActiveSource(clip)
            return
        }

        const coarsePointer = window.matchMedia(
            "(hover: none) and (pointer: coarse)"
        )
        const narrowScreen = window.matchMedia("(max-width: 860px)")
        const resolveSource = () =>
            (coarsePointer.matches || narrowScreen.matches) && mobileClip
                ? mobileClip
                : clip

        const updateSource = () => {
            const nextSource = resolveSource()
            setActiveSource((currentSource) =>
                currentSource === nextSource ? currentSource : nextSource
            )
        }

        updateSource()
        coarsePointer.addEventListener("change", updateSource)
        narrowScreen.addEventListener("change", updateSource)

        return () => {
            coarsePointer.removeEventListener("change", updateSource)
            narrowScreen.removeEventListener("change", updateSource)
        }
    }, [clip, mobileClip, onCanvas])

    // React media events can be missed when Framer/browser cache completes the
    // video before hydration attaches the handlers. Native listeners plus an
    // immediate readyState check make readiness deterministic in both cases.
    useEffect(() => {
        if (onCanvas || !activeSource) return

        const element = videoRef.current
        if (!element) return

        let disposed = false
        const ownsElement = () =>
            !disposed && videoRef.current === element

        const markMetadataReady = () => {
            if (!ownsElement()) return

            if (
                element.readyState >= HTMLMediaElement.HAVE_METADATA &&
                Number.isFinite(element.duration) &&
                element.duration > 0
            ) {
                setReadySource(activeSource)
            }
        }

        const markFrameReady = () => {
            if (!ownsElement()) return

            markMetadataReady()
            if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                setPaintedSource(activeSource)
            }
        }

        const markMediaError = () => {
            if (!ownsElement()) return
            setReadySource(null)
            setPaintedSource(null)
        }

        // Prevent readiness from a previous desktop/mobile element being reused
        // if the same source is selected again later.
        setReadySource(null)
        setPaintedSource(null)

        element.addEventListener("loadedmetadata", markMetadataReady)
        element.addEventListener("durationchange", markMetadataReady)
        element.addEventListener("loadeddata", markFrameReady)
        element.addEventListener("canplay", markFrameReady)
        element.addEventListener("seeked", markFrameReady)
        element.addEventListener("error", markMediaError)

        // The crucial cache-race fix: events may already have fired.
        markMetadataReady()
        markFrameReady()

        return () => {
            disposed = true
            element.removeEventListener("loadedmetadata", markMetadataReady)
            element.removeEventListener("durationchange", markMetadataReady)
            element.removeEventListener("loadeddata", markFrameReady)
            element.removeEventListener("canplay", markFrameReady)
            element.removeEventListener("seeked", markFrameReady)
            element.removeEventListener("error", markMediaError)
        }
    }, [activeSource, onCanvas])

    // Keep iOS media unlocking attached until a real video element accepts it.
    useEffect(() => {
        if (onCanvas || !activeSource) return

        const coarsePointer = window.matchMedia(
            "(hover: none) and (pointer: coarse)"
        )
        const narrowScreen = window.matchMedia("(max-width: 860px)")
        if (!coarsePointer.matches && !narrowScreen.matches) return

        let disposed = false
        let unlocked = false
        let inFlight = false

        const removeListeners = () => {
            window.removeEventListener("pointerdown", unlock)
            window.removeEventListener("touchstart", unlock)
        }

        async function unlock() {
            const element = videoRef.current
            if (disposed || unlocked || inFlight || !element) return

            inFlight = true
            try {
                await element.play()
                element.pause()
                if (disposed || videoRef.current !== element) return
                unlocked = true
                removeListeners()
            } catch {
                // A later real gesture can retry.
            } finally {
                inFlight = false
            }
        }

        window.addEventListener("pointerdown", unlock, { passive: true })
        window.addEventListener("touchstart", unlock, { passive: true })

        return () => {
            disposed = true
            removeListeners()
        }
    }, [activeSource, onCanvas])

    // Drive both the video time and the scene overlays from one progress value.
    useEffect(() => {
        if (onCanvas) return

        const band = bandRef.current
        if (!band) return

        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        )
        const coarsePointer = window.matchMedia(
            "(hover: none) and (pointer: coarse)"
        )

        let disposed = false
        let rafId = 0
        let running = false
        let lastFrameTime = 0
        let current = 0
        let target = 0
        let lastWidth = window.innerWidth

        const updateScenes = (progress: number) => {
            if (sceneCount === 0) return

            const normalized = clamp(progress)
            const stagePosition = normalized * sceneCount
            const activeIndex = Math.min(
                Math.floor(stagePosition),
                sceneCount - 1
            )
            const localProgress = stagePosition - activeIndex
            const fadeWindow = clamp(sceneTransition, 0.05, 0.45)
            const transitionProgress =
                activeIndex === sceneCount - 1
                    ? 0
                    : smoothstep(
                          clamp(
                              (localProgress - (1 - fadeWindow)) / fadeWindow
                          )
                      )

            for (let index = 0; index < sceneCount; index += 1) {
                const node = sceneRefs.current[index]
                if (!node) continue

                let opacity = 0
                let translateY = sceneOffset

                if (index === activeIndex) {
                    opacity = 1 - transitionProgress
                    translateY = -sceneOffset * transitionProgress
                } else if (index === activeIndex + 1) {
                    opacity = transitionProgress
                    translateY = sceneOffset * (1 - transitionProgress)
                }

                node.style.opacity = `${opacity}`
                node.style.transform = `translate3d(0, ${translateY}px, 0)`
                node.style.pointerEvents = opacity > 0.5 ? "auto" : "none"
                node.setAttribute(
                    "aria-hidden",
                    opacity > 0.001 ? "false" : "true"
                )
            }
        }

        const measure = () => {
            const rect = band.getBoundingClientRect()
            const viewport = window.innerHeight
            const stickyDistance = Math.max(rect.height - viewport, 1)
            target = clamp(-rect.top / stickyDistance)

            return rect.top < viewport * 1.5 && rect.bottom > -viewport * 1.5
        }

        const frame = (timestamp: number) => {
            if (disposed) return

            const near = measure()
            const elapsed = lastFrameTime
                ? Math.min(timestamp - lastFrameTime, 100)
                : 1000 / 60
            lastFrameTime = timestamp

            const baseSmoothing = clamp(smoothing, 0.02, 1)
            const smoothingForFrame =
                1 - Math.pow(1 - baseSmoothing, elapsed / (1000 / 60))
            current += (target - current) * smoothingForFrame
            updateScenes(current)

            const video = videoRef.current
            if (
                !reducedMotion.matches &&
                video &&
                mediaReady &&
                !video.seeking
            ) {
                const duration = video.duration
                if (Number.isFinite(duration) && duration > 0) {
                    const seekTo = clamp(current, 0, 0.999) * duration
                    const threshold = coarsePointer.matches ? 0.02 : 0.008
                    if (Math.abs(video.currentTime - seekTo) > threshold) {
                        try {
                            video.currentTime = seekTo
                        } catch {
                            // Metadata and finite-duration checks handle normal cases.
                        }
                    }
                }
            }

            if (near || Math.abs(target - current) > 0.001) {
                rafId = window.requestAnimationFrame(frame)
            } else {
                running = false
                lastFrameTime = 0
            }
        }

        const start = () => {
            if (running || disposed) return
            running = true
            lastFrameTime = 0
            rafId = window.requestAnimationFrame(frame)
        }

        const onScroll = () => start()
        const onResize = () => {
            if (coarsePointer.matches && window.innerWidth === lastWidth) return
            lastWidth = window.innerWidth
            start()
        }

        // Start at the page's real scroll position. This avoids briefly showing
        // frame/scene zero after a reload or back-navigation into the section.
        measure()
        current = target
        updateScenes(current)
        start()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onResize)
        window.addEventListener("orientationchange", onResize)

        return () => {
            disposed = true
            window.cancelAnimationFrame(rafId)
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onResize)
            window.removeEventListener("orientationchange", onResize)
        }
    }, [
        activeSource,
        mediaReady,
        onCanvas,
        sceneCount,
        sceneOffset,
        sceneTransition,
        scrollHeightVh,
        smoothing,
    ])

    return (
        <div
            ref={bandRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: `${scrollHeightVh}vh`,
                background: "#130F24",
            }}
        >
            <div
                style={{
                    position: "sticky",
                    top: 0,
                    width: "100%",
                    height: "100vh",
                    overflow: "hidden",
                    background: "#130F24",
                }}
            >
                <div
                    className="scrub-media"
                    style={{ position: "absolute", inset: 0, zIndex: 0 }}
                    aria-hidden="true"
                >
                    {posterSrc ? (
                        <picture>
                            {mobilePosterValue?.src && (
                                <source
                                    media="(max-width: 860px), (hover: none) and (pointer: coarse)"
                                    srcSet={
                                        mobilePosterValue.srcSet ||
                                        mobilePosterValue.src
                                    }
                                />
                            )}
                            <img
                                src={posterSrc}
                                srcSet={posterValue?.srcSet}
                                alt=""
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    objectPosition,
                                }}
                            />
                        </picture>
                    ) : onCanvas ? (
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "grid",
                                placeItems: "center",
                                color: "#B8B0D4",
                                font: "500 14px/1.4 Inter, sans-serif",
                            }}
                        >
                            Select a poster and video in Properties
                        </div>
                    ) : null}

                    {!onCanvas && activeSource && (
                        <video
                            key={activeSource}
                            ref={videoRef}
                            src={activeSource}
                            poster={posterSrc}
                            muted
                            playsInline
                            preload="auto"
                            aria-hidden="true"
                            onLoadedMetadata={() =>
                                setReadySource(activeSource)
                            }
                            onLoadedData={() =>
                                setPaintedSource(activeSource)
                            }
                            onSeeked={() => setPaintedSource(activeSource)}
                            onError={() => {
                                setReadySource(null)
                                setPaintedSource(null)
                            }}
                            style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                objectPosition,
                                opacity: mediaPainted ? 1 : 0,
                                transition: "opacity 240ms ease",
                            }}
                        />
                    )}
                </div>

                {sceneCount > 0 && (
                    <div
                        className="scrub-scenes"
                        style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 2,
                            pointerEvents: "none",
                        }}
                    >
                        {scenes.map((scene, index) => (
                            <div
                                key={index}
                                ref={(node) => {
                                    sceneRefs.current[index] = node
                                }}
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: index === 0 ? 1 : 0,
                                    transform: `translate3d(0, ${
                                        index === 0 ? 0 : sceneOffset
                                    }px, 0)`,
                                    pointerEvents:
                                        index === 0 ? "auto" : "none",
                                    willChange: "opacity, transform",
                                }}
                                aria-hidden={index === 0 ? "false" : "true"}
                            >
                                {scene}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

ScrollScrubVideo.defaultProps = {
    scrollHeightVh: 300,
    smoothing: 0.2,
    objectPosition: "50% 50%",
    sceneTransition: 0.22,
    sceneOffset: 36,
}

addPropertyControls(ScrollScrubVideo, {
    scenes: {
        type: ControlType.Array,
        title: "Scenes",
        control: {
            type: ControlType.ComponentInstance,
        },
        maxCount: 12,
        description:
            "Connect Framer components in display order. Each scene gets an equal part of the scroll range.",
    },
    clip: {
        type: ControlType.File,
        allowedFileTypes: ["mp4", "webm"],
        title: "Clip",
    },
    poster: {
        type: ControlType.ResponsiveImage,
        title: "Poster",
    },
    mobileClip: {
        type: ControlType.File,
        allowedFileTypes: ["mp4", "webm"],
        title: "Mobile clip",
    },
    mobilePoster: {
        type: ControlType.ResponsiveImage,
        title: "Mobile poster",
    },
    scrollHeightVh: {
        type: ControlType.Number,
        title: "Scroll band",
        min: 120,
        max: 1000,
        step: 10,
        defaultValue: 300,
        unit: "vh",
        description:
            "Section height. For eight viewport-length scenes, use 900vh.",
    },
    smoothing: {
        type: ControlType.Number,
        title: "Smoothing",
        min: 0.05,
        max: 1,
        step: 0.05,
        defaultValue: 0.2,
        description: "Lower = heavier glide, higher = tighter to the scroll",
    },
    objectPosition: {
        type: ControlType.String,
        title: "Focal point",
        defaultValue: "50% 50%",
    },
    sceneTransition: {
        type: ControlType.Number,
        title: "Scene fade",
        min: 0.05,
        max: 0.45,
        step: 0.01,
        defaultValue: 0.22,
        description:
            "Portion at the end of each scene used for the crossfade.",
    },
    sceneOffset: {
        type: ControlType.Number,
        title: "Scene rise",
        min: 0,
        max: 120,
        step: 4,
        defaultValue: 36,
        unit: "px",
        description: "Vertical distance used by the incoming scene.",
    },
})
