import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"

import { env } from "@/lib/env"
import {buildPriceTierMap, SubscriptionTier} from "@/lib/gates"
import { stripe } from "@/lib/stripe"

import { userRepository } from "@/repositories"

export const runtime = "nodejs"

const priceTierMap: Record<string,  SubscriptionTier> = buildPriceTierMap(env.stripePrices)

function getPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price.id ?? null
}

export async function POST(req: NextRequest) {
  const body: string = await req.text()
  const sig: string | null = req.headers.get("stripe-signature")

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.stripeWebhookSecret)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const checkoutSession = event.data.object as Stripe.Checkout.Session
      const userId: string | undefined = checkoutSession.metadata?.userId
      const customerId = checkoutSession.customer as string
      const subscriptionId = checkoutSession.subscription as string

      if (!userId || !customerId || !subscriptionId) break

      // Fetch subscription to get the price ID and determine tier
      const subscription: Stripe.Response<Stripe.Subscription> = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId: string | null = getPriceId(subscription)
      const tier: SubscriptionTier | null = priceId ? priceTierMap[priceId] : null

      if (!tier) break

      await userRepository.setStripeCustomer(userId, customerId, subscriptionId)
      await userRepository.setTier(userId, tier)
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const user: {id: string, tier: string} | null = await userRepository.findByStripeCustomerId(customerId)
      if (!user) break

      const priceId: string | null = getPriceId(subscription)
      const tier: SubscriptionTier | null = priceId ? priceTierMap[priceId] : null

      // Only update tier if the subscription is active.
      // If cancel_at_period_end is true the subscription is still active until
      // period end — keep current tier, downgrade happens on subscription.deleted.
      if (subscription.status === "active" && tier && !subscription.cancel_at_period_end) {
        await userRepository.setTier(user.id, tier)
      }

      // Update subscriptionId in case it changed (e.g. plan upgrade)
      await userRepository.setStripeCustomer(user.id, customerId, subscription.id)
      break
    }

    case "customer.subscription.deleted": {
      // Subscription has fully ended (after cancel_at_period_end or immediate cancel)
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const user: { id: string; tier: string } | null = await userRepository.findByStripeCustomerId(customerId)
      if (!user) break

      await userRepository.setTier(user.id, "free")
      await userRepository.clearStripeSubscription(user.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
