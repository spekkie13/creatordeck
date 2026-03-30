"use client"
import { useEffect, useState } from "react"

const GOAL_TYPES = [
  { value: "twitch_sub",     label: "Twitch Subscribers" },
  { value: "twitch_follow",  label: "Twitch Followers" },
  { value: "youtube_member", label: "YouTube Members" },
]

const ALERT_WIDGET = { key: "alerts", label: "Alert Box" }

export function WidgetTokenSection({ appUrl }: { appUrl: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/widget-token")
      .then(r => r.json())
      .then(d => { setToken(d.token); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function regenerate() {
    setRegenerating(true)
    const res = await fetch("/api/widget-token", { method: "POST" })
    const d = await res.json()
    setToken(d.token)
    setRegenerating(false)
  }

  function widgetUrl(type: string) {
    return `${appUrl}/widget/goal?token=${token}&type=${type}`
  }

  function alertUrl() {
    return `${appUrl}/widget/alerts?token=${token}`
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return null

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">OBS Widgets</span>
        <button
          onClick={regenerate}
          disabled={regenerating}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {regenerating ? "Regenerating..." : "Regenerate token"}
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        Copy a widget URL and paste it into OBS as a Browser Source. Enable <strong>transparent background</strong> in the browser source settings.
        Add <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">&amp;bg=0.4</code> to the URL for a semi-transparent dark backdrop (0–1).
      </p>

      <div className="space-y-2">
        {/* Alert box */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600 dark:text-zinc-400 w-36 shrink-0">{ALERT_WIDGET.label}</span>
          <code className="flex-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded truncate">
            {token ? alertUrl() : "—"}
          </code>
          <button
            onClick={() => token && copy(alertUrl(), ALERT_WIDGET.key)}
            disabled={!token}
            className="shrink-0 text-xs text-teal-500 hover:text-teal-400 transition-colors disabled:opacity-40"
          >
            {copied === ALERT_WIDGET.key ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Goal overlays */}
        {GOAL_TYPES.map(t => (
          <div key={t.value} className="flex items-center gap-2">
            <span className="text-xs text-zinc-600 dark:text-zinc-400 w-36 shrink-0">{t.label}</span>
            <code className="flex-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded truncate">
              {token ? widgetUrl(t.value) : "—"}
            </code>
            <button
              onClick={() => token && copy(widgetUrl(t.value), t.value)}
              disabled={!token}
              className="shrink-0 text-xs text-teal-500 hover:text-teal-400 transition-colors disabled:opacity-40"
            >
              {copied === t.value ? "Copied!" : "Copy"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
