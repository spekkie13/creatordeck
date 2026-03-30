import Link from "next/link"

import type { AnalyticsSession } from "@/services"

import { CHART_COLORS } from "@/lib/chart-config"
import { formatDateShort, formatDuration } from "@/lib/format"

export function SessionsTable({ sessions }: { sessions: AnalyticsSession[] }) {
    if (sessions.length === 0) {
        return (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
                No sessions recorded yet. Sessions are tracked automatically once your Twitch EventSub subscriptions are registered.
            </div>
        )
    }

    return (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
            {sessions.map(s => (
                <div key={s.id} className="px-6 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                            {formatDateShort(s.startedAt)}
                            <span className="text-zinc-400 dark:text-zinc-500 font-normal ml-2 tabular-nums">
                {new Date(s.startedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                                {" – "}
                                {s.endedAt
                                    ? new Date(s.endedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                                    : "ongoing"}
                                {" · "}
                                {formatDuration(s.durationMinutes, "Ongoing")}
              </span>
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 flex items-center gap-3">
                            {s.summary.follows > 0  && <span><span style={{ color: CHART_COLORS.follows  }}>♥</span> {s.summary.follows} follows</span>}
                            {s.summary.subs > 0     && <span><span style={{ color: CHART_COLORS.subs     }}>★</span> {s.summary.subs} subs</span>}
                            {s.summary.bits > 0     && <span><span style={{ color: CHART_COLORS.bits     }}>◆</span> {s.summary.bits.toLocaleString()} bits</span>}
                            {s.summary.raids > 0    && <span><span style={{ color: CHART_COLORS.raids    }}>▶</span> {s.summary.raids.toLocaleString()} viewers raided</span>}
                            {s.summary.follows === 0 && s.summary.subs === 0 && s.summary.bits === 0 && s.summary.raids === 0 && (
                                <span className="italic">No events</span>
                            )}
                        </p>
                    </div>
                    <Link
                        href={`/analytics/${s.id}`}
                        className="text-xs text-teal-500 hover:text-teal-400 transition-colors shrink-0"
                    >
                        View →
                    </Link>
                </div>
            ))}
        </div>
    )
}
