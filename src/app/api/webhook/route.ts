import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

import { env } from '@/lib/env'
import { apiError } from '@/lib/api-response'

import { twitchWebhookService } from '@/services'

const TWITCH_MESSAGE_ID = 'twitch-eventsub-message-id'
const TWITCH_MESSAGE_TIMESTAMP = 'twitch-eventsub-message-timestamp'
const TWITCH_MESSAGE_SIGNATURE = 'twitch-eventsub-message-signature'
const MESSAGE_TYPE = 'twitch-eventsub-message-type'

function verifySignature(messageId: string, timestamp: string, body: string, signature: string): boolean {
  const hmacMessage = messageId + timestamp + body
  const expected = 'sha256=' + createHmac('sha256', env.twitchWebhookSecret).update(hmacMessage).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const messageId = req.headers.get(TWITCH_MESSAGE_ID) ?? ''
  const timestamp = req.headers.get(TWITCH_MESSAGE_TIMESTAMP) ?? ''
  const signature = req.headers.get(TWITCH_MESSAGE_SIGNATURE) ?? ''
  const messageType = req.headers.get(MESSAGE_TYPE) ?? ''

  if (!verifySignature(messageId, timestamp, body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let payload: ReturnType<typeof JSON.parse>
  try {
    payload = JSON.parse(body)
  } catch (err) {
    console.error('[webhook] Failed to parse body:', err)
    return apiError(400, 'Invalid payload')
  }

  if (messageType === 'webhook_callback_verification') {
    return new NextResponse(payload.challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  if (messageType === 'notification') {
    const { subscription, event } = payload
    const occurredAt = new Date(timestamp)

    try {
      await twitchWebhookService.handle(subscription, event, messageId, occurredAt)
      return NextResponse.json({ ok: true })
    } catch (err) {
      console.error(`[webhook] Handler error for ${subscription.type} (broadcaster=${subscription.condition.broadcaster_user_id ?? subscription.condition.to_broadcaster_user_id}):`, err)
      return apiError(500, 'Handler error')
    }
  }

  return NextResponse.json({ ok: true })
}
