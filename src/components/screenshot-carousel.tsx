"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"

const SLIDES = [
  {
    src: "/screenshots/dashboard.png",
    alt: "Dashboard — live event feed, goals, and audience stats at a glance",
    url: "creatordeck.app/dashboard",
    label: "Dashboard",
  },
  {
    src: "/screenshots/events.png",
    alt: "Event history — every support event from Twitch and YouTube in one list",
    url: "creatordeck.app/events",
    label: "Event History",
  },
  {
    src: "/screenshots/events-filtered.png",
    alt: "Event history filtered by type and sorted by amount",
    url: "creatordeck.app/events",
    label: "Filters & Sorting",
  },
  {
    src: "/screenshots/event-detail.png",
    alt: "Event detail modal — full context on every support event",
    url: "creatordeck.app/events",
    label: "Event Detail",
  },
  {
    src: "/screenshots/connections.png",
    alt: "Connections — Twitch and YouTube linked and active",
    url: "creatordeck.app/connections",
    label: "Connections",
  },
]

const AUTOPLAY_MS = 4500

export function ScreenshotCarousel() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const advance = useCallback(() => {
    setActive(i => (i + 1) % SLIDES.length)
  }, [])

  const goTo = useCallback((i: number) => {
    setActive(i)
    // Reset the autoplay timer when manually navigating
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!paused) {
      timerRef.current = setTimeout(advance, AUTOPLAY_MS)
    }
  }, [advance, paused])

  useEffect(() => {
    if (paused) return
    timerRef.current = setTimeout(advance, AUTOPLAY_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [active, paused, advance])

  const prev = () => goTo((active - 1 + SLIDES.length) % SLIDES.length)
  const next = () => goTo((active + 1) % SLIDES.length)

  return (
    <div
      className="w-full max-w-5xl mx-auto px-6 select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Browser frame */}
      <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-zinc-200 dark:ring-zinc-800">

        {/* Browser chrome */}
        <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3">
          {/* Window controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <span className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          {/* URL bar */}
          <div className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-1 flex items-center justify-center min-w-0">
            <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
              {SLIDES[active].url}
            </span>
          </div>
          {/* Spacer to balance the window controls */}
          <div className="w-[54px] shrink-0" />
        </div>

        {/* Screenshot area */}
        <div className="relative bg-zinc-50 dark:bg-zinc-950 aspect-[16/10] overflow-hidden">
          {SLIDES.map((slide, i) => (
            <div
              key={slide.src}
              className={`absolute inset-0 transition-opacity duration-500 ${i === active ? "opacity-100 z-10" : "opacity-0 z-0"}`}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                className="object-cover object-top"
                priority={i === 0}
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            </div>
          ))}

          {/* Prev / next hit areas */}
          <button
            onClick={prev}
            aria-label="Previous screenshot"
            className="absolute left-0 inset-y-0 z-20 w-14 flex items-center justify-start pl-3 opacity-0 hover:opacity-100 transition-opacity group"
          >
            <span className="bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700 rounded-full w-8 h-8 flex items-center justify-center shadow text-zinc-600 dark:text-zinc-300 text-sm group-hover:scale-110 transition-transform">
              ‹
            </span>
          </button>
          <button
            onClick={next}
            aria-label="Next screenshot"
            className="absolute right-0 inset-y-0 z-20 w-14 flex items-center justify-end pr-3 opacity-0 hover:opacity-100 transition-opacity group"
          >
            <span className="bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700 rounded-full w-8 h-8 flex items-center justify-center shadow text-zinc-600 dark:text-zinc-300 text-sm group-hover:scale-110 transition-transform">
              ›
            </span>
          </button>
        </div>
      </div>

      {/* Dots + labels */}
      <div className="flex items-center justify-center gap-4 mt-5">
        {SLIDES.map((slide, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}: ${slide.label}`}
            className="flex flex-col items-center gap-1.5 group"
          >
            <span
              className={`block h-1 rounded-full transition-all duration-300 ${
                i === active
                  ? "bg-purple-500 w-6"
                  : "bg-zinc-300 dark:bg-zinc-700 w-2 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-500"
              }`}
            />
            <span className={`text-xs transition-colors duration-200 ${
              i === active
                ? "text-zinc-700 dark:text-zinc-300 font-medium"
                : "text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400"
            }`}>
              {slide.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}