import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { apiError } from '@/lib/api-response'
import { YoutubeChatIngestSchema } from '@/lib/schemas/streamelements.schema'

import { chatMessagesRepository } from '@/repositories'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${env.northflankWebhookSecret}`) {
    return apiError(401, 'Unauthorized')
  }

  const parsed = YoutubeChatIngestSchema.safeParse(await req.json())
  if (!parsed.success) return apiError(400, parsed.error.issues[0].message)

  const { channelId, messages } = parsed.data

  let inserted = 0
  for (const msg of messages) {
    await chatMessagesRepository.insert({
      platform: 'youtube',
      channelId,
      eventId: msg.id,
      userId: msg.userId,
      userLogin: null,
      userDisplayName: msg.userDisplayName,
      message: msg.message,
      occurredAt: new Date(msg.occurredAt),
    })
    inserted++
  }

  return NextResponse.json({ ok: true, inserted })
}
