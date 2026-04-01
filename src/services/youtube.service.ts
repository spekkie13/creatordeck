import { linkedAccountsRepository } from "@/repositories"
import {PLATFORM_YOUTUBE} from "@/types/platform";

class YoutubeService {
    async fetchYouTubeSubCount(
        accessToken: string,
        refreshToken: string | null,
        channelId: string,
    ): Promise<number | null> {
        const doFetch = (token: string) =>
            fetch("https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true", {
                headers: { Authorization: `Bearer ${token}` },
            })

        try {
            let res: Response = await doFetch(accessToken)

            if (res.status === 401 && refreshToken) {
                const newToken: string | null = await this.refreshYouTubeToken(refreshToken)
                if (!newToken) return null
                await linkedAccountsRepository.updateAccessToken(PLATFORM_YOUTUBE, channelId, newToken)
                res = await doFetch(newToken)
            }

            if (!res.ok) return null
            const data = await res.json()
            const raw = data.items?.[0]?.statistics?.subscriberCount
            return raw !== undefined ? parseInt(raw) : null
        } catch { return null }
    }

    async refreshYouTubeToken(refreshToken: string): Promise<string | null> {
        try {
            const res: Response = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: refreshToken,
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                }),
            })
            const data = await res.json()
            return data.access_token ?? null
        } catch { return null }
    }
}

export const youtubeService = new YoutubeService()
