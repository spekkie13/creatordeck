import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"

import { env } from "@/lib/env"
import { buildPriceTierMap } from "@/lib/gates"
import { stripe } from "@/lib/stripe"

import { userRepository } from "@/repositories"

// Must be raw body — disable Next.js body parsing
export const runtime = "nodejs"

const priceTierMap = buildPriceTierMap(env.stripePrices)

function getPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price.id ?? null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

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
      const userId = checkoutSession.metadata?.userId
      const customerId = checkoutSession.customer as string
      const subscriptionId = checkoutSession.subscription as string

      if (!userId || !customerId || !subscriptionId) {
        console.warn("[stripe/webhook] checkout.session.completed missing required fields", { userId, customerId, subscriptionId, eventId: event.id })
        break
      }

      // Fetch subscription to get the price ID and determine tier
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = getPriceId(subscription)
      const tier = priceId ? priceTierMap[priceId] : null

      if (!tier) {
        console.warn("[stripe/webhook] checkout.session.completed unrecognised priceId", { priceId, subscriptionId, eventId: event.id })
        break
      }

      await userRepository.setStripeCustomer(userId, customerId, subscriptionId)
      await userRepository.setTier(userId, tier)
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const user = await userRepository.findByStripeCustomerId(customerId)
      if (!user) {
        console.warn("[stripe/webhook] customer.subscription.updated no user found for customerId", { customerId, eventId: event.id })
        break
      }

      const priceId = getPriceId(subscription)
      const tier = priceId ? priceTierMap[priceId] : null

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
      const user = await userRepository.findByStripeCustomerId(customerId)
      if (!user) {
        console.warn("[stripe/webhook] customer.subscription.deleted no user found for customerId", { customerId, eventId: event.id })
        break
      }

      await userRepository.setTier(user.id, "free")
      await userRepository.clearStripeSubscription(user.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}