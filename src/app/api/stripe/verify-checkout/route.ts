import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { env } from "@/lib/env"
import { buildPriceTierMap } from "@/lib/gates"
import { authOptions } from "@/lib/auth"
import { stripe } from "@/lib/stripe"

import { userRepository } from "@/repositories"

const priceTierMap = buildPriceTierMap(env.stripePrices)

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionId = new URL(req.url).searchParams.get("session_id")
  if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 })

  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  })

  if (checkoutSession.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
  }

  const sub = checkoutSession.subscription as import("stripe").default.Subscription
  const priceId = sub?.items?.data[0]?.price?.id
  const tier = priceId ? priceTierMap[priceId] : null

  if (!tier) return NextResponse.json({ error: "Unknown price" }, { status: 400 })

  const customerId = checkoutSession.customer as string

  await userRepository.setStripeCustomer(session.userId, customerId, sub.id)
  await userRepository.setTier(session.userId, tier)

  return NextResponse.json({ tier })
}