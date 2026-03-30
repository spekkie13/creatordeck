import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"

import { env } from "@/lib/env"

import { subEventsRepository, followEventsRepository, cheerEventsRepository, raidEventsRepository } from "@/repositories"

import { streamSessionService } from "@/services"

const TWITCH_MESSAGE_ID = "twitch-eventsub-message-id"
const TWITCH_MESSAGE_TIMESTAMP = "twitch-eventsub-message-timestamp"
const TWITCH_MESSAGE_SIGNATURE = "twitch-eventsub-message-signature"
const MESSAGE_TYPE = "twitch-eventsub-message-type"

function verifySignature(messageId: string, timestamp: string, body: string, signature: string): boolean {
  const secret = env.twitchWebhookSecret
  const hmacMessage = messageId + timestamp + body
  const expected = "sha256=" + createHmac("sha256", secret).update(hmacMessage).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const messageId = req.headers.get(TWITCH_MESSAGE_ID) ?? ""
  const timestamp = req.headers.get(TWITCH_MESSAGE_TIMESTAMP) ?? ""
  const signature = req.headers.get(TWITCH_MESSAGE_SIGNATURE) ?? ""
  const messageType = req.headers.get(MESSAGE_TYPE) ?? ""

  if (!verifySignature(messageId, timestamp, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
  }

  const payload = JSON.parse(body)

  if (messageType === "webhook_callback_verification") {
    return new NextResponse(payload.challenge, { status: 200, headers: { "Content-Type": "text/plain" } })
  }

  if (messageType === "notification") {
    const { subscription, event } = payload
    const broadcasterId: string = subscription.condition.broadcaster_user_id
      ?? subscription.condition.to_broadcaster_user_id
    const occurredAt = new Date(timestamp)

    try {
      switch (subscription.type) {
        case "channel.subscribe":
          if (!event.is_gift) {
            await subEventsRepository.insert({ broadcasterId, eventId: messageId, userId: event.user_id, userLogin: event.user_login, userDisplayName: event.user_name, tier: event.tier, kind: "new", giftCount: 1, occurredAt })
          }
          break

        case "channel.subscription.message":
          await subEventsRepository.insert({ broadcasterId, eventId: messageId, userId: event.user_id, userLogin: event.user_login, userDisplayName: event.user_name, tier: event.tier, kind: "resub", cumulativeMonths: event.cumulative_months ?? null, message: event.message?.text ?? null, giftCount: 1, occurredAt })
          break

        case "channel.subscription.gift":
          await subEventsRepository.insert({ broadcasterId, eventId: messageId, gifterId: event.is_anonymous ? null : event.user_id, gifterLogin: event.is_anonymous ? null : event.user_login, gifterDisplayName: event.is_anonymous ? null : event.user_name, tier: event.tier, kind: "community_gift", giftCount: event.total ?? 1, occurredAt })
          break

        case "stream.online":
          await streamSessionService.handleOnline(broadcasterId, occurredAt)
          break

        case "stream.offline":
          await streamSessionService.handleOffline(broadcasterId, occurredAt)
          break

        case "channel.follow":
          await followEventsRepository.insert({ broadcasterId, eventId: messageId, userId: event.user_id, userLogin: event.user_login, userDisplayName: event.user_name, occurredAt })
          break

        case "channel.cheer":
          await cheerEventsRepository.insert({ broadcasterId, eventId: messageId, userId: event.is_anonymous ? null : event.user_id, userLogin: event.is_anonymous ? null : event.user_login, userDisplayName: event.is_anonymous ? null : event.user_name, bits: event.bits, message: event.message ?? null, isAnonymous: event.is_anonymous ?? false, occurredAt })
          break

        case "channel.raid":
          await raidEventsRepository.insert({ broadcasterId, eventId: messageId, fromBroadcasterId: event.from_broadcaster_user_id, fromBroadcasterLogin: event.from_broadcaster_user_login, fromBroadcasterDisplayName: event.from_broadcaster_user_name, viewerCount: event.viewers, occurredAt })
          break


      }
    } catch (err) {
      console.error("Webhook handler error:", err)
    }
  }

  return NextResponse.json({ ok: true })
}
