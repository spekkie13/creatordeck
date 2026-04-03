import { getServerSession } from "next-auth"

import type { LiveEvent } from "@/types/events"

import { authOptions } from "@/lib/auth"
import { apiError } from "@/lib/api-response"

import { eventReplaysRepository } from "@/repositories"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.userId) return apiError(401, 'Unauthorized')

  const { event } = await req.json() as { event: LiveEvent }
  if (!event?.id) return apiError(400, 'Invalid event')

  // Strip isReplay flag before storing so re-rolls of re-rolls stay clean
  const { isReplay: _, ...clean } = event
  await eventReplaysRepository.create(session.userId, JSON.stringify(clean))
  return new Response(null, { status: 204 })
}
