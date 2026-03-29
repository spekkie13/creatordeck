import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ytSuperChatEventsRepository, ytMemberEventsRepository } from "@/repositories"

const FAKE_SUPERCHATS = [
  { user: "SuperFanAlex", displayName: "SuperFanAlex", amountMicros: 5000000, currency: "USD", message: "Amazing content, keep it up!" },
  { user: "UCviewer99", displayName: "NightOwlViewer", amountMicros: 2000000, currency: "EUR", message: "Love the stream!" },
  { user: "UCbigspender", displayName: "GenerousDan", amountMicros: 50000000, currency: "USD", message: "Here's a big one!" },
  { user: "UCquick", displayName: "QuickFire", amountMicros: 1000000, currency: "GBP", message: null },
  { user: "UCfan2024", displayName: "Fan2024", amountMicros: 10000000, currency: "USD", message: "First time donating!" },
]

const FAKE_MEMBERS = [
  { user: "UCmember1", displayName: "LoyalMember", memberMonths: 1, levelName: "Member" },
  { user: "UCmember2", displayName: "OGSupporter", memberMonths: 24, levelName: "Super Fan" },
  { user: "UCmember3", displayName: "NewJoiner", memberMonths: 1, levelName: null },
  { user: "UCmember4", displayName: "MidTier", memberMonths: 6, levelName: "Fan" },
]

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Use real channel ID if signed in with YouTube, otherwise use a dev placeholder
  const channelId = session.youtubeChannelId ?? "UC_dev_seed_channel"

  const results: Record<string, number | string> = { channelId }

  try {
    for (let i = 0; i < FAKE_SUPERCHATS.length; i++) {
      const sc = FAKE_SUPERCHATS[i]
      const occurredAt = new Date(Date.now() - i * 8 * 60 * 1000) // spread over last 40 mins
      await ytSuperChatEventsRepository.insert({
        channelId,
        eventId: `seed-sc-${sc.user}`,
        userId: sc.user,
        userDisplayName: sc.displayName,
        amountMicros: sc.amountMicros,
        currency: sc.currency,
        message: sc.message ?? null,
        occurredAt,
      })
    }
    results.superchats = FAKE_SUPERCHATS.length
  } catch (err) {
    results.superchats_error = String(err)
  }

  try {
    for (let i = 0; i < FAKE_MEMBERS.length; i++) {
      const m = FAKE_MEMBERS[i]
      const occurredAt = new Date(Date.now() - i * 15 * 60 * 1000) // spread over last hour
      await ytMemberEventsRepository.insert({
        channelId,
        eventId: `seed-member-${m.user}`,
        userId: m.user,
        userDisplayName: m.displayName,
        memberMonths: m.memberMonths,
        levelName: m.levelName ?? null,
        occurredAt,
      })
    }
    results.members = FAKE_MEMBERS.length
  } catch (err) {
    results.members_error = String(err)
  }

  return NextResponse.json({ ok: true, seeded: results })
}
