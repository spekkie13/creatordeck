import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { userRepository } from "@/repositories"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { stripeCustomerId } = await userRepository.getStripeInfo(session.userId)
  if (!stripeCustomerId) return NextResponse.json({ error: "No billing account found" }, { status: 400 })

  const origin = req.headers.get("origin") ?? "http://localhost:3000"

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${origin}/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}