import {SpotifyAccount} from "@/types/spotify";
import {linkedAccountsRepository} from "@/repositories";
import {PLATFORM_SPOTIFY} from "@/types/platform";
import { env } from "@/lib/env"

export class SpotifyService {
    async refreshSpotifyToken(account: SpotifyAccount): Promise<string | null> {
        if (!account.refreshToken) return null
        const credentials: string = Buffer.from(`${env.spotifyClientId}:${env.spotifyClientSecret}`).toString("base64")
        try {
            const res: Response = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${credentials}`,
                },
                body: new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: account.refreshToken,
                }),
            })
            const data = await res.json()
            if (!data.access_token)
                return null

            await linkedAccountsRepository.updateAccessToken(PLATFORM_SPOTIFY, account.providerAccountId, data.access_token)
            return data.access_token
        } catch {
            return null
        }
    }

    async spotifyFetch(
        account: SpotifyAccount,
        url: string,
        options: RequestInit = {},
    ): Promise<Response> {
        const doFetch = (token: string) =>
            fetch(url, {
                ...options,
                headers: { ...(options.headers as Record<string, string> ?? {}), Authorization: `Bearer ${token}` },
            })

        let res = await doFetch(account.accessToken)
        if (res.status === 401) {
            const newToken: string | null = await this.refreshSpotifyToken(account)
            if (newToken) res = await doFetch(newToken)
        }
        return res
    }
}

export const spotifyService = new SpotifyService()
