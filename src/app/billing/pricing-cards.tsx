"use client"

import { useState } from "react"

import type { PricingCardProps } from "@/props/pricing-card.props"
import { PLAN_FEATURES } from "@/constants/billing"
import type { BillingCycle } from "@/types/plan"
import { PRO_PRICING } from "@/types/plan"

import { WaitlistModal } from "@/app/billing/waitlist-modal"
import { Feature } from "@/app/billing/feature"
import { CurrentPlanBadge } from "@/app/billing/current-plan-badge"

export function PricingCards({ isPro, hasSubscription, waitlistMode, twitchLogin }: PricingCardProps) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly")
  const [showWaitlist, setShowWaitlist] = useState(false)

  function handleUpgrade() {
    if (waitlistMode) {
      setShowWaitlist(true)
      return
    }
    // Phase 1 wires the Polar checkout redirect (GET /api/checkout) here.
    window.location.href = `/api/checkout?cycle=${cycle}`
  }

  function handleManage() {
    // Phase 1 wires the Polar customer portal (GET /api/portal) here.
    window.location.href = "/api/portal"
  }

  const price = PRO_PRICING[cycle]

  return (
    <div className="space-y-6">
      {showWaitlist && (
        <WaitlistModal twitchLogin={twitchLogin} onClose={() => setShowWaitlist(false)} />
      )}

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg p-1 w-fit mx-auto">
        {(["monthly", "yearly"] as BillingCycle[]).map(c => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors capitalize ${
              cycle === c
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {c}
            {c === "yearly" && (
              <span className="ml-1.5 text-xs text-green-500 font-semibold">Save ~17%</span>
            )}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">

        {/* Free */}
        <div className={`relative flex flex-col rounded-2xl border p-6 gap-5 ${
          !isPro
            ? "border-teal-500 ring-1 ring-teal-500 bg-white dark:bg-zinc-900"
            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
        }`}>
          {!isPro && <CurrentPlanBadge />}
          <div>
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Free</p>
            <p className="text-3xl font-bold mt-1">€0</p>
          </div>
          <ul className="flex-1 space-y-2">
            {PLAN_FEATURES.free.map(f => <Feature key={f} text={f} />)}
          </ul>
          <button disabled className="w-full py-2.5 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default">
            {!isPro ? "Current plan" : "Free forever"}
          </button>
        </div>

        {/* Pro */}
        <div className={`relative flex flex-col rounded-2xl border p-6 gap-5 ${
          isPro
            ? "border-teal-500 ring-1 ring-teal-500 bg-white dark:bg-zinc-900"
            : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
        }`}>
          {isPro && <CurrentPlanBadge />}
          {!isPro && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-teal-600 text-white text-xs font-semibold px-3 py-1 rounded-full">14-day free trial</span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Pro</p>
            <p className="text-3xl font-bold mt-1">
              {price.amount}
              <span className="text-base font-medium text-zinc-400">{price.period}</span>
            </p>
          </div>
          <ul className="flex-1 space-y-2">
            {PLAN_FEATURES.pro.map(f => <Feature key={f} text={f} />)}
          </ul>

          {isPro ? (
            hasSubscription ? (
              <button
                onClick={handleManage}
                className="w-full py-2.5 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Manage subscription
              </button>
            ) : (
              <button disabled className="w-full py-2.5 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default">
                Current plan
              </button>
            )
          ) : (
            <button
              onClick={handleUpgrade}
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white transition-colors"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      {isPro && hasSubscription && (
        <p className="text-xs text-center text-zinc-400 dark:text-zinc-600">
          To cancel or change your plan, use{" "}
          <button onClick={handleManage} className="underline hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
            Manage subscription
          </button>
          . Your access continues until the end of the billing period.
        </p>
      )}
    </div>
  )
}
