import { NextRequest, NextResponse } from "next/server"

import { stripe } from "@/lib/stripe"
import { requireSession } from "@/lib/session-auth"

import { userRepository } from "@/repositories"

export async function POST(req: NextRequest) {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const { stripeCustomerId } = await userRepository.getStripeInfo(session.userId)
  if (!stripeCustomerId) return NextResponse.json({ error: "No billing account found" }, { status: 400 })

  const origin = req.headers.get("origin") ?? "http://localhost:3000"

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${origin}/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}