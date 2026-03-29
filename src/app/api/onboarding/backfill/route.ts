import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { linkedAccountsRepository, followEventsRepository, subEventsRepository } from "@/repositories"

const MAX_PAGES = 50 // cap at 5 000 records per type to avoid serverless timeouts

const twitchHeaders = (accessToken: string) => ({
  "Authorization": `Bearer ${accessToken}`,
  "Client-Id": process.env.TWITCH_CLIENT_ID!,
})

async function backfillFollowers(broadcasterId: string, accessToken: string): Promise<number> {
  // Skip users already captured by live webhook events to avoid duplicates
  const existingUserIds = await followEventsRepository.findTrackedUserIds(broadcasterId)

  let cursor: string | undefined
  let total = 0

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL("https://api.twitch.tv/helix/channels/followers")
    url.searchParams.set("broadcaster_id", broadcasterId)
    url.searchParams.set("first", "100")
    if (cursor) url.searchParams.set("after", cursor)

    const res = await fetch(url.toString(), { headers: twitchHeaders(accessToken) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? "Failed to fetch followers")

    const followers: { user_id: string; user_login: string; user_name: string; followed_at: string }[] = data.data ?? []

    for (const f of followers) {
      if (existingUserIds.has(f.user_id)) continue
      await followEventsRepository.insert({
        broadcasterId,
        eventId: `backfill-follow-${f.user_id}`,
        userId: f.user_id,
        userLogin: f.user_login,
        userDisplayName: f.user_name,
        occurredAt: new Date(f.followed_at),
      })
      existingUserIds.add(f.user_id)
    }

    total += followers.length
    cursor = data.pagination?.cursor
    if (!cursor || followers.length < 100) break
  }

  return total
}

async function backfillSubs(broadcasterId: string, accessToken: string): Promise<number> {
  const existingUserIds = await subEventsRepository.findTrackedUserIds(broadcasterId)

  let cursor: string | undefined
  let total = 0

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL("https://api.twitch.tv/helix/subscriptions")
    url.searchParams.set("broadcaster_id", broadcasterId)
    url.searchParams.set("first", "100")
    if (cursor) url.searchParams.set("after", cursor)

    const res = await fetch(url.toString(), { headers: twitchHeaders(accessToken) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? "Failed to fetch subscriptions")

    const subs: {
      user_id: string; user_login: string; user_name: string; tier: string;
      is_gift: boolean; gifter_id?: string; gifter_login?: string; gifter_name?: string
    }[] = data.data ?? []

    for (const s of subs) {
      if (existingUserIds.has(s.user_id)) continue
      await subEventsRepository.insert({
        broadcasterId,
        eventId: `backfill-sub-${s.user_id}`,
        userId: s.user_id,
        userLogin: s.user_login,
        userDisplayName: s.user_name,
        tier: s.tier,
        kind: s.is_gift ? "community_gift" : "new",
        gifterId: s.is_gift ? s.gifter_id ?? null : null,
        gifterLogin: s.is_gift ? s.gifter_login ?? null : null,
        gifterDisplayName: s.is_gift ? s.gifter_name ?? null : null,
        giftCount: 1,
        occurredAt: new Date(), // Twitch subscriptions API does not return subscribed_at
      })
      existingUserIds.add(s.user_id)
    }

    total += subs.length
    cursor = data.pagination?.cursor
    if (!cursor || subs.length < 100) break
  }

  return total
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!session.twitchId) return NextResponse.json({ error: "No Twitch account linked" }, { status: 400 })

  const twitchAccount = await linkedAccountsRepository.findByProvider("twitch", session.twitchId)
  if (!twitchAccount?.accessToken) return NextResponse.json({ error: "No access token" }, { status: 400 })

  const results: Record<string, number | string> = {}

  try {
    results.followers = await backfillFollowers(session.twitchId, twitchAccount.accessToken)
  } catch (err) {
    results.followers_error = String(err)
  }

  try {
    results.subs = await backfillSubs(session.twitchId, twitchAccount.accessToken)
  } catch (err) {
    results.subs_error = String(err)
  }

  return NextResponse.json({ ok: true, backfilled: results })
}
