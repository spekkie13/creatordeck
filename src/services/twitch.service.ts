import { linkedAccountsRepository } from "@/repositories"
import { PLATFORM_TWITCH } from "@/types/platform"
import { env } from "@/lib/env"

class TwitchService {
    async fetchTwitchFollowerCount(
        broadcasterId: string,
        accessToken: string,
        refreshToken?: string | null,
    ): Promise<number | null> {
        const doFetch = (token: string) =>
            fetch(
                `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&first=1`,
                { headers: { Authorization: `Bearer ${token}`, "Client-Id": env.twitchClientId } },
            )

        try {
            let res: Response = await doFetch(accessToken)

            if (res.status === 401 && refreshToken) {
                const newToken: string | null = await this.refreshTwitchToken(refreshToken)
                if (!newToken) return null
                await linkedAccountsRepository.updateAccessToken(PLATFORM_TWITCH, broadcasterId, newToken)
                res = await doFetch(newToken)
            }

            if (!res.ok) return null
            const data = await res.json()
            return data.total ?? null
        } catch { return null }
    }

    async fetchTwitchSubCount(
        broadcasterId: string,
        accessToken: string,
        refreshToken?: string | null,
    ): Promise<number | null> {
        const doFetch = (token: string) =>
            fetch(
                `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}&first=1`,
                { headers: { Authorization: `Bearer ${token}`, "Client-Id": env.twitchClientId } },
            )

        try {
            let res: Response = await doFetch(accessToken)

            if (res.status === 401 && refreshToken) {
                const newToken: string | null = await this.refreshTwitchToken(refreshToken)
                if (!newToken) return null
                await linkedAccountsRepository.updateAccessToken(PLATFORM_TWITCH, broadcasterId, newToken)
                res = await doFetch(newToken)
            }

            if (!res.ok) return null
            const data = await res.json()
            return data.total ?? null
        } catch { return null }
    }

    // Revokes the user's Twitch grant. Revoking the access token invalidates the
    // whole authorization. Best-effort: revocation failures must not block the
    // caller (e.g. account deletion). Never log the token.
    async revokeAccess(userId: string): Promise<void> {
        const tokens = await linkedAccountsRepository.getDecryptedTokens(userId, PLATFORM_TWITCH)
        const token = tokens?.accessToken ?? tokens?.refreshToken
        if (!token) return
        try {
            await fetch("https://id.twitch.tv/oauth2/revoke", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ client_id: env.twitchClientId, token }),
            })
        } catch {
            // Best-effort; the caller proceeds regardless.
        }
    }

    async refreshTwitchToken(refreshToken: string): Promise<string | null> {
        try {
            const res: Response = await fetch("https://id.twitch.tv/oauth2/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: refreshToken,
                    client_id: env.twitchClientId,
                    client_secret: env.twitchClientSecret,
                }),
            })
            const data = await res.json()
            return data.access_token ?? null
        } catch { return null }
    }
}

export const twitchService = new TwitchService()