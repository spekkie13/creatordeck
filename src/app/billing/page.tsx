import {getServerSession, Session} from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppHeader } from "@/app/dashboard/app-header"
import { TIER_LABELS } from "@/lib/gates"
import { env } from "@/lib/env"
import { userRepository } from "@/repositories"
import { PricingCards } from "./pricing-cards"

export default async function BillingPage() {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) redirect("/")

  const stripeInfo = await userRepository.getStripeInfo(session.userId)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AppHeader displayName={session.displayName} />

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Billing & Plans</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            You are currently on the <span className="font-medium text-zinc-700 dark:text-zinc-300">{TIER_LABELS[session.tier]}</span> plan.
          </p>
        </div>

        <PricingCards
          currentTier={session.tier}
          hasSubscription={!!stripeInfo.stripeSubscriptionId}
          waitlistMode={true}
          prices={env.stripePrices}
        />

        <p className="text-xs text-center text-zinc-400 dark:text-zinc-600">
          Prices in USD. Billed via Stripe. Cancel anytime.
        </p>

      </main>
    </div>
  )
}
