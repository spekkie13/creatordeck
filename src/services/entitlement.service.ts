import type { validateEvent } from "@polar-sh/sdk/webhooks"
import type { Subscription } from "@polar-sh/sdk/models/components/subscription"

import { entitlementRepository } from "@/repositories"

type PolarEvent = ReturnType<typeof validateEvent>

class EntitlementService {
  /**
   * Applies a verified Polar webhook to the local entitlement cache (spec §3.3).
   * Only subscription.* events mutate state; each carries the full subscription,
   * so we write absolute state and duplicates/out-of-order deliveries converge.
   * The user is resolved via `customer.externalId` (set to our user.id at
   * checkout), so no email-matching heuristics are needed.
   */
  async applyFromWebhook(event: PolarEvent): Promise<void> {
    if (!event.type.startsWith("subscription.")) return
    const sub = event.data as Subscription
    const userId = sub.customer?.externalId
    if (!userId) return // subscription not tied to one of our users; ignore

    await entitlementRepository.upsertFromWebhook({
      userId,
      plan: this.planFor(sub),
      status: this.statusFor(sub),
      polarCustomerId: sub.customerId ?? null,
      polarSubscriptionId: sub.id ?? null,
      currentPeriodEnd: sub.currentPeriodEnd ?? null,
      // Card-required trial (Polar-native): flow the subscription's trial end
      // through the local `trialEndsAt` gate. Only on trialing events, so
      // non-trial deliveries never clobber a previously-set trial end.
      ...(sub.status === "trialing" ? { trialEndsAt: sub.trialEnd } : {}),
    })
  }

  /** Map Polar's subscription status → our stored entitlement status. */
  private statusFor(sub: Subscription): "trialing" | "active" | "canceled_active" | "past_due" | "revoked" {
    switch (sub.status) {
      case "trialing":
        return "trialing"
      case "active":
        return sub.cancelAtPeriodEnd ? "canceled_active" : "active"
      case "past_due":
        return "past_due"
      // canceled / unpaid / incomplete / incomplete_expired → no Pro access
      default:
        return "revoked"
    }
  }

  private planFor(sub: Subscription): "free" | "pro" {
    return sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete" || sub.status === "incomplete_expired"
      ? "free"
      : "pro"
  }
}

export const entitlementService = new EntitlementService()
