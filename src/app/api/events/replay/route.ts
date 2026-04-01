import { NextResponse } from "next/server"

import type { LiveEvent } from "@/types/events"

import { requireSession } from "@/lib/session-auth"

import { eventReplaysRepository } from "@/repositories"

export async function POST(req: Request) {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const { event } = await req.json() as { event: LiveEvent }
  if (!event?.id) return new Response("Invalid event", { status: 400 })

  // Strip isReplay flag before storing so re-rolls of re-rolls stay clean
  const { isReplay: _, ...clean } = event
  await eventReplaysRepository.create(session.userId, JSON.stringify(clean))
  return new Response(null, { status: 204 })
}
