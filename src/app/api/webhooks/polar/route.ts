import { NextRequest, NextResponse } from "next/server"
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks"

import { env } from "@/lib/env"
import { webhookEventsRepository } from "@/repositories"
import { entitlementService } from "@/services"

export const runtime = "nodejs"

// POST /api/webhooks/polar — verified, idempotent entitlement sync (spec §3.3).
// We call validateEvent directly (rather than the adapter's Webhooks wrapper) so
// we can read the standard-webhooks `webhook-id` header for the idempotency
// ledger.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text()
  const headers = Object.fromEntries(req.headers)

  let event
  try {
    event = validateEvent(body, headers, env.polarWebhookSecret)
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }
    throw err
  }

  // Idempotency: dedup on the webhook-id header. A duplicate delivery is acked
  // without reprocessing.
  const eventId = headers["webhook-id"] ?? `${event.type}:${(event.data as { id?: string })?.id ?? ""}`
  const fresh = await webhookEventsRepository.record(eventId, event.type)
  if (!fresh) return NextResponse.json({ received: true, duplicate: true })

  await entitlementService.applyFromWebhook(event)

  return NextResponse.json({ received: true })
}
