"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import type { ReadonlyURLSearchParams } from "next/navigation"

import { PLATFORM_COLOR } from "@/constants/colors"

import type { WidgetGoalData } from "@/services/widget-goal.types"

export default function GoalWidget() {
  const params: ReadonlyURLSearchParams = useSearchParams()
  const token: string = params.get("token") ?? ""
  const type: string = params.get("type") ?? "twitch_sub"
  const customLabel: string = params.get("label") ?? ""
  const barColor: string = params.get("color") ?? ""
  const fontSize: number = parseInt(params.get("fontSize") ?? "0") || 16
  const bgOpacity: number = Math.min(1, Math.max(0, parseFloat(params.get("bg") ?? "0")))

  const [data, setData] = useState<WidgetGoalData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty("background-color", "transparent", "important")
    document.body.style.setProperty("background-color", "transparent", "important")
  }, [])

  const poll = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/widget/goal?token=${token}&type=${type}`)
      if (!res.ok) { setError(true); return }
      setData(await res.json())
      setError(false)
    } catch {
      setError(true)
    }
  }, [token, type])

  useEffect(() => {
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [poll])

  if (!token || error) return null
  if (!data) return null

  const progress: number = Math.min((data.current / data.goal) * 100, 100)
  const label: string = customLabel || data.label
  const color: string = barColor || PLATFORM_COLOR[data.platform] || "#9146FF"

  return (
    <div
      className="p-4 select-none rounded-xl"
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize: `${fontSize}px`,
        background: bgOpacity > 0 ? `rgba(0,0,0,${bgOpacity})` : "transparent",
      }}
    >
      {/* Label + count */}
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <span
          className="font-semibold tracking-tight"
          style={{ fontSize: `${fontSize}px`, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {label}
        </span>
        <span
          className="font-bold tabular-nums"
          style={{ fontSize: `${Math.round(fontSize * 1.25)}px`, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {data.current.toLocaleString()} <span style={{ opacity: 0.6, fontWeight: 400 }}>/ {data.goal.toLocaleString()}</span>
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: `${Math.max(8, Math.round(fontSize * 0.6))}px`, background: "rgba(255,255,255,0.2)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%`, background: color, boxShadow: `0 0 8px ${color}88` }}
        />
      </div>

      {/* Percentage */}
      <div
        className="mt-1 text-right"
        style={{ fontSize: `${Math.round(fontSize * 0.75)}px`, color: "rgba(255,255,255,0.7)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
      >
        {progress.toFixed(1)}%
      </div>
    </div>
  )
}
