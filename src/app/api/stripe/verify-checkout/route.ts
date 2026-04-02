import { NextRequest, NextResponse } from "next/server"

import { env } from "@/lib/env"
import { buildPriceTierMap } from "@/lib/gates"
import { stripe } from "@/lib/stripe"
import { requireSession } from "@/lib/session-auth"

import { userRepository } from "@/repositories"
import {SessionResult} from "@/types/session";
import Stripe from "stripe";
import { SubscriptionTier } from "@/types/tier";

const priceTierMap: Record<string, SubscriptionTier> = buildPriceTierMap(env.stripePrices)

export async function GET(req: NextRequest): Promise<NextResponse> {
  const result: SessionResult = await requireSession()
  if (result instanceof NextResponse)
    return result

  const { session } = result

  const sessionId: string | null = new URL(req.url).searchParams.get("session_id")
  if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 })

  const checkoutSession: Stripe.Response<Stripe.Checkout.Session> = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  })

  if (checkoutSession.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
  }

  const sub = checkoutSession.subscription as import("stripe").default.Subscription
  const priceId: string = sub?.items?.data[0]?.price?.id
  const tier: SubscriptionTier | null = priceId ? priceTierMap[priceId] : null

  if (!tier)
    return NextResponse.json({ error: "Unknown price" }, { status: 400 })

  const customerId = checkoutSession.customer as string

  await userRepository.setStripeCustomer(session.userId, customerId, sub.id)
  await userRepository.setTier(session.userId, tier)

  return NextResponse.json({ tier })
}
