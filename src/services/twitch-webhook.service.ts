import { subEventsRepository, followEventsRepository, cheerEventsRepository, raidEventsRepository } from '@/repositories'

import { streamSessionService } from './stream-session.service'

type TwitchEvent = Record<string, unknown>
type HandlerFn = (broadcasterId: string, messageId: string, event: TwitchEvent, occurredAt: Date) => Promise<void>

class TwitchWebhookService {
  private readonly handlers: Record<string, HandlerFn> = {
    'channel.subscribe': this.handleSubscribe.bind(this),
    'channel.subscription.message': this.handleSubscriptionMessage.bind(this),
    'channel.subscription.gift': this.handleSubscriptionGift.bind(this),
    'stream.online': this.handleStreamOnline.bind(this),
    'stream.offline': this.handleStreamOffline.bind(this),
    'channel.follow': this.handleFollow.bind(this),
    'channel.cheer': this.handleCheer.bind(this),
    'channel.raid': this.handleRaid.bind(this),
  }

  async handle(
    subscription: { type: string; condition: Record<string, string> },
    event: TwitchEvent,
    messageId: string,
    occurredAt: Date,
  ): Promise<void> {
    const handler = this.handlers[subscription.type]
    if (!handler) return

    const broadcasterId =
      subscription.condition.broadcaster_user_id ??
      subscription.condition.to_broadcaster_user_id

    await handler(broadcasterId, messageId, event, occurredAt)
  }

  private async handleSubscribe(broadcasterId: string, messageId: string, event: TwitchEvent, occurredAt: Date): Promise<void> {
    if (event.is_gift) return
    await subEventsRepository.insert({
      broadcasterId,
      eventId: messageId,
      userId: event.user_id as string,
      userLogin: event.user_login as string,
      userDisplayName: event.user_name as string,
      tier: event.tier as string,
      kind: 'new',
      giftCount: 1,
      occurredAt,
    })
  }

  private async handleSubscriptionMessage(broadcasterId: string, messageId: string, event: TwitchEvent, occurredAt: Date): Promise<void> {
    await subEventsRepository.insert({
      broadcasterId,
      eventId: messageId,
      userId: event.user_id as string,
      userLogin: event.user_login as string,
      userDisplayName: event.user_name as string,
      tier: event.tier as string,
      kind: 'resub',
      cumulativeMonths: (event.cumulative_months as number | undefined) ?? null,
      message: ((event.message as Record<string, unknown> | undefined)?.text as string | undefined) ?? null,
      giftCount: 1,
      occurredAt,
    })
  }

  private async handleSubscriptionGift(broadcasterId: string, messageId: string, event: TwitchEvent, occurredAt: Date): Promise<void> {
    const isAnonymous = event.is_anonymous as boolean
    await subEventsRepository.insert({
      broadcasterId,
      eventId: messageId,
      gifterId: isAnonymous ? null : (event.user_id as string),
      gifterLogin: isAnonymous ? null : (event.user_login as string),
      gifterDisplayName: isAnonymous ? null : (event.user_name as string),
      tier: event.tier as string,
      kind: 'community_gift',
      giftCount: (event.total as number | undefined) ?? 1,
      occurredAt,
    })
  }

  private async handleStreamOnline(broadcasterId: string, _messageId: string, _event: TwitchEvent, occurredAt: Date): Promise<void> {
    await streamSessionService.handleOnline(broadcasterId, occurredAt)
  }

  private async handleStreamOffline(broadcasterId: string, _messageId: string, _event: TwitchEvent, occurredAt: Date): Promise<void> {
    await streamSessionService.handleOffline(broadcasterId, occurredAt)
  }

  private async handleFollow(broadcasterId: string, messageId: string, event: TwitchEvent, occurredAt: Date): Promise<void> {
    await followEventsRepository.insert({
      broadcasterId,
      eventId: messageId,
      userId: event.user_id as string,
      userLogin: event.user_login as string,
      userDisplayName: event.user_name as string,
      occurredAt,
    })
  }

  private async handleCheer(broadcasterId: string, messageId: string, event: TwitchEvent, occurredAt: Date): Promise<void> {
    const isAnonymous = (event.is_anonymous as boolean | undefined) ?? false
    await cheerEventsRepository.insert({
      broadcasterId,
      eventId: messageId,
      userId: isAnonymous ? null : (event.user_id as string),
      userLogin: isAnonymous ? null : (event.user_login as string),
      userDisplayName: isAnonymous ? null : (event.user_name as string),
      bits: event.bits as number,
      message: (event.message as string | undefined) ?? null,
      isAnonymous,
      occurredAt,
    })
  }

  private async handleRaid(broadcasterId: string, messageId: string, event: TwitchEvent, occurredAt: Date): Promise<void> {
    await raidEventsRepository.insert({
      broadcasterId,
      eventId: messageId,
      fromBroadcasterId: event.from_broadcaster_user_id as string,
      fromBroadcasterLogin: event.from_broadcaster_user_login as string,
      fromBroadcasterDisplayName: event.from_broadcaster_user_name as string,
      viewerCount: event.viewers as number,
      occurredAt,
    })
  }
}

export const twitchWebhookService = new TwitchWebhookService()
