import { useEffect } from "react"

import type { LiveEvent } from "@/types/events"

import { SUB_KIND_LABEL, TWITCH_TIER_LABEL, TYPE_BADGE, TYPE_ICON } from "@/lib/event-types"
import { formatAmount } from "@/lib/format"

import { TwitchLogo, YouTubeLogo } from "@/components/platform-logos"

import { DetailRow } from "@/app/events/detail-row"

export function EventDetailModal({ event, onClose }: { event: LiveEvent; onClose: () => void }) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    const title = event.type === "sub"
        ? SUB_KIND_LABEL[event.subKind ?? "new"] ?? "Subscription"
        : event.type === "bits" ? "Bits Cheered"
            : event.type === "superchat" ? "Super Chat"
                : "Membership"

    const formattedAmount = formatAmount(event.type, event.amount, event.currency)

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-sm shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        {event.platform === "youtube"
                            ? <YouTubeLogo className="w-3.5 h-3.5 text-[#FF0000]" />
                            : <TwitchLogo className="w-3.5 h-3.5 text-[#9146FF]" />
                        }
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_BADGE[event.type]}`}>
              {TYPE_ICON[event.type]} {event.type}
            </span>
                        <span className="text-sm font-semibold">{title}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-lg leading-none"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-0">
                    <DetailRow label="From" value={event.fromUser} />

                    {event.type === "sub" && (
                        <>
                            {event.tier && <DetailRow label="Tier" value={TWITCH_TIER_LABEL[event.tier] ?? event.tier} />}
                            {event.subKind === "resub" && event.cumulativeMonths != null && (
                                <DetailRow label="Total months" value={`${event.cumulativeMonths} months`} />
                            )}
                            {event.subKind === "community_gift" && event.amount != null && (
                                <DetailRow label="Gifted" value={`${event.amount} subscription${event.amount !== 1 ? "s" : ""}`} />
                            )}
                        </>
                    )}

                    {event.type === "bits" && formattedAmount && (
                        <DetailRow label="Amount" value={formattedAmount} />
                    )}

                    {event.type === "superchat" && formattedAmount && (
                        <DetailRow label="Amount" value={formattedAmount} />
                    )}

                    {event.type === "member" && (
                        <>
                            {event.amount != null && <DetailRow label="Member for" value={`${event.amount} month${event.amount !== 1 ? "s" : ""}`} />}
                            {event.levelName && <DetailRow label="Level" value={event.levelName} />}
                        </>
                    )}

                    {event.message && (
                        <div className="py-3 border-b border-zinc-100 dark:border-zinc-800">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">Message</p>
                            <p className="text-sm text-zinc-900 dark:text-white italic">&ldquo;{event.message}&rdquo;</p>
                        </div>
                    )}

                    <DetailRow label="Time" value={new Date(event.occurredAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} />
                </div>
            </div>
        </div>
    )
}
