"use client"
import { useState } from "react"

export function ApiKeyToggle({ apiKey }: { apiKey: string }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setVisible(v => !v)}
        className="text-sm text-teal-500 hover:text-teal-400 transition-colors"
      >
        {visible ? "Hide API key" : "Click to show API key"}
      </button>
      {visible && (
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-zinc-700 dark:text-zinc-300 font-mono bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg break-all">
            {apiKey}
          </code>
          <button
            onClick={copy}
            className="shrink-0 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors px-2 py-2"
          >
            {copied ? "✓" : "Copy"}
          </button>
        </div>
      )}
    </div>
  )
}
