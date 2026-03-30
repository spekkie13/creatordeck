"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

import { CreatorDeckLogo, ThemeToggle } from "@/components"

import { FeedbackButton } from "@/app/dashboard/feedback-button"

type Props = {
  displayName: string
}

const NAV_ITEMS = [
  { label: "Dashboard",     href: "/dashboard" },
  { label: "Live",          href: "/live" },
  { label: "Event History", href: "/events" },
  { label: "Analytics",     href: "/analytics" },
  { label: "Goals",         href: "/goals" },
  { label: "Billing",       href: "/billing" },
]

const SETTINGS_ITEMS = [
  { label: "Account",     href: "/account" },
  { label: "Connections", href: "/connections" },
  { label: "Features",    href: "/features" },
]

const PAGE_NAMES: Record<string, string> = {
  "/live":        "Live",
  "/events":      "Event History",
  "/goals":       "Goals",
  "/account":     "Account",
  "/connections": "Connections",
  "/features":    "Features",
}

export function AppHeader({ displayName }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const pageName = PAGE_NAMES[pathname]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <>
    <header className="sticky top-0 z-40 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
      <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
        <CreatorDeckLogo size="sm" />
      </Link>

      {pageName && (
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 absolute left-1/2 -translate-x-1/2">
          {pageName}
        </span>
      )}

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors px-2 py-2"
          >
            <span>{displayName}</span>
            <svg
              className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="py-1">
                {NAV_ITEMS.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-2 text-sm transition-colors ${
                      pathname === item.href
                        ? "text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 py-1">
                <p className="px-4 pt-1 pb-0.5 text-xs font-medium text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">
                  Settings
                </p>
                {SETTINGS_ITEMS.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-2 text-sm transition-colors ${
                      pathname === item.href
                        ? "text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 py-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    <FeedbackButton />
    </>
  )
}
