import { cancelSubscription } from "@lemonsqueezy/lemonsqueezy.js"

import { configureLemonSqueezy } from "@/lib/lemon-squeezy"

import {
  cheerEventsRepository,
  eventSubSubscriptionsRepository,
  followEventsRepository,
  linkedAccountsRepository,
  raidEventsRepository,
  streamSessionRepository,
  subEventsRepository,
  subGoalsRepository,
  userRepository,
  waitlistRepository,
  ytMemberEventsRepository,
  ytStreamSessionsRepository,
  ytSuperChatEventsRepository,
} from "@/repositories"
import { youtubeService } from "@/services/youtube.service"
import { twitchService } from "@/services/twitch.service"
import { PLATFORM_TWITCH, PLATFORM_YOUTUBE } from "@/types/platform"
import { LinkedAccount } from "@/types/entities"

class AccountService {
  /**
   * Permanently erases a user and all personal data associated with them
   * (GDPR right to erasure). This backs the self-serve "Delete account" flow
   * and the email-based deletion requests referenced in the Privacy Policy.
   *
   * Ordering matters: revoke OAuth grants and cancel billing while the linked
   * accounts still exist, then delete the channel-scoped data (events, chat)
   * which is keyed by the Twitch broadcasterId / YouTube channelId rather than
   * by userId, and finally delete the user row — whose FK cascades clear
   * linked_accounts, feedback, goals, event_replays and feature_flag_overrides.
   *
   * Third-party revocation and billing cancellation are best-effort: a failure
   * there must not leave the user un-deletable.
   */
  async deleteAccount(userId: string): Promise<void> {
    const accounts: LinkedAccount[] = await linkedAccountsRepository.findByUserId(userId)
    const twitch = accounts.find((a) => a.provider === PLATFORM_TWITCH) ?? null
    const youtube = accounts.find((a) => a.provider === PLATFORM_YOUTUBE) ?? null

    // 1. Revoke third-party OAuth grants (best-effort; internally swallow errors).
    //    Spotify has no revoke endpoint — its token is removed with the linked
    //    account row below.
    if (youtube) {
      await youtubeService.revokeAccess(userId)
    }
    if (twitch) {
      await twitchService.revokeAccess(userId)
    }

    // 2. Cancel any active paid subscription so the user is not billed after deletion.
    const billing = await userRepository.getCustomerInfo(userId)
    if (billing.subscriptionId) {
      try {
        configureLemonSqueezy()
        await cancelSubscription(billing.subscriptionId)
      } catch (err) {
        console.error("Failed to cancel subscription during account deletion:", err)
      }
    }

    // 3. Delete Twitch channel-scoped data (keyed by broadcasterId === providerAccountId).
    if (twitch) {
      const broadcasterId = twitch.providerAccountId
      await subEventsRepository.deleteByBroadcasterId(broadcasterId)
      await followEventsRepository.deleteByBroadcasterId(broadcasterId)
      await cheerEventsRepository.deleteByBroadcasterId(broadcasterId)
      await raidEventsRepository.deleteByBroadcasterId(broadcasterId)
      await streamSessionRepository.deleteByBroadcasterId(broadcasterId)
      await subGoalsRepository.deleteByBroadcasterId(broadcasterId)
      await eventSubSubscriptionsRepository.deleteByBroadcasterId(broadcasterId)
      if (twitch.login) {
        await waitlistRepository.deleteByTwitchLogin(twitch.login)
      }
    }

    // 4. Delete YouTube channel-scoped data (keyed by channelId === providerAccountId).
    if (youtube) {
      const channelId = youtube.providerAccountId
      await ytSuperChatEventsRepository.deleteByChannelId(channelId)
      await ytMemberEventsRepository.deleteByChannelId(channelId)
      await ytStreamSessionsRepository.deleteByChannelId(channelId)
    }

    // 5. Delete the user row — FK cascades remove the remaining user-keyed rows.
    await userRepository.deleteById(userId)
  }
}

export const accountService = new AccountService()
