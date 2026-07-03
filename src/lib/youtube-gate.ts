import type { Session } from "next-auth"

/**
 * Interim YouTube feature gate.
 *
 * All YouTube functionality is Pro-gated (spec §Tier). Until the billing
 * workstream ships `requirePro`/`hasPro`, dogfooding is restricted to the owner
 * via `isAdmin` (plan Phase 3 item 2). This is the single swap point: when the
 * billing primitives land, replace the body with `hasPro(session)` — no call
 * site changes.
 *
 * Note: this gates the YouTube *feature* (connect-for-ingestion, chat, Super
 * Chats), NOT the Google *login* identity method, which stays open (Gate 0 D2).
 */
export function hasYouTubeAccess(session: Session | null): boolean {
  return !!session?.isAdmin
}
