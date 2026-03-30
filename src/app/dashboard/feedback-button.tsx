"use client"

import { useState, useRef, useEffect } from "react"

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function submit() {
    if (!message.trim()) return
    setSending(true)
    await fetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ message }),
      headers: { "Content-Type": "application/json" },
    })
    setSending(false)
    setSent(true)
    setMessage("")
    setTimeout(() => { setSent(false); setOpen(false) }, 2000)
  }

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-medium">Send feedback</p>
            <p className="text-xs text-zinc-500 mt-0.5">What's working? What could be better?</p>
          </div>
          <div className="p-4 space-y-3">
            {sent ? (
              <p className="text-sm text-green-500 text-center py-2">Thanks for your feedback!</p>
            ) : (
              <>
                <textarea
                  autoFocus
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Your feedback..."
                  rows={4}
                  maxLength={2000}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-teal-500 text-zinc-900 dark:text-white placeholder-zinc-400"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{message.length}/2000</span>
                  <button
                    onClick={submit}
                    disabled={sending || !message.trim()}
                    className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-colors w-32"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Feedback
      </button>
    </div>
  )
}