import { NextRequest, NextResponse } from "next/server"
import { Checkout } from "@polar-sh/nextjs"

import { env } from "@/lib/env"
import { requireSession } from "@/lib/session-auth"

// GET /api/checkout?cycle=monthly|yearly
// Resolves the product for the requested cycle, binds the checkout to our user
// via externalCustomerId, and redirects to Polar's hosted checkout. Success
// returns to /billing/success (the page polls /api/me/entitlement while the
// webhook lands).
export async function GET(req: NextRequest): Promise<Response> {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const cycle = req.nextUrl.searchParams.get("cycle") === "yearly" ? "yearly" : "monthly"
  const productId = cycle === "yearly" ? env.polarProductProYearly : env.polarProductProMonthly
  if (!productId) return NextResponse.json({ error: "Billing not configured" }, { status: 503 })

  // Polar's adapter requires an absolute successUrl (it news a URL from it),
  // so resolve it against the request origin per-request.
  const handler = Checkout({
    accessToken: env.polarAccessToken,
    server: env.polarServer,
    successUrl: new URL("/billing/success", req.nextUrl.origin).toString(),
  })

  // Re-drive the Checkout adapter with the params it reads from the query string.
  const url = new URL(req.url)
  url.searchParams.set("products", productId)
  url.searchParams.set("customerExternalId", session.userId)
  return handler(new NextRequest(url, req))
}
