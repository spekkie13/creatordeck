import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { env } from "@/lib/env"
import { userRepository } from "@/repositories"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { priceId } = await req.json()
  if (!priceId) return NextResponse.json({ error: "Missing priceId" }, { status: 400 })

  const { stripeCustomerId } = await userRepository.getStripeInfo(session.userId)

  const origin = req.headers.get("origin") ?? "http://localhost:3000"

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/billing`,
    ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
    subscription_data: {
      metadata: { userId: session.userId },
    },
    metadata: { userId: session.userId },
  })

  return NextResponse.json({ url: checkoutSession.url })
}