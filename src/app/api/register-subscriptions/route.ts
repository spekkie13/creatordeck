import { NextResponse } from "next/server"

import { requireTwitchSession } from "@/lib/session-auth"

import { eventSubSubscriptionsRepository } from "@/repositories"

import { twitchEventSubService } from "@/services"

export async function POST() {
  const result = await requireTwitchSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const results = await twitchEventSubService.registerSubscriptions(session.twitchId)

  for (const sub of results) {
    await eventSubSubscriptionsRepository.insert({ id: sub.id, broadcasterId: session.twitchId, type: sub.type, status: sub.status })
  }

  return NextResponse.json({ subscriptions: results })
}
