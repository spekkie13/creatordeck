import {getServerSession, Session} from "next-auth"
import {redirect} from "next/navigation"

import {authOptions} from "@/lib/auth"
import {hasPro} from "@/lib/require-pro"
import {formatDateLong} from "@/lib/format"

import {entitlementRepository} from "@/repositories"

import {AppHeader} from "@/app/dashboard/app-header"
import {PricingCards} from "./pricing-cards"

export default async function BillingPage() {
    const session: Session | null = await getServerSession(authOptions)
    if (!session) redirect("/")

    const [isPro, entitlement] = await Promise.all([
        hasPro(session.userId),
        entitlementRepository.getByUserId(session.userId),
    ])
    const hasSubscription = !!entitlement?.polarSubscriptionId

    // Trial status copy: local state has trialEndsAt but not Polar's
    // cancel-at-period-end (trial-cancel keeps status "trialing" — Gate 1 note),
    // so the copy states the end date without promising renewal or expiry.
    const trialEndsAt =
        entitlement?.status === "trialing" && entitlement.trialEndsAt && entitlement.trialEndsAt.getTime() > Date.now()
            ? entitlement.trialEndsAt
            : null

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <AppHeader displayName={session.displayName}/>

            <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

                <div className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight">Billing & Plans</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        You are currently on the <span
                        className="font-medium text-zinc-700 dark:text-zinc-300">{isPro ? "Pro" : "Free"}</span> plan.
                        {trialEndsAt && (
                            <span className="ml-1">
                                Your free trial ends {formatDateLong(trialEndsAt)}.
                            </span>
                        )}
                    </p>
                </div>

                <PricingCards
                    isPro={isPro}
                    hasSubscription={hasSubscription}
                    waitlistMode={false}
                />

                <p className="text-xs text-center text-zinc-400 dark:text-zinc-600">
                    Prices in EUR. Billed via Polar (merchant of record). Cancel anytime.
                </p>

            </main>
        </div>
    )
}
