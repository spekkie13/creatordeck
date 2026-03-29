class TwitchService {
    async fetchTwitchFollowerCount(broadcasterId: string, accessToken: string): Promise<number | null> {
        try {
            const res = await fetch(
                `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&first=1`,
                { headers: { Authorization: `Bearer ${accessToken}`, "Client-Id": process.env.TWITCH_CLIENT_ID! } },
            )
            if (!res.ok) return null
            const data = await res.json()
            return data.total ?? null
        } catch { return null }
    }

    async fetchTwitchSubCount(broadcasterId: string, accessToken: string): Promise<number | null> {
        try {
            const res: Response = await fetch(
                `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}&first=1`,
                { headers: { Authorization: `Bearer ${accessToken}`, "Client-Id": process.env.TWITCH_CLIENT_ID! } },
            )
            if (!res.ok) return null
            const data = await res.json()
            return data.total ?? null
        } catch { return null }
    }
}

export const twitchService = new TwitchService();
