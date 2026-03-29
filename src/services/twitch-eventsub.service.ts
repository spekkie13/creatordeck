let appAccessToken: string | null = null
let tokenExpiry = 0

const APP_SUB_TYPES = [
  { type: "channel.subscribe", version: "1" },
  { type: "channel.subscription.message", version: "1" },
  { type: "channel.subscription.gift", version: "1" },
  { type: "channel.stream.online", version: "1" },
  { type: "channel.stream.offline", version: "1" },
  { type: "channel.follow", version: "2" },
  { type: "channel.cheer", version: "1" },
  { type: "channel.raid", version: "1" },
  { type: "channel.chat.message", version: "1" },
]

class TwitchEventSubService {
  private async getAppAccessToken(): Promise<string> {
    if (appAccessToken && Date.now() < tokenExpiry) return appAccessToken

    const res = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
      { method: "POST" }
    )
    const data = await res.json()
    appAccessToken = data.access_token
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
    return appAccessToken!
  }

  private buildCondition(type: string, broadcasterId: string): Record<string, string> {
    if (type === "channel.follow") return { broadcaster_user_id: broadcasterId, moderator_user_id: broadcasterId }
    if (type === "channel.raid") return { to_broadcaster_user_id: broadcasterId }
    if (type === "channel.chat.message") return { broadcaster_user_id: broadcasterId, user_id: broadcasterId }
    return { broadcaster_user_id: broadcasterId }
  }

  private async fetchExistingByBroadcaster(token: string, broadcasterId: string): Promise<Record<string, { id: string; status: string }>> {
    const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions?status=enabled", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Client-Id": process.env.TWITCH_CLIENT_ID!,
      },
    })
    if (!res.ok) return {}
    const data = await res.json()
    const map: Record<string, { id: string; status: string }> = {}
    for (const sub of data.data ?? []) {
      const condition = sub.condition as Record<string, string>
      if (Object.values(condition).includes(broadcasterId)) {
        map[sub.type as string] = { id: sub.id as string, status: sub.status as string }
      }
    }
    return map
  }

  private async registerSubType(
    type: string,
    version: string,
    broadcasterId: string,
    token: string,
    existing: Record<string, { id: string; status: string }>,
  ): Promise<{ id: string; type: string; status: string } | null> {
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`
    const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Client-Id": process.env.TWITCH_CLIENT_ID!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        version,
        condition: this.buildCondition(type, broadcasterId),
        transport: {
          method: "webhook",
          callback: callbackUrl,
          secret: process.env.TWITCH_WEBHOOK_SECRET,
        },
      }),
    })

    const data = await res.json()
    if (res.ok && data.data?.[0]) {
      return { id: data.data[0].id, type, status: data.data[0].status }
    } else if (res.status === 409 && existing[type]) {
      return { id: existing[type].id, type, status: existing[type].status }
    }
    return null
  }

  async registerSubscriptions(broadcasterId: string): Promise<{ id: string; type: string; status: string }[]> {
    const appToken = await this.getAppAccessToken()
    const existing = await this.fetchExistingByBroadcaster(appToken, broadcasterId)
    const results: { id: string; type: string; status: string }[] = []

    for (const { type, version } of APP_SUB_TYPES) {
      const result = await this.registerSubType(type, version, broadcasterId, appToken, existing)
      if (result) results.push(result)
    }

    return results
  }
}

export const twitchEventSubService = new TwitchEventSubService()
