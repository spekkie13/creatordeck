import type { LiveEventType } from "@/types/events"

export function formatAmount(type: LiveEventType, amount: number | null, currency?: string | null): string | null {
  if (amount === null) return null
  if (type === "bits") return `${amount.toLocaleString()} bits`
  if (type === "raid") return `${amount.toLocaleString()} viewers`
  if (type === "member") return `${amount} mo.`
  if (type === "superchat") {
    return currency
      ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount)
      : `${amount}`
  }
  return null
}

export function formatDuration(minutes: number | null, fallback: string): string {
  if (minutes === null) return fallback;
  if (minutes < 60) return `${minutes}m`
  const h: number = Math.floor(minutes / 60)
  const m: number = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Short date only: "Jan 1" — for chart tooltips and session lists */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/** Date + time: "Jan 1, 12:00 PM" — for event history rows */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

/** M/D format for chart X-axis ticks */
export function formatAxisDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function formatSuperchatTotal(byCurrency: Record<string, number>): string {
  const entries = Object.entries(byCurrency)
  if (entries.length === 0) return "—"
  if (entries.length === 1) return formatCurrency(entries[0][1], entries[0][0])
  const [topCur, topAmt] = entries.sort((a, b) => b[1] - a[1])[0]
  return `${formatCurrency(topAmt, topCur)} +${entries.length - 1} more`
}

/** Compact number: 1.2K, 3.4M, etc. Returns "—" for null */
export function formatCount(n: number | null): string {
  if (n === null) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

/** Relative timestamp from session start: "+1:23:45" */
export function formatRelativeTime(sessionStart: string, eventTime: string): string {
  const diffMs = new Date(eventTime).getTime() - new Date(sessionStart).getTime()
  if (diffMs < 0) return "+0:00"
  const totalSecs = Math.floor(diffMs / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `+${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `+${m}:${String(s).padStart(2, "0")}`
}

export function formatUptime(startedAt: string) {
  const started = new Date(startedAt)
  const now = new Date()
  const mins: number = Math.floor((now.getTime() - started.getTime()) / 60000)
  const h: number = Math.floor(mins / 60)
  const m: number = mins % 60

  return `${h}h ${m}m`
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export function toDateInputValue(iso: string | null): string {
  if (!iso) return ""
  return iso.slice(0, 10)
}
