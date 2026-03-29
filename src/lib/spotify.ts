import { linkedAccountsRepository } from "@/repositories"
import { env } from "@/lib/env"

export type SpotifyAccount = {
  providerAccountId: string
  accessToken: string
  refreshToken: string | null
}

async function refreshSpotifyToken(account: SpotifyAccount): Promise<string | null> {
  if (!account.refreshToken) return null
  const credentials = Buffer.from(`${env.spotifyClientId}:${env.spotifyClientSecret}`).toString("base64")
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
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
    if (!data.access_token) return null
    await linkedAccountsRepository.updateAccessToken("spotify", account.providerAccountId, data.access_token)
    return data.access_token
  } catch {
    return null
  }
}

export async function spotifyFetch(
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
    const newToken = await refreshSpotifyToken(account)
    if (newToken) res = await doFetch(newToken)
  }
  return res
}
