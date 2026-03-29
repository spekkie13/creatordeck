type Props = {
  /** "sm" = inline header wordmark, "lg" = stacked landing page hero */
  size?: "sm" | "lg"
}

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 15" fill="currentColor" className={className} aria-hidden>
      <rect x="0" y="0"  width="20" height="4" rx="2" />
      <rect x="0" y="5.5" width="13" height="4" rx="2" opacity="0.65" />
      <rect x="0" y="11" width="7"  height="4" rx="2" opacity="0.35" />
    </svg>
  )
}

export function CreatorDeckLogo({ size = "sm" }: Props) {
  if (size === "lg") {
    return (
      <div className="flex flex-col items-center gap-3">
        <Mark className="w-12 h-auto text-purple-500" />
        <span className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Creator<span className="text-purple-500">Deck</span>
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5">
      <Mark className="w-5 h-auto text-purple-500" />
      <span className="text-xl font-bold">
        Creator<span className="text-purple-500">Deck</span>
      </span>
    </div>
  )
}
