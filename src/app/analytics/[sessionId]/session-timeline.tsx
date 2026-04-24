"use client"

import { useState } from "react"

import type { LiveEvent, LiveEventType } from "@/types/events"

import { TYPE_BADGE, TYPE_ICON, TYPE_FILTER_STYLE } from "@/lib/event-types"
import { formatAmount, formatRelativeTime } from "@/lib/format"
import {SessionTimelineProps} from "@/props/session-timeline.props";

export function SessionTimeline({events, sessionStart, presentTypes}: SessionTimelineProps) {
  const [activeFilters, setActiveFilters] = useState<Set<LiveEventType>>(new Set())

  function toggleFilter(type: LiveEventType) {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const filtered: LiveEvent[] = activeFilters.size === 0
    ? events
    : events.filter(e => activeFilters.has(e.type))

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Event Timeline
          </h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {filtered.length}{activeFilters.size > 0 ? ` / ${events.length}` : ""} events
          </span>
        </div>

        {presentTypes.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {presentTypes.map(type => {
              const active: boolean = activeFilters.has(type)
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                    active
                      ? TYPE_FILTER_STYLE[type]
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
                >
                  {TYPE_ICON[type]} {type}
                </button>
              )
            })}
            {activeFilters.size > 0 && (
              <button
                onClick={() => setActiveFilters(new Set())}
                className="text-xs px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-zinc-500">
          No events match the selected filters.
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
          {filtered.map(event => (
            <div key={event.id} className="px-6 py-3 flex items-center gap-4">
              <span className="text-xs text-zinc-400 dark:text-zinc-600 tabular-nums w-16 shrink-0">
                {formatRelativeTime(sessionStart, event.occurredAt)}
              </span>

              <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${TYPE_BADGE[event.type]}`}>
                {TYPE_ICON[event.type]} {event.type}
              </span>

              <span className="flex-1 text-sm truncate">{event.fromUser}</span>

              {event.amount !== null && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400 shrink-0">
                  {formatAmount(event.type, event.amount, event.currency)}
                </span>
              )}

              <span className="text-xs text-zinc-300 dark:text-zinc-700 shrink-0 tabular-nums">
                {new Date(event.occurredAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
