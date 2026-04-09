import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { apiError } from '@/lib/api-response'
import { StreamElementsWebhookSchema } from '@/lib/schemas/streamelements.schema'

import { chatMessagesRepository } from '@/repositories'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${env.bridgeSecret}`) {
    return apiError(401, 'Unauthorized')
  }

  const parsed = StreamElementsWebhookSchema.safeParse(await req.json())
  if (!parsed.success) return apiError(400, parsed.error.issues[0].message)

  const { channelId, eventId, userDisplayName, userId, message, occurredAt } = parsed.data

  await chatMessagesRepository.insert({
    platform: 'streamelements',
    channelId,
    eventId,
    userId,
    userLogin: null,
    userDisplayName,
    message,
    occurredAt: new Date(occurredAt),
  })

  return NextResponse.json({ ok: true })
}