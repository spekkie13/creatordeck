import type { Entitlement } from "@/types/entities"

/**
 * Pure entitlement logic (spec §3.2/§3.4). No I/O — unit-testable. The DB-backed
 * `hasPro` (src/lib/require-pro.ts) composes these with the owner flag.
 */

/** Pro is granted during a 3-day grace window after a payment goes past_due. */
export const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000

/** Free tier sees this many days of event history (spec §2); older is Pro.
 * Single source for the server clamp and UI copy. */
export const FREE_HISTORY_DAYS = 30
export const FREE_HISTORY_MS = FREE_HISTORY_DAYS * 24 * 60 * 60 * 1000

export type EffectiveStatus =
  | "none"
  | "trialing"
  | "active"
  | "canceled_active"
  | "past_due_grace"
  | "revoked"

/**
 * Collapse the stored status into its *effective* status at `now`. The only
 * computed transition is `past_due` → `past_due_grace` (still Pro) within the
 * grace window, then `revoked`.
 */
export function effectiveStatus(ent: Pick<Entitlement, "status" | "updatedAt">, now: Date = new Date()): EffectiveStatus {
  if (ent.status === "past_due") {
    const since = now.getTime() - ent.updatedAt.getTime()
    return since < PAST_DUE_GRACE_MS ? "past_due_grace" : "revoked"
  }
  return ent.status
}

const PRO_STATUSES: ReadonlySet<EffectiveStatus> = new Set<EffectiveStatus>([
  "active",
  "canceled_active",
  "past_due_grace",
])

/**
 * Does this entitlement grant Pro at `now`? Trial (unexpired `trialEndsAt`) wins
 * regardless of status; otherwise the effective status must be an active-Pro one.
 * The owner bypass is applied by the caller, not here.
 *
 * Trials run off `trialEndsAt` (a real expiry), NOT the stored `trialing` status
 * — so `trialing` is deliberately absent from the Pro statuses below, avoiding a
 * never-expiring trial. Our model uses a local 14-day trial set at signup. If
 * Polar-side trials are enabled at Gate 1, map the Polar trial end into
 * `trialEndsAt` in the webhook handler so it flows through this same gate.
 */
export function hasProFromEntitlement(ent: Entitlement | null, now: Date = new Date()): boolean {
  if (!ent) return false
  if (ent.trialEndsAt && ent.trialEndsAt.getTime() > now.getTime()) return true
  return PRO_STATUSES.has(effectiveStatus(ent, now))
}
