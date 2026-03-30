import { NextResponse } from "next/server"

import type { LinkedAccount } from "@/types/entities"

import { env } from "@/lib/env"

import {
  linkedAccountsRepository,
  ytSuperChatEventsRepository,
  ytMemberEventsRepository,
  ytStreamSessionsRepository,
  chatMessagesRepository,
} from "@/repositories"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${env.cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const accounts = await linkedAccountsRepository.findAllByProvider("youtube")
  console.log(`[yt-poll] found ${accounts.length} account(s)`)

  const results = await Promise.allSettled(accounts.map(pollAccount))
  const errors = results
    .map((r, i) => r.status === "rejected" ? { account: accounts[i].providerAccountId, error: String(r.reason) } : null)
    .filter(Boolean)

  if (errors.length > 0) {
    console.error(`[yt-poll] ${errors.length} account(s) failed:`, errors)
    return NextResponse.json({ ok: false, accounts: accounts.length, errors }, { status: 500 })
  }

  return NextResponse.json({ ok: true, accounts: accounts.length })
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
    }),
  })
  const data = await res.json()
  return data.access_token ?? null
}

async function ytGet(path: string, accessToken: string): Promise<Response> {
  return fetch(`https://www.googleapis.com/youtube/v3/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

async function pollAccount(account: LinkedAccount): Promise<void> {
  let accessToken = account.accessToken!

  // Fetch active or testing broadcasts, refreshing token on 401
  const broadcastsUrl = "liveBroadcasts?part=id,snippet,status&broadcastStatus=active"
  let broadcastsRes = await ytGet(broadcastsUrl, accessToken)

  if (broadcastsRes.status === 401 && account.refreshToken) {
    console.log(`[yt-poll] ${account.providerAccountId}: token expired, refreshing`)
    const newToken = await refreshAccessToken(account.refreshToken)
    if (!newToken) {
      console.log(`[yt-poll] ${account.providerAccountId}: token refresh failed, skipping`)
      return
    }
    await linkedAccountsRepository.updateAccessToken("youtube", account.providerAccountId, newToken)
    accessToken = newToken
    broadcastsRes = await ytGet(broadcastsUrl, accessToken)
  }

  if (!broadcastsRes.ok) {
    const body = await broadcastsRes.text().catch(() => "(unreadable)")
    console.error(`[yt-poll] ${account.providerAccountId}: broadcasts fetch failed with status ${broadcastsRes.status}: ${body}`)
    throw new Error(`broadcasts fetch ${broadcastsRes.status}: ${body}`)
  }

  const broadcastsData = await broadcastsRes.json()
  const broadcast = broadcastsData.items?.[0]
  console.log(`[yt-poll] ${account.providerAccountId}: broadcast=${broadcast?.id ?? "none"}`)

  if (!broadcast) {
    // No active broadcast — close any open session
    await ytStreamSessionsRepository.closeByChannelId(account.providerAccountId, new Date())
    return
  }

  // Upsert stream session
  const actualStart = broadcast.snippet?.actualStartTime
  await ytStreamSessionsRepository.openIfNew(
    account.providerAccountId,
    broadcast.id,
    broadcast.snippet?.title ?? null,
    actualStart ? new Date(actualStart) : new Date(),
  )

  const liveChatId = broadcast.snippet?.liveChatId
  if (!liveChatId) return

  // Fetch live chat messages
  const chatRes = await ytGet(
    `liveChatMessages?part=id,snippet,authorDetails&liveChatId=${liveChatId}&maxResults=200`,
    accessToken,
  )
  if (!chatRes.ok) return

  const chatData = await chatRes.json()
  const messages: Record<string, unknown>[] = chatData.items ?? []

  for (const msg of messages) {
    const snippet = msg.snippet as Record<string, unknown> | undefined
    const authorDetails = msg.authorDetails as Record<string, unknown> | undefined
    const type = snippet?.type as string | undefined

    if (type === "superChatEvent") {
      const details = snippet?.superChatDetails as Record<string, string> | undefined
      if (!details) continue
      await ytSuperChatEventsRepository.insert({
        channelId: account.providerAccountId,
        eventId: msg.id as string,
        userId: (authorDetails?.channelId as string) ?? null,
        userDisplayName: (authorDetails?.displayName as string) ?? null,
        amountMicros: parseInt(details.amountMicros ?? "0"),
        currency: details.currency ?? "USD",
        message: details.userComment ?? null,
        occurredAt: new Date(snippet!.publishedAt as string),
      })
    } else if (type === "memberMilestoneChatEvent" || type === "newSponsorEvent") {
      const milestoneDetails = snippet?.memberMilestoneChatDetails as Record<string, unknown> | undefined
      const memberMonths = type === "memberMilestoneChatEvent"
        ? ((milestoneDetails?.memberMonth as number) ?? 1)
        : 1
      await ytMemberEventsRepository.insert({
        channelId: account.providerAccountId,
        eventId: msg.id as string,
        userId: (authorDetails?.channelId as string) ?? null,
        userDisplayName: (authorDetails?.displayName as string) ?? null,
        memberMonths,
        levelName: (milestoneDetails?.memberLevelName as string) ?? null,
        occurredAt: new Date(snippet!.publishedAt as string),
      })
    } else if (type === "textMessageEvent") {
      const text = snippet?.displayMessage as string | undefined
      if (!text) continue
      await chatMessagesRepository.insert({
        platform: "youtube",
        channelId: account.providerAccountId,
        eventId: msg.id as string,
        userId: (authorDetails?.channelId as string) ?? null,
        userLogin: null,
        userDisplayName: (authorDetails?.displayName as string) ?? null,
        message: text,
        occurredAt: new Date(snippet!.publishedAt as string),
      })
    }
  }
}
