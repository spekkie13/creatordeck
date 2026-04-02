import type { LiveEventType } from "@/types/events"

export const TYPE_BADGE: Record<LiveEventType, string> = {
  sub:       "bg-purple-500/20 text-purple-400 border border-purple-500/40",
  follow:    "bg-blue-500/20 text-blue-400 border border-blue-500/40",
  bits:      "bg-yellow-500/20 text-yellow-500 border border-yellow-500/40",
  raid:      "bg-green-500/20 text-green-500 border border-green-500/40",
  superchat: "bg-red-500/20 text-red-400 border border-red-500/40",
  member:    "bg-orange-500/20 text-orange-400 border border-orange-500/40",
}

export const TYPE_ICON: Record<LiveEventType, string> = {
  sub:       "★",
  follow:    "♥",
  bits:      "◆",
  raid:      "▶",
  superchat: "💬",
  member:    "🎖",
}

/** Active filter pill style — slightly brighter than badge, used in filter toggles */
export const TYPE_FILTER_STYLE: Record<LiveEventType, string> = {
  sub:       "border-purple-500/40 text-purple-400 bg-purple-500/10",
  follow:    "border-blue-500/40 text-blue-400 bg-blue-500/10",
  bits:      "border-yellow-500/40 text-yellow-500 bg-yellow-500/10",
  raid:      "border-green-500/40 text-green-500 bg-green-500/10",
  superchat: "border-red-500/40 text-red-400 bg-red-500/10",
  member:    "border-orange-500/40 text-orange-400 bg-orange-500/10",
}

/** Filter button definitions for the event history page */
export const EVENT_TYPES: { value: LiveEventType; label: string; activeClass: string }[] = [
  { value: "sub",       label: "Subs",       activeClass: "bg-purple-500/20 text-purple-500 border-purple-500/40" },
  { value: "follow",    label: "Follows",    activeClass: "bg-blue-500/20 text-blue-500 border-blue-500/40" },
  { value: "bits",      label: "Bits",       activeClass: "bg-yellow-500/20 text-yellow-500 border-yellow-500/40" },
  { value: "raid",      label: "Raids",      activeClass: "bg-green-500/20 text-green-500 border-green-500/40" },
  { value: "superchat", label: "Superchats", activeClass: "bg-red-500/20 text-red-500 border-red-500/40" },
  { value: "member",    label: "Members",    activeClass: "bg-orange-500/20 text-orange-500 border-orange-500/40" },
]

export const TWITCH_TIER_LABEL: Record<string, string> = {
  "1000": "Tier 1",
  "2000": "Tier 2",
  "3000": "Tier 3",
}

export const SUB_KIND_LABEL: Record<string, string> = {
  new:            "New subscription",
  resub:          "Resubscription",
  community_gift: "Gift subscriptions",
}

export const MODAL_TYPES = new Set<LiveEventType>(["sub", "bits", "superchat", "member"])
