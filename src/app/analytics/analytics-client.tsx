"use client"
import { useState, useCallback } from "react"
import { AppHeader } from "@/app/dashboard/app-header"
import { UpgradeModal } from "@/app/billing/upgrade-modal"
import type { AnalyticsOverview } from "@/services"
import {ChartTab, EventTypeKey, GATED_RANGES, RANGE_LABELS} from "@/constants/analytics";
import {AnalyticsClientProps} from "@/props/analytics-client.props";
import {TotalsGrid} from "@/app/analytics/TotalsGrid";
import {ActivityChart, RevenueChart} from "@/app/analytics/Charts";
import {SessionsTable} from "@/app/analytics/SessionsTable";
import type { Range } from "@/constants/analytics";

export function AnalyticsClient({
  initialData,
  initialRange,
  hasYouTube,
  displayName,
  tier,
  canSeeExtendedHistory,
}: AnalyticsClientProps) {
  const [range, setRange] = useState<Range>(initialRange)
  const [chartTab, setChartTab] = useState<ChartTab>("activity")
  const [data, setData] = useState<AnalyticsOverview>(initialData)
  const [loading, setLoading] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<Set<EventTypeKey>>(new Set())
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  void tier // available for future per-tier UI differences

  function toggleType(key: EventTypeKey) {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const fetchRange = useCallback(async (r: Range) => {
    if (GATED_RANGES.includes(r) && !canSeeExtendedHistory) {
      setUpgradeModalOpen(true)
      return
    }
    setRange(r)
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?range=${r}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [canSeeExtendedHistory])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AppHeader displayName={displayName} />

      {upgradeModalOpen && (
        <UpgradeModal
          requiredTier="tier1"
          featureName="extended analytics history"
          onClose={() => setUpgradeModalOpen(false)}
        />
      )}

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* Header + range selector */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg p-1">
            {(["7d", "30d", "90d"] as Range[]).map(r => {
              const locked = GATED_RANGES.includes(r) && !canSeeExtendedHistory
              return (
                <button
                  key={r}
                  onClick={() => fetchRange(r)}
                  disabled={loading}
                  title={locked ? "Upgrade to Tier 1 to unlock" : undefined}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    range === r
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : locked
                      ? "text-zinc-400 dark:text-zinc-600 cursor-pointer"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {locked && <span className="text-[10px]">🔒</span>}
                  {RANGE_LABELS[r]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Totals */}
        <div className={loading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
          <TotalsGrid totals={data.totals} hasYouTube={hasYouTube} selectedTypes={selectedTypes} onToggle={toggleType} />
        </div>

        {/* Chart */}
        <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden ${loading ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {chartTab === "activity" ? "Activity" : "Revenue"}
            </h2>
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg p-1">
              {(["activity", "revenue"] as ChartTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setChartTab(t)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors capitalize ${
                    chartTab === t
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-4">
            {chartTab === "activity"
              ? <ActivityChart data={data.byDay} selected={selectedTypes} />
              : <RevenueChart data={data.byDay} selected={selectedTypes} />
            }
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Stream Sessions</h2>
          </div>
          <SessionsTable sessions={data.sessions} />
        </div>

      </main>
    </div>
  )
}
