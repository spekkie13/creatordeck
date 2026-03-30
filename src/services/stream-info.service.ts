import type { StreamInfo } from "@/types/stream"

export class StreamInfoService {
    async fetchStreamInfo(broadcasterId: string, accessToken: string): Promise<StreamInfo> {
        try {
            const res = await fetch(
                `https://api.twitch.tv/helix/streams?user_id=${broadcasterId}`,
                { headers: { Authorization: `Bearer ${accessToken}`, "Client-Id": process.env.TWITCH_CLIENT_ID! } },
            )
            if (!res.ok) return { isLive: false, title: null, category: null, viewerCount: null, startedAt: null }
            const data = await res.json()
            const stream = data.data?.[0]
            if (!stream) return { isLive: false, title: null, category: null, viewerCount: null, startedAt: null }
            return {
                isLive: true,
                title: stream.title ?? null,
                category: stream.game_name ?? null,
                viewerCount: stream.viewer_count ?? null,
                startedAt: stream.started_at ?? null,
            }
        } catch {
            return { isLive: false, title: null, category: null, viewerCount: null, startedAt: null }
        }
    }
}

export const streamInfoService: StreamInfoService = new StreamInfoService();
