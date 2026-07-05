"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

const CONFIRM_WORD = "DELETE"

export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/account/delete", { method: "POST" })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      // Data is gone — clear the session and return to the landing page.
      await signOut({ callbackUrl: "/" })
    } catch {
      setError("Something went wrong. Please try again, or email us to delete your account.")
      setBusy(false)
    }
  }

  function reset() {
    setConfirming(false)
    setText("")
    setError(null)
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-red-500 border border-red-200 dark:border-red-900/50 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
      >
        Delete account
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Type <span className="font-mono font-semibold text-red-500">{CONFIRM_WORD}</span> to permanently erase your
        account and all associated data. This cannot be undone.
      </p>
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={CONFIRM_WORD}
        disabled={busy}
        className="w-full max-w-xs text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-red-500/40"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={text !== CONFIRM_WORD || busy}
          className="text-sm text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "Deleting…" : "Permanently delete"}
        </button>
        <button
          onClick={reset}
          disabled={busy}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
