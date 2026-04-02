import { NextRequest, NextResponse } from "next/server"

import { stripe } from "@/lib/stripe"
import { requireSession } from "@/lib/session-auth"

import { userRepository } from "@/repositories"
import {SessionResult} from "@/types/session";
import Stripe from "stripe";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const result: SessionResult = await requireSession()
  if (result instanceof NextResponse)
    return result

  const { session } = result

  const { priceId } = await req.json()
  if (!priceId)
    return NextResponse.json({ error: "Missing priceId" }, { status: 400 })

  const { stripeCustomerId } = await userRepository.getStripeInfo(session.userId)

  const origin: string = req.headers.get("origin") ?? "http://localhost:3000"

  const checkoutSession: Stripe.Response<Stripe.Checkout.Session> = await stripe.checkout.sessions.create({
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
