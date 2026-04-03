import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { apiError } from "@/lib/api-response"
import { spotifyFetch } from "@/lib/spotify"

import { linkedAccountsRepository } from "@/repositories"

type Action = "play" | "pause" | "skip" | "previous" | "volume"

const ACTION_MAP: Record<Exclude<Action, "volume">, { method: string; url: string }> = {
  play:     { method: "PUT",  url: "https://api.spotify.com/v1/me/player/play" },
  pause:    { method: "PUT",  url: "https://api.spotify.com/v1/me/player/pause" },
  skip:     { method: "POST", url: "https://api.spotify.com/v1/me/player/next" },
  previous: { method: "POST", url: "https://api.spotify.com/v1/me/player/previous" },
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.userId) return apiError(401, 'Unauthorized')

  const body = await req.json() as { action: Action; volume?: number }
  const { action, volume } = body

  const accounts = await linkedAccountsRepository.findByUserId(session.userId)
  const spotifyAccount = accounts.find(a => a.provider === "spotify")
  if (!spotifyAccount?.accessToken) return apiError(400, 'Spotify not connected')

  const account = {
    providerAccountId: spotifyAccount.providerAccountId,
    accessToken: spotifyAccount.accessToken,
    refreshToken: spotifyAccount.refreshToken ?? null,
  }

  try {
    let res: Response
    if (action === "volume") {
      const pct = Math.max(0, Math.min(100, Math.round(volume ?? 50)))
      res = await spotifyFetch(account, `https://api.spotify.com/v1/me/player/volume?volume_percent=${pct}`, { method: "PUT" })
    } else if (action in ACTION_MAP) {
      const { method, url } = ACTION_MAP[action]
      res = await spotifyFetch(account, url, { method })
    } else {
      return apiError(400, 'Invalid action')
    }

    // Spotify returns 204 on success, 403 if not Premium, 404 if no active device
    if (res.status === 204) return new Response(null, { status: 204 })
    if (res.status === 403) return apiError(403, 'Spotify Premium required')
    if (res.status === 404) return apiError(404, 'No active Spotify device')
    return apiError(res.status, 'Spotify error')
  } catch (err) {
    console.error('[spotify/controls] Unexpected error:', err)
    return apiError(500, 'Internal error')
  }
}
