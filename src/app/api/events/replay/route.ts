import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { eventReplaysRepository } from "@/repositories"
import type { LiveEvent } from "@/types/events"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.userId) return new Response("Unauthorized", { status: 401 })

  const { event } = await req.json() as { event: LiveEvent }
  if (!event?.id) return new Response("Invalid event", { status: 400 })

  // Strip isReplay flag before storing so re-rolls of re-rolls stay clean
  const { isReplay: _, ...clean } = event
  await eventReplaysRepository.create(session.userId, JSON.stringify(clean))
  return new Response(null, { status: 204 })
}
