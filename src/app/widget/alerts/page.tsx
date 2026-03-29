"use client"
import { useState, useEffect, useRef, useCallback, MutableRefObject } from "react"
import { ReadonlyURLSearchParams, useSearchParams } from "next/navigation"
import type { LiveEvent } from "@/types/events"
import { alertSubtitle } from "@/services/alerts.service";
import {ALERT_CONFIG, AlertsType} from "@/services/alerts.types";

export default function AlertsWidget() {
  const params: ReadonlyURLSearchParams = useSearchParams()
  const token: string = params.get("token") ?? ""
  const holdDuration: number = (parseInt(params.get("duration") ?? "6")) * 1000
  const fontSize: number = parseInt(params.get("fontSize") ?? "0") || 18

  const queueRef: MutableRefObject<LiveEvent[]> = useRef<LiveEvent[]>([])
  const busyRef: MutableRefObject<boolean> = useRef(false)
  const [current, setCurrent] = useState<LiveEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    document.documentElement.style.background = "transparent"
    document.body.style.background = "transparent"
  }, [])

  const showNext = useCallback(() => {
    if (busyRef.current || queueRef.current.length === 0) return
    const next: LiveEvent = queueRef.current.shift()!
    busyRef.current = true
    setCurrent(next)
    setVisible(false)
    setTimeout(() => setVisible(true), 50)
  }, [])

  // SSE connection
  useEffect(() => {
    if (!token) return
    const es = new EventSource(`/api/widget/events/stream?token=${token}`)
    es.onmessage = (e: MessageEvent) => {
      const incoming: LiveEvent[] = JSON.parse(e.data as string)
      queueRef.current.push(...incoming)
      if (!busyRef.current) showNext()
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [token, showNext])

  // Auto-dismiss after hold duration, then show next
  useEffect(() => {
    if (!visible || !current) return
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrent(null)
        busyRef.current = false
        showNext()
      }, 500)
    }, holdDuration)
    return () => clearTimeout(t)
  }, [visible, current, holdDuration, showNext])

  if (!current) return null

  const config: AlertsType = ALERT_CONFIG.find(c => c.name === current.type) ?? { name: current.type, label: current.type.toUpperCase(), color: '#6B7280' };
  const subtitle: string | null = alertSubtitle(current)

  return (
    <div className="fixed inset-0 flex items-end justify-center p-6 pointer-events-none select-none">
      <div
        style={{
          transform: visible ? "translateY(0)" : "translateY(2rem)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease",
          border: `1px solid ${config.color}`,
          boxShadow: `0 0 32px ${config.color}55, 0 8px 32px rgba(0,0,0,0.5)`,
          fontFamily: "Inter, system-ui, sans-serif",
          minWidth: "300px",
          maxWidth: "420px",
        }}
        className="relative rounded-2xl overflow-hidden"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

        {/* Content */}
        <div className="relative px-6 py-5 space-y-1.5">

          {/* Type label row */}
          <div className="flex items-center justify-between gap-3">
            <span
              className="font-bold tracking-widest uppercase"
              style={{ color: config.color, fontSize: `${Math.round(fontSize * 0.65)}px` }}
            >
              {config.label}
            </span>
            {current.isReplay && (
              <span
                className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded shrink-0"
                style={{ color: config.color, border: `1px solid ${config.color}66` }}
              >
                REPLAY
              </span>
            )}
          </div>

          {/* Username */}
          <p
            className="font-bold leading-tight text-white"
            style={{
              fontSize: `${Math.round(fontSize * 1.4)}px`,
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {current.fromUser}
          </p>

          {/* Subtitle */}
          {subtitle && (
            <p
              className="font-medium"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: `${fontSize}px` }}
            >
              {subtitle}
            </p>
          )}

          {/* Message */}
          {current.message && (
            <p
              className="leading-snug italic"
              style={{ color: "rgba(255,255,255,0.55)", fontSize: `${Math.round(fontSize * 0.85)}px` }}
            >
              &ldquo;{current.message}&rdquo;
            </p>
          )}
        </div>

        {/* Bottom accent bar */}
        <div className="h-1" style={{ background: config.color }} />
      </div>
    </div>
  )
}
