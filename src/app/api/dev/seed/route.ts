import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { linkedAccountsRepository, followEventsRepository, subEventsRepository, cheerEventsRepository, raidEventsRepository } from "@/repositories"

const TWITCH_HEADERS = (accessToken: string) => ({
  "Authorization": `Bearer ${accessToken}`,
  "Client-Id": process.env.TWITCH_CLIENT_ID!,
})

async function seedFollowers(broadcasterId: string, accessToken: string): Promise<number> {
  const res = await fetch(
    `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&first=100`,
    { headers: TWITCH_HEADERS(accessToken) }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch followers")

  for (const follower of data.data ?? []) {
    await followEventsRepository.insert({
      broadcasterId,
      eventId: `seed-follow-${follower.user_id}`,
      userId: follower.user_id,
      userLogin: follower.user_login,
      userDisplayName: follower.user_name,
      occurredAt: new Date(follower.followed_at),
    })
  }
  return data.data?.length ?? 0
}

async function seedSubs(broadcasterId: string, accessToken: string): Promise<number> {
  const res = await fetch(
    `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}&first=100`,
    { headers: TWITCH_HEADERS(accessToken) }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch subscriptions")

  for (const sub of data.data ?? []) {
    await subEventsRepository.insert({
      broadcasterId,
      eventId: `seed-sub-${sub.user_id}`,
      userId: sub.user_id,
      userLogin: sub.user_login,
      userDisplayName: sub.user_name,
      tier: sub.tier,
      kind: sub.is_gift ? "community_gift" : "new",
      gifterId: sub.is_gift ? sub.gifter_id || null : null,
      gifterLogin: sub.is_gift ? sub.gifter_login || null : null,
      gifterDisplayName: sub.is_gift ? sub.gifter_name || null : null,
      giftCount: 1,
      occurredAt: new Date(), // Twitch subscription list API does not return subscribed_at
    })
  }
  return data.data?.length ?? 0
}

async function seedFakeBits(broadcasterId: string): Promise<number> {
  const fakecheers = [
    { user: "PixelPulse99", bits: 100 },
    { user: "StreamLurker42", bits: 500 },
    { user: "CosmicDrifter", bits: 1000 },
    { user: "NightOwlGamer", bits: 200 },
    { user: "TurboFan_X", bits: 5000 },
  ]

  for (let i = 0; i < fakecheers.length; i++) {
    const cheer = fakecheers[i]
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - i)

    await cheerEventsRepository.insert({
      broadcasterId,
      eventId: `seed-cheer-${i}`,
      userId: `fake-user-${i}`,
      userLogin: cheer.user.toLowerCase(),
      userDisplayName: cheer.user,
      bits: cheer.bits,
      message: `Cheer${cheer.bits} Great stream!`,
      isAnonymous: false,
      occurredAt: daysAgo,
    })
  }
  return fakecheers.length
}

async function seedFakeRaids(broadcasterId: string): Promise<number> {
  const fakeRaids = [
    { login: "retrogamevault", name: "RetroGameVault", viewers: 87 },
    { login: "the_pixel_witch", name: "ThePixelWitch", viewers: 234 },
    { login: "neonarcade_tv", name: "NeonArcade_TV", viewers: 512 },
  ]

  for (let i = 0; i < fakeRaids.length; i++) {
    const raid = fakeRaids[i]
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - i * 2)

    await raidEventsRepository.insert({
      broadcasterId,
      eventId: `seed-raid-${i}`,
      fromBroadcasterId: `fake-broadcaster-${i}`,
      fromBroadcasterLogin: raid.login,
      fromBroadcasterDisplayName: raid.name,
      viewerCount: raid.viewers,
      occurredAt: daysAgo,
    })
  }
  return fakeRaids.length
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.twitchId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const twitchAccount = await linkedAccountsRepository.findByProvider("twitch", session.twitchId)
  if (!twitchAccount?.accessToken) return NextResponse.json({ error: "No access token — sign out and sign in again" }, { status: 400 })

  const broadcasterId = session.twitchId
  const results: Record<string, number | string> = {}

  try {
    results.followers = await seedFollowers(broadcasterId, twitchAccount.accessToken)
  } catch (err) {
    results.followers_error = String(err)
  }

  try {
    results.subs = await seedSubs(broadcasterId, twitchAccount.accessToken)
  } catch (err) {
    results.subs_error = String(err)
  }

  try {
    results.bits = await seedFakeBits(broadcasterId)
  } catch (err) {
    results.bits_error = String(err)
  }

  try {
    results.raids = await seedFakeRaids(broadcasterId)
  } catch (err) {
    results.raids_error = String(err)
  }

  return NextResponse.json({ ok: true, seeded: results })
}